create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  destination text,
  day_count int not null default 1,
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  poi_id uuid not null references public.pois(id) on delete cascade,
  day_number int not null,
  time_label text,
  note text,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create index trip_stops_trip_day_idx on public.trip_stops (trip_id, day_number, sort_order);

create table public.poi_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  poi_id uuid not null references public.pois(id) on delete cascade,
  status text not null,
  created_at timestamptz default now(),
  unique (user_id, poi_id)
);
