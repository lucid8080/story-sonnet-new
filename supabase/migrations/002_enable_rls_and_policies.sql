-- Enable Row Level Security and add policies

alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.episodes enable row level security;
alter table public.uploads enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Stories & episodes: public and authenticated can read free, published items.
-- Subscribed users (subscription_status = 'active') can read premium, published items.
-- Admins (role = 'admin') can full CRUD.

drop policy if exists "Public read free stories" on public.stories;
drop policy if exists "Public read free episodes" on public.episodes;
drop policy if exists "Subscribers read premium stories" on public.stories;
drop policy if exists "Subscribers read premium episodes" on public.episodes;
drop policy if exists "Admins manage stories" on public.stories;
drop policy if exists "Admins manage episodes" on public.episodes;
drop policy if exists "Admins manage uploads" on public.uploads;
drop policy if exists "Users view uploads" on public.uploads;

create policy "Public read free stories"
  on public.stories
  for select
  using (is_published = true and is_premium = false);

create policy "Public read free episodes"
  on public.episodes
  for select
  using (is_published = true and is_premium = false);

create policy "Subscribers read premium stories"
  on public.stories
  for select
  using (
    is_published = true
    and (
      is_premium = false
      or (
        is_premium = true
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
          and p.subscription_status = 'active'
        )
      )
    )
  );

create policy "Subscribers read premium episodes"
  on public.episodes
  for select
  using (
    is_published = true
    and (
      is_premium = false
      or (
        is_premium = true
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
          and p.subscription_status = 'active'
        )
      )
    )
  );

create policy "Admins manage stories"
  on public.stories
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
  );

create policy "Admins manage episodes"
  on public.episodes
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
  );

create policy "Admins manage uploads"
  on public.uploads
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'admin'
    )
  );

create policy "Users view uploads"
  on public.uploads
  for select
  using (true);

