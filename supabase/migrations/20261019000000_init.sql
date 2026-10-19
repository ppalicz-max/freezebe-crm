-- Freezbee CRM: initial schema
-- Target: Supabase project in an EU region (eu-central-1, Frankfurt).
--
-- Privacy model
--   * Every client, activity and order belongs to one rep (rep_id = auth.users.id).
--   * A rep can read and write only their own rows.
--   * An owner can read every rep's rows (Team view) but writes only their own.
--   * Only owners edit the product catalog, app settings and the team list.
--   * Only people on the team list (active) can sign up or use the data.

-------------------------------------------------------------------------------
-- Types
-------------------------------------------------------------------------------
create type public.member_role   as enum ('owner', 'rep');
create type public.client_type   as enum ('Hotel', 'Bar', 'Restaurant', 'Sport', 'Leisure', 'Children', 'Other');
create type public.client_stage  as enum ('lead', 'contacted', 'tasting', 'negotiating', 'customer', 'lost');
create type public.activity_type as enum ('call', 'visit', 'email', 'tasting', 'note');

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-------------------------------------------------------------------------------
-- Team members (owner-managed list; also the sign-up allowlist)
-------------------------------------------------------------------------------
create table public.team_members (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users (id) on delete set null, -- set automatically by email
  email      text not null check (email = lower(trim(email)) and email like '%@%'),
  full_name  text not null check (length(trim(full_name)) > 0),
  phone      text not null default '',
  position   text not null default '',
  segment    text not null default '',
  role       public.member_role not null default 'rep',
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index team_members_email_key on public.team_members (email);

-- Helpers used by the policies. SECURITY DEFINER so they can read team_members
-- without recursing into its own policies.
create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members
                 where user_id = (select auth.uid()) and active);
$$;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members
                 where user_id = (select auth.uid()) and active and role = 'owner');
$$;

-- Normalise the email and link the member to an existing account with that email.
create function public.link_member_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.email := lower(trim(new.email));
  if tg_op = 'INSERT' or new.email is distinct from old.email then
    select u.id into new.user_id from auth.users u where lower(u.email) = new.email;
  end if;
  return new;
end $$;

create trigger team_members_link before insert or update of email on public.team_members
  for each row execute function public.link_member_account();
create trigger team_members_touch before update on public.team_members
  for each row execute function public.touch_updated_at();

-- Never leave the CRM without an active owner.
create function public.keep_one_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.team_members where role = 'owner' and active) then
    raise exception 'At least one active owner is required' using errcode = '23514';
  end if;
  return null;
end $$;

create trigger team_members_keep_owner after update or delete on public.team_members
  for each statement execute function public.keep_one_owner();

-------------------------------------------------------------------------------
-- App-wide settings (single row) and product catalog
-------------------------------------------------------------------------------
create table public.app_settings (
  id         boolean primary key default true check (id),
  currency   text not null default 'Ft',
  vat_pct    numeric(5,2) not null default 27 check (vat_pct >= 0),
  updated_at timestamptz not null default now()
);
create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

create table public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  net_price  numeric(12,2) not null check (net_price >= 0),   -- per piece, without VAT
  commission numeric(12,2) not null check (commission >= 0),  -- per piece
  active     boolean not null default true,                   -- hidden products stay for old orders
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-------------------------------------------------------------------------------
-- Per-user settings
-------------------------------------------------------------------------------
create table public.user_settings (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  monthly_target numeric(12,2) not null default 150000 check (monthly_target >= 0),
  reorder_days   int not null default 21 check (reorder_days >= 1),
  lang           text check (lang in ('hu', 'en')),
  updated_at     timestamptz not null default now()
);
create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

