-- Team for the browser tests: the seed owner becomes owner@test.hu, plus two reps.
update public.team_members set email = 'owner@test.hu', full_name = 'Olga Owner' where email = 'owner@example.com';
insert into public.team_members (email, full_name, role, position, segment) values
  ('anna@test.hu', 'Kovács Anna', 'rep', 'Értékesítő', 'Szállodák, Budapest'),
  ('bela@test.hu', 'Nagy Béla', 'rep', 'Értékesítő', 'Balaton');
