-- Starting data. Replace the owner email before running.

insert into public.app_settings (currency, vat_pct) values ('Ft', 27)
on conflict (id) do nothing;

insert into public.products (name, net_price, commission, sort_order) values
  ('Margherita',          1600, 160, 1),
  ('Sonkás',              1890, 189, 2),
  ('Szalámis-Ventricina', 1890, 189, 3),
  ('4 sajtos',            2100, 210, 4),
  ('Zöldséges-vegán',     1750, 175, 5);

-- The first owner. Signing in with this email links the account automatically.
insert into public.team_members (email, full_name, role)
values ('owner@example.com', 'Owner', 'owner');
