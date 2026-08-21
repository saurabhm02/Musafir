insert into storage.buckets (id, name, public)
values ('poi-photos', 'poi-photos', true)
on conflict (id) do nothing;

create policy "poi photos are publicly readable" on storage.objects
  for select using (bucket_id = 'poi-photos');
create policy "authenticated users can upload poi photos" on storage.objects
  for insert with check (bucket_id = 'poi-photos' and auth.role() = 'authenticated');

-- Seed POIs so the Delhi -> Triund route isn't empty on first run.
insert into public.pois (name, description, category, location, price_range) values
  ('Murthal Dhaba Row', 'The legendary paratha stretch on NH44 - a dozen dhabas side by side, open through the night.', 'food', st_setsrid(st_makepoint(77.0906, 29.0575), 4326)::geography, 'budget'),
  ('Kangra Valley Viewpoint', 'Wide open view over the Kangra valley with the Dhauladhar range in the background.', 'viewpoint', st_setsrid(st_makepoint(76.2673, 32.1023), 4326)::geography, 'free'),
  ('Triund Top', 'The trek summit - a grassy ridge looking straight at the snow line of the Dhauladhar range.', 'trek', st_setsrid(st_makepoint(76.4177, 32.2432), 4326)::geography, 'free');
