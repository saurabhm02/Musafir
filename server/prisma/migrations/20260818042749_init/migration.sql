create extension if not exists postgis;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  location geography(point, 4326),
  home_city text,
  preferences jsonb default '{}',
  subscription_tier text default 'free',
  total_distance_km numeric default 0,
  total_trips int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  origin text not null,
  destination text not null,
  origin_coord geography(point, 4326),
  destination_coord geography(point, 4326),
  polyline geography(linestring, 4326),
  distance_km numeric,
  duration_minutes numeric,
  elevation_gain_m numeric,
  created_by uuid references public.users(id),
  is_public boolean default true,
  search_count int default 0,
  created_at timestamptz default now()
);

create table public.route_segments (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references public.routes(id) on delete cascade,
  segment_index int not null,
  polyline geography(linestring, 4326) not null,
  start_coord geography(point, 4326),
  end_coord geography(point, 4326),
  distance_km numeric,
  elevation_gain_m numeric,
  created_at timestamptz default now()
);

create table public.pois (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  subcategory text,
  location geography(point, 4326) not null,
  address text,
  tags text[] default '{}',
  price_range text,
  best_time text,
  avg_rating numeric default 0,
  total_ratings int default 0,
  total_photos int default 0,
  created_by uuid references public.users(id),
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.poi_route (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid references public.pois(id) on delete cascade,
  route_id uuid references public.routes(id) on delete cascade,
  segment_id uuid references public.route_segments(id) on delete cascade,
  detour_distance_m numeric,
  is_on_route boolean default true
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  poi_id uuid references public.pois(id) on delete cascade,
  trip_id uuid,
  photo_url text not null,
  thumbnail_url text,
  caption text,
  visibility text default 'private' check (visibility in ('public', 'private')),
  ai_tags text[],
  ai_description text,
  taken_at timestamptz,
  location geography(point, 4326),
  created_at timestamptz default now()
);

-- Spatial indexes: Smart Route Overlap and "POIs near me" both search by
-- distance, GIST indexes are what make those queries fast instead of full scans.
create index routes_polyline_gix on public.routes using gist (polyline);
create index route_segments_polyline_gix on public.route_segments using gist (polyline);
create index route_segments_start_gix on public.route_segments using gist (start_coord);
create index pois_location_gix on public.pois using gist (location);
create index memories_location_gix on public.memories using gist (location);
create index poi_route_segment_idx on public.poi_route (segment_id);
create index poi_route_route_idx on public.poi_route (route_id);

-- Input: a new row in auth.users (Supabase creates this on signup)
-- Output: a matching row in public.users so the app always has a profile to read
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.routes enable row level security;
alter table public.route_segments enable row level security;
alter table public.pois enable row level security;
alter table public.poi_route enable row level security;
alter table public.memories enable row level security;

create policy "users are publicly readable" on public.users for select using (true);
create policy "users can update own row" on public.users for update using (auth.uid() = id);

create policy "routes are publicly readable" on public.routes for select using (true);
create policy "authenticated users can create routes" on public.routes for insert with check (auth.uid() = created_by);
create policy "owners can update own routes" on public.routes for update using (auth.uid() = created_by);

create policy "segments are publicly readable" on public.route_segments for select using (true);
create policy "authenticated users can create segments" on public.route_segments for insert with check (auth.role() = 'authenticated');

create policy "pois are publicly readable" on public.pois for select using (true);
create policy "authenticated users can create pois" on public.pois for insert with check (auth.uid() = created_by);
create policy "owners can update own pois" on public.pois for update using (auth.uid() = created_by);

create policy "poi_route is publicly readable" on public.poi_route for select using (true);
create policy "authenticated users can link poi to route" on public.poi_route for insert with check (auth.role() = 'authenticated');

-- Memories: public ones are visible to everyone, private ones only to their owner.
create policy "public memories are readable by all, private only by owner"
  on public.memories for select
  using (visibility = 'public' or auth.uid() = user_id);
create policy "users can upload own memories" on public.memories for insert with check (auth.uid() = user_id);
create policy "owners can update own memories" on public.memories for update using (auth.uid() = user_id);
create policy "owners can delete own memories" on public.memories for delete using (auth.uid() = user_id);
