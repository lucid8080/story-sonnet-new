-- Core tables for Story Sonnet: profiles, stories, episodes, uploads

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user',
  subscription_status text not null default 'free',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stories (
  id bigserial primary key,
  slug text not null unique,
  series_title text not null,
  title text not null,
  age_group text,
  duration_label text,
  summary text,
  cover_url text,
  accent text,
  is_published boolean not null default false,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.episodes (
  id bigserial primary key,
  story_id bigint not null references public.stories(id) on delete cascade,
  episode_number integer not null,
  label text,
  title text not null,
  duration text,
  audio_url text,
  description text,
  is_published boolean not null default false,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists episodes_story_number_idx
  on public.episodes (story_id, episode_number);

create table if not exists public.uploads (
  id bigserial primary key,
  file_name text not null,
  file_type text not null,
  file_url text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