-------------------------------------------------------------------------------
-- Clients, activities, orders, order lines (all owned by a rep)
-------------------------------------------------------------------------------
create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  rep_id          uuid not null default auth.uid() references auth.users (id) on delete restrict,
  name            text not null check (length(trim(name)) > 0),
  type            public.client_type  not null default 'Restaurant',
  stage           public.client_stage not null default 'lead',
  contact         text not null default '',
  phone           text not null default '',
  email           text not null default '',
  address         text not null default '',
  city            text not null default '',
  website         text not null default '',
  google_maps_url text not null default '',
  place_id        text,                                -- Google Places id, from "Find business"
  next_follow_up  date,
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, rep_id),                                 -- target for the composite FKs below
  unique (rep_id, place_id)                            -- a rep can't add the same business twice
);
create index clients_rep_idx on public.clients (rep_id, name);
create index clients_place_idx on public.clients (place_id) where place_id is not null;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null,
  rep_id      uuid not null default auth.uid(),
  type        public.activity_type not null,
  happened_on date not null default current_date,
  text        text not null default '',
  created_at  timestamptz not null default now(),
  -- the activity must belong to the same rep as its client
  foreign key (client_id, rep_id) references public.clients (id, rep_id) on delete cascade
);
create index activities_client_idx on public.activities (client_id, happened_on desc);

create table public.orders (
  id         uuid primary key default gen_random_uuid(),
  rep_id     uuid not null default auth.uid(),
  client_id  uuid not null,
  order_date date not null default current_date,
  note       text not null default '',
  paid       boolean not null default false,  -- commission paid out to the rep
  paid_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, rep_id) references public.clients (id, rep_id) on delete cascade
);
create index orders_rep_date_idx on public.orders (rep_id, order_date);
create index orders_client_idx   on public.orders (client_id);

create function public.orders_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.paid is distinct from old.paid then
    new.paid_at := case when new.paid then now() end;
  end if;
  return new;
end $$;
create trigger orders_touch before update on public.orders
  for each row execute function public.orders_before_update();

-- Price and commission are copied from the catalog when the line is created,
-- so later catalog changes never alter past commission.
create table public.order_lines (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  product_id      uuid references public.products (id) on delete set null,
  product_name    text not null,
  qty             int not null check (qty > 0 and qty <= 99999),
  unit_price      numeric(12,2) not null check (unit_price >= 0),
  unit_commission numeric(12,2) not null check (unit_commission >= 0),
  line_net        numeric(14,2) generated always as (qty * unit_price) stored,
  line_commission numeric(14,2) generated always as (qty * unit_commission) stored,
  unique (order_id, product_id)
);

-------------------------------------------------------------------------------
-- Account hooks
-------------------------------------------------------------------------------
-- When someone signs up: link them to their team_members row and create settings.
create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.team_members set user_id = new.id
   where email = lower(new.email) and user_id is null;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Supabase Auth "Before User Created" hook (enable in Dashboard > Authentication > Hooks):
-- only emails on the active team list can create an account.
create function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.team_members
             where email = lower(event -> 'user' ->> 'email') and active) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'This email is not on the Freezbee team list. Ask the CRM owner to add you.'));
end $$;

revoke execute on function public.hook_before_user_created(jsonb) from public;
revoke execute on function public.hook_before_user_created(jsonb) from anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
  end if;
end $$;

