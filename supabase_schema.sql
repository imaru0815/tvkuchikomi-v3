create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  program_id text not null,
  episode_id text not null,
  rating int not null check (rating between 1 and 5),
  tag text not null,
  spoiler boolean default false,
  comment text not null,
  likes int default 0,
  created_at timestamptz default now()
);
alter table reviews enable row level security;
create policy "reviews select all" on reviews for select using (true);
create policy "reviews insert all" on reviews for insert with check (true);
create policy "reviews update all" on reviews for update using (true);
