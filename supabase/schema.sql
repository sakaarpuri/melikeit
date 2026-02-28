-- Run this in the Supabase SQL Editor for your project.
-- Requires: extensions "pgcrypto" (for gen_random_uuid) enabled (usually default).

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  visibility text not null check (visibility in ('specific_friends', 'all_friends')),
  created_at timestamptz not null default now()
);

create table if not exists public.finds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  url text,
  image_path text,
  type text not null check (type in ('article', 'product', 'place', 'video', 'music', 'recipe', 'other')),
  visibility text not null check (visibility in ('specific_friends', 'all_friends')) default 'all_friends',
  section_id uuid references public.sections (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.finds
add column if not exists preview_path text;

create table if not exists public.find_comments (
  id uuid primary key default gen_random_uuid(),
  find_id uuid not null references public.finds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.find_likes (
  find_id uuid not null references public.finds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (find_id, user_id)
);

alter table public.sections enable row level security;
alter table public.finds enable row level security;
alter table public.find_comments enable row level security;
alter table public.find_likes enable row level security;

-- Private single-user policies: only owner (auth.uid()) can read/write their rows.
create policy "sections_owner_all"
on public.sections
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "finds_owner_all"
on public.finds
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "comments_owner_all"
on public.find_comments
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "likes_owner_all"
on public.find_likes
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Storage:
-- 1) Create a private bucket named "find_images" in Storage UI (recommended), OR use:
--    insert into storage.buckets (id, name, public) values ('find_images', 'find_images', false);
-- 2) Add policies so only a user can access objects under "<user_id>/...".
-- Note: policies live on storage.objects.
create policy "find_images_read_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'find_images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "find_images_write_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'find_images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "find_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'find_images'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'find_images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "find_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'find_images'
  and split_part(name, '/', 1) = auth.uid()::text
);