-------------------------------------------------------------------------------
-- Save an order and its lines in one transaction
-------------------------------------------------------------------------------
-- p_lines: [{"product_id": "<uuid>", "qty": 12}, ...]
-- p_order_id: an existing order of yours to edit, or a new id chosen by the app
-- (so it can show the order before the server answers), or null.
-- New lines take the current catalog price/commission. When editing, products
-- already on the order keep the price/commission they were saved with.
-- Also moves the client to the "customer" stage, like the original app.
create function public.save_order(
  p_client_id  uuid,
  p_order_date date,
  p_lines      jsonb,
  p_note       text default '',
  p_order_id   uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_lines jsonb;
  v_owner uuid;
  v_new   boolean;
begin
  if v_uid is null or not public.is_member() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id and rep_id = v_uid) then
    raise exception 'Client not found' using errcode = 'P0002';
  end if;
  select rep_id into v_owner from public.orders where id = p_order_id;
  v_new := v_owner is null;
  if not v_new and v_owner <> v_uid then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' then
    raise exception 'p_lines must be an array' using errcode = '22023';
  end if;

  -- Price the requested lines before touching anything.
  with req as (
    select (l ->> 'product_id')::uuid as product_id, sum((l ->> 'qty')::int) as qty
      from jsonb_array_elements(p_lines) l
     where coalesce((l ->> 'qty')::int, 0) > 0
     group by 1
  ), old as (
    select product_id, product_name, unit_price, unit_commission
      from public.order_lines where order_id = p_order_id   -- empty for a new order
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'product_id',      r.product_id,
           'qty',             r.qty,
           'product_name',    coalesce(o.product_name,    p.name),
           'unit_price',      coalesce(o.unit_price,      p.net_price),
           'unit_commission', coalesce(o.unit_commission, p.commission))), '[]'::jsonb)
    into v_lines
    from req r
    left join old o             on o.product_id = r.product_id
    left join public.products p on p.id = r.product_id and p.active;

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'An order needs at least one product' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(v_lines) x where x ->> 'unit_price' is null) then
    raise exception 'Unknown or hidden product' using errcode = '22023';
  end if;

  if v_new then
    insert into public.orders (id, rep_id, client_id, order_date, note)
    values (coalesce(p_order_id, gen_random_uuid()), v_uid, p_client_id, p_order_date, coalesce(trim(p_note), ''))
    returning id into v_id;
  else
    update public.orders
       set client_id = p_client_id, order_date = p_order_date, note = coalesce(trim(p_note), '')
     where id = p_order_id
    returning id into v_id;
    delete from public.order_lines where order_id = v_id;
  end if;

  insert into public.order_lines (order_id, product_id, product_name, qty, unit_price, unit_commission)
  select v_id, x.product_id, x.product_name, x.qty, x.unit_price, x.unit_commission
    from jsonb_to_recordset(v_lines)
         as x(product_id uuid, product_name text, qty int, unit_price numeric, unit_commission numeric);

  update public.clients set stage = 'customer'
   where id = p_client_id and stage <> 'customer';

  return v_id;
end $$;

-------------------------------------------------------------------------------
-- "Find business" duplicate check: does the current user ('mine') or another rep
-- ('other') already have a client with this Google place id? Never says who.
-------------------------------------------------------------------------------
create function public.place_taken(p_place_id text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when not public.is_member() then null
    when exists (select 1 from public.clients
                 where place_id = p_place_id and rep_id = (select auth.uid())) then 'mine'
    when exists (select 1 from public.clients where place_id = p_place_id) then 'other'
  end;
$$;

-------------------------------------------------------------------------------
-- Team view: one row per linked team member for a month.
-- SECURITY INVOKER, so RLS applies: an owner gets everyone, a rep only themselves.
-------------------------------------------------------------------------------
create function public.team_month_summary(p_month date)
returns table (
  member_id uuid, rep_id uuid, full_name text, active boolean,
  clients bigint, pieces bigint, net numeric, commission numeric, unpaid_commission numeric
)
language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select date_trunc('month', p_month)::date as start_d,
           (date_trunc('month', p_month) + interval '1 month')::date as end_d
  )
  select tm.id, tm.user_id, tm.full_name, tm.active,
         (select count(*) from public.clients c where c.rep_id = tm.user_id),
         coalesce(sum(l.qty), 0)::bigint,
         coalesce(sum(l.line_net), 0),
         coalesce(sum(l.line_commission), 0),
         coalesce(sum(l.line_commission) filter (where not o.paid), 0)
    from public.team_members tm
    cross join bounds b
    left join public.orders o
           on o.rep_id = tm.user_id and o.order_date >= b.start_d and o.order_date < b.end_d
    left join public.order_lines l on l.order_id = o.id
   where tm.user_id is not null
   group by tm.id, tm.user_id, tm.full_name, tm.active
  having tm.active or count(o.id) > 0;
$$;

-------------------------------------------------------------------------------
-- Row-level security
-------------------------------------------------------------------------------
alter table public.team_members  enable row level security;
alter table public.app_settings  enable row level security;
alter table public.products      enable row level security;
alter table public.user_settings enable row level security;
alter table public.clients       enable row level security;
alter table public.activities    enable row level security;
alter table public.orders        enable row level security;
alter table public.order_lines   enable row level security;

