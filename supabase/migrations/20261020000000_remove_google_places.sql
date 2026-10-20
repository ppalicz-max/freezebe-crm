-- Google Places ("Find business") was removed from the app.
-- Drops what only it used: the place id, the Maps link and the duplicate check.
-- The website column stays (it is a normal field on the client form).
drop function if exists public.place_taken(text);
drop index if exists public.clients_place_idx;
alter table public.clients drop constraint if exists clients_rep_id_place_id_key;
alter table public.clients drop column if exists place_id;
alter table public.clients drop column if exists google_maps_url;
