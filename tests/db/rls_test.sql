-- Privacy and commission checks for the Freezbee schema.
-- Runs in one transaction and rolls back, so it leaves no data behind.
--   plain Postgres:  tests/db/run.sh
--   Supabase:        psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/db/rls_test.sql
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
begin;

create schema tests;
grant usage on schema tests to authenticated, anon;
-- Runs a statement and fails the test if it does NOT raise an error.
create function tests.throws(stmt text, why text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    return;
  end;
  raise exception 'expected an error: %', why;
end $$;
grant execute on function tests.throws(text, text) to authenticated, anon;
create function tests.login(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function tests.login(uuid) to authenticated, anon;

-- Team: owner, two reps, one person who isn't on the list.
insert into public.team_members (email, full_name, role) values
  ('owner@test.hu', 'Owner', 'owner'), (' Anna@Test.hu ', 'Anna', 'rep'), ('bela@test.hu', 'Béla', 'rep');
-- Other owners (e.g. from the seed) step aside so the last-owner check can be tested.
update public.team_members set active = false where role = 'owner' and email <> 'owner@test.hu';

do $$ begin
  assert public.hook_before_user_created('{"user":{"email":"ANNA@test.hu"}}') = '{}'::jsonb, 'hook allows a team email';
  assert public.hook_before_user_created('{"user":{"email":"x@y.hu"}}') ? 'error', 'hook blocks other emails';
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@test.hu'),
  ('00000000-0000-0000-0000-00000000000b', 'bela@test.hu'),
  ('00000000-0000-0000-0000-00000000000c', 'owner@test.hu'),
  ('00000000-0000-0000-0000-00000000000d', 'stranger@test.hu');

do $$ begin
  assert (select count(*) from public.team_members where user_id is not null) = 3, 'accounts link to team members by email';
  assert exists (select 1 from public.user_settings where user_id = '00000000-0000-0000-0000-00000000000a'), 'settings row created';
end $$;

-- Products used below
delete from public.products;
insert into public.products (id, name, net_price, commission, sort_order, active) values
  ('10000000-0000-0000-0000-000000000001', 'Margherita', 1600, 160, 1, true),
  ('10000000-0000-0000-0000-000000000002', 'Sonkás', 1890, 189, 2, true),
  ('10000000-0000-0000-0000-000000000003', 'Régi', 1000, 100, 3, false);

------------------------------------------------------------------ Anna (rep)
set local role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000a');

insert into public.clients (id, name, type) values ('20000000-0000-0000-0000-00000000000a', 'Hotel Anna', 'Hotel');
select tests.throws($$insert into public.clients (name, rep_id) values ('Spoof', '00000000-0000-0000-0000-00000000000b')$$, 'rep_id spoofing');

-- New order with an id chosen by the app
select public.save_order('20000000-0000-0000-0000-00000000000a', '2026-10-05',
  '[{"product_id":"10000000-0000-0000-0000-000000000001","qty":10},{"product_id":"10000000-0000-0000-0000-000000000002","qty":10}]',
  'first', '30000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select stage from public.clients where id = '20000000-0000-0000-0000-00000000000a') = 'customer', 'order makes the client a customer';
  assert (select sum(line_commission) from public.order_lines) = 3490, 'commission 10*160 + 10*189';
end $$;
select tests.throws($$select public.save_order('20000000-0000-0000-0000-00000000000a', '2026-10-05',
  '[{"product_id":"10000000-0000-0000-0000-000000000003","qty":1}]')$$, 'hidden product on a new order');
select tests.throws($$select public.save_order('20000000-0000-0000-0000-00000000000a', '2026-10-05', '[]')$$, 'empty order');

update public.orders set paid = true;
do $$ begin assert (select paid_at is not null from public.orders), 'paid_at set'; end $$;
select tests.throws($$update public.orders set note = 'x'$$, 'only paid may be updated directly');
select tests.throws($$insert into public.orders (client_id) values ('20000000-0000-0000-0000-00000000000a')$$, 'orders only via save_order');
select tests.throws($$insert into public.order_lines (order_id, product_name, qty, unit_price, unit_commission)
  values ('30000000-0000-0000-0000-00000000000a', 'x', 1, 0, 9999)$$, 'lines only via save_order');
update public.products set commission = 999;
update public.team_members set role = 'owner';
do $$ begin
  assert (select max(commission) from public.products) < 999, 'reps cannot edit products';
  assert (select count(*) from public.team_members) = 1, 'reps see only their own team row';
  assert (select role from public.team_members) = 'rep', 'reps cannot promote themselves';
  assert (select count(*) from public.team_month_summary('2026-10-01')) = 1, 'rep summary only has themselves';
end $$;
reset role;

------------------------------------------------------------------ Béla (rep)
set local role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from public.clients) = 0, 'B sees no A clients';
  assert (select count(*) from public.orders) = 0, 'B sees no A orders';
  assert (select count(*) from public.order_lines) = 0, 'B sees no A order lines';
end $$;
insert into public.clients (name) values ('Bar Béla');
select tests.throws($$select public.save_order('20000000-0000-0000-0000-00000000000a', '2026-10-05',
  '[{"product_id":"10000000-0000-0000-0000-000000000001","qty":1}]')$$, 'order on another rep''s client');
select tests.throws($$select public.save_order((select id from public.clients limit 1), '2026-10-05',
  '[{"product_id":"10000000-0000-0000-0000-000000000001","qty":1}]', '', '30000000-0000-0000-0000-00000000000a')$$, 'editing another rep''s order');
select tests.throws($$insert into public.activities (client_id, type) values ('20000000-0000-0000-0000-00000000000a', 'call')$$, 'activity on another rep''s client');
update public.clients set name = 'hacked' where id = '20000000-0000-0000-0000-00000000000a';
update public.orders set paid = false where id = '30000000-0000-0000-0000-00000000000a';
delete from public.clients where id = '20000000-0000-0000-0000-00000000000a';
reset role;
do $$ begin
  assert (select name from public.clients where id = '20000000-0000-0000-0000-00000000000a') = 'Hotel Anna', 'B could not change A client';
  assert (select paid from public.orders where id = '30000000-0000-0000-0000-00000000000a'), 'B could not change A order';
end $$;

------------------------------------------------------------------ Owner
set local role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000c');
update public.products set net_price = net_price + 1000, commission = commission + 100;
do $$ begin
  assert (select count(*) from public.clients) = 2, 'owner reads every rep''s clients';
  assert (select count(*) from public.team_month_summary('2026-10-20')) = 3, 'owner summary has all linked members';
  assert (select commission from public.team_month_summary('2026-10-01') where full_name = 'Anna') = 3490, 'summary commission';
  assert (select unpaid_commission from public.team_month_summary('2026-10-01') where full_name = 'Anna') = 0, 'summary unpaid';
end $$;
select tests.throws($$insert into public.clients (name, rep_id) values ('x', '00000000-0000-0000-0000-00000000000a')$$, 'owner cannot write as a rep');
update public.clients set name = 'owner edit' where rep_id <> '00000000-0000-0000-0000-00000000000c';
select tests.throws($$update public.team_members set role = 'rep' where email = 'owner@test.hu'$$, 'last owner');
select tests.throws($$insert into public.team_members (email, full_name) values ('anna@test.hu', 'Dup')$$, 'duplicate email');
select tests.throws($$update public.team_members set user_id = '00000000-0000-0000-0000-00000000000d' where email = 'bela@test.hu'$$, 'user_id is set by triggers only');
reset role;
do $$ begin
  assert not exists (select 1 from public.clients where name = 'owner edit'), 'owner cannot edit reps'' clients';
  assert (select max(unit_price) from public.order_lines) = 1890, 'catalog change does not touch saved lines';
end $$;

------------------------------------------------------------------ Anna edits her order after the price change
set local role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000a');
select public.save_order('20000000-0000-0000-0000-00000000000a', '2026-10-06',
  '[{"product_id":"10000000-0000-0000-0000-000000000001","qty":5},{"product_id":"10000000-0000-0000-0000-000000000002","qty":0}]',
  'edited', '30000000-0000-0000-0000-00000000000a');
reset role;
-- add a product that was not on the order: it takes the new price
set local role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select unit_price from public.order_lines where product_name = 'Margherita') = 1600, 'kept the saved price';
  assert (select count(*) from public.order_lines) = 1, 'removed line deleted';
  assert (select note from public.orders) = 'edited', 'note updated';
end $$;
select public.save_order('20000000-0000-0000-0000-00000000000a', '2026-10-06',
  '[{"product_id":"10000000-0000-0000-0000-000000000001","qty":5},{"product_id":"10000000-0000-0000-0000-000000000002","qty":1}]',
  'edited', '30000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select unit_price from public.order_lines where product_name = 'Sonkás') = 2890, 'new line takes the current price';
end $$;
-- deleting the client deletes its orders and activities
insert into public.activities (client_id, type) values ('20000000-0000-0000-0000-00000000000a', 'visit');
delete from public.clients where id = '20000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.orders) = 0 and (select count(*) from public.activities) = 0, 'cascade delete';
end $$;
reset role;

------------------------------------------------------------------ stranger, removed member, anon
set local role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000d');
do $$ begin
  assert not public.is_member(), 'stranger is not a member';
  assert (select count(*) from public.products) = 0, 'stranger sees no products';
end $$;
select tests.throws($$insert into public.clients (name) values ('x')$$, 'stranger cannot add clients');
reset role;

update public.team_members set active = false where email = 'bela@test.hu';
set local role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000b');
do $$ begin assert (select count(*) from public.clients) = 0, 'removed member sees nothing'; end $$;
reset role;

set local role anon;
select tests.throws($$select count(*) from public.products$$, 'anon has no table access');
reset role;

-- changing a member's email relinks the account
update public.team_members set email = 'stranger@test.hu', active = true where email = 'bela@test.hu';
do $$ begin
  assert (select user_id from public.team_members where full_name = 'Béla') = '00000000-0000-0000-0000-00000000000d', 'email change relinks';
end $$;

\echo 'All database checks passed.'
rollback;