-- team_members: everyone sees their own row; owners see and manage all.
create policy tm_select on public.team_members for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_owner()));
create policy tm_insert on public.team_members for insert to authenticated
  with check ((select public.is_owner()));
create policy tm_update on public.team_members for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
create policy tm_delete on public.team_members for delete to authenticated
  using ((select public.is_owner()));

-- app_settings and products: members read, owners write. Products are hidden, not deleted.
create policy as_select on public.app_settings for select to authenticated
  using ((select public.is_member()));
create policy as_update on public.app_settings for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create policy pr_select on public.products for select to authenticated
  using ((select public.is_member()));
create policy pr_insert on public.products for insert to authenticated
  with check ((select public.is_owner()));
create policy pr_update on public.products for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

-- user_settings: own row only.
create policy us_all on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- clients: own rows; owners can also read everyone's.
create policy cl_select on public.clients for select to authenticated
  using ((rep_id = (select auth.uid()) and (select public.is_member())) or (select public.is_owner()));
create policy cl_insert on public.clients for insert to authenticated
  with check (rep_id = (select auth.uid()) and (select public.is_member()));
create policy cl_update on public.clients for update to authenticated
  using (rep_id = (select auth.uid()) and (select public.is_member()))
  with check (rep_id = (select auth.uid()));
create policy cl_delete on public.clients for delete to authenticated
  using (rep_id = (select auth.uid()) and (select public.is_member()));

-- activities: same pattern (added and deleted, never edited).
create policy ac_select on public.activities for select to authenticated
  using ((rep_id = (select auth.uid()) and (select public.is_member())) or (select public.is_owner()));
create policy ac_insert on public.activities for insert to authenticated
  with check (rep_id = (select auth.uid()) and (select public.is_member()));
create policy ac_delete on public.activities for delete to authenticated
  using (rep_id = (select auth.uid()) and (select public.is_member()));

-- orders: created/edited through save_order(); reps can toggle paid and delete their own.
create policy or_select on public.orders for select to authenticated
  using ((rep_id = (select auth.uid()) and (select public.is_member())) or (select public.is_owner()));
create policy or_update on public.orders for update to authenticated
  using (rep_id = (select auth.uid()) and (select public.is_member()))
  with check (rep_id = (select auth.uid()));
create policy or_delete on public.orders for delete to authenticated
  using (rep_id = (select auth.uid()) and (select public.is_member()));

-- order_lines: readable when the order is; written only by save_order().
create policy ol_select on public.order_lines for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

-------------------------------------------------------------------------------
-- Grants (RLS does the row filtering; these narrow what each role can touch)
-------------------------------------------------------------------------------
-- Explicit grants, so the app also works on projects where new tables are not
-- exposed to the Data API automatically. The revokes below then narrow them.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.team_members, public.app_settings, public.products, public.user_settings,
  public.clients, public.activities, public.orders, public.order_lines
  to authenticated;
grant execute on function public.is_member(), public.is_owner() to authenticated;

revoke all on all tables in schema public from anon;
revoke all on function public.save_order(uuid, date, jsonb, text, uuid) from public, anon;
revoke all on function public.team_month_summary(date) from public, anon;
revoke all on function public.place_taken(text) from public, anon;
grant execute on function public.place_taken(text) to authenticated;
grant execute on function public.save_order(uuid, date, jsonb, text, uuid) to authenticated;
grant execute on function public.team_month_summary(date) to authenticated;

-- user_id is set by the email-link triggers only.
revoke insert, update on public.team_members from authenticated;
grant insert (email, full_name, phone, position, segment, role, active) on public.team_members to authenticated;
grant update (email, full_name, phone, position, segment, role, active) on public.team_members to authenticated;

-- Orders are created and edited through save_order(); directly, only the paid flag can change.
revoke insert, update on public.orders from authenticated;
grant update (paid) on public.orders to authenticated;
revoke insert, update, delete on public.order_lines from authenticated;
