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

alter table public.finds
add column if not exists file_path text,
add column if not exists file_name text,
add column if not exists file_mime text,
add column if not exists file_size_bytes bigint;

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

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.friend_invites (
  token text primary key default gen_random_uuid()::text,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  from_name text not null,
  from_avatar_url text,
  status text not null check (status in ('pending', 'accepted', 'revoked', 'expired')) default 'pending',
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.sections enable row level security;
alter table public.finds enable row level security;
alter table public.find_comments enable row level security;
alter table public.find_likes enable row level security;
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_invites enable row level security;

-- Private single-user policies: only owner (auth.uid()) can read/write their rows.
drop policy if exists "sections_owner_all" on public.sections;
create policy "sections_owner_all"
on public.sections
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "finds_read_owner_or_friend" on public.finds;
create policy "finds_read_owner_or_friend"
on public.finds
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    visibility = 'all_friends'
    and exists (
      select 1
      from public.friendships f
      where f.user_id = auth.uid()
        and f.friend_id = public.finds.user_id
    )
  )
);

drop policy if exists "finds_write_owner_all" on public.finds;
create policy "finds_write_owner_all"
on public.finds
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "comments_owner_all" on public.find_comments;
create policy "comments_owner_all"
on public.find_comments
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "likes_owner_all" on public.find_likes;
create policy "likes_owner_all"
on public.find_likes
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "profiles_select_self_or_friends" on public.profiles;
create policy "profiles_select_self_or_friends"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.friendships f
    where f.user_id = auth.uid()
      and f.friend_id = public.profiles.id
  )
);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "friendships_owner_all" on public.friendships;
create policy "friendships_owner_all"
on public.friendships
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "friend_invites_owner_all" on public.friend_invites;
create policy "friend_invites_owner_all"
on public.friend_invites
for all
to authenticated
using (from_user_id = auth.uid())
with check (from_user_id = auth.uid());

create or replace function public.preview_friend_invite(p_token text)
returns table (
  from_user_id uuid,
  from_name text,
  from_avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select i.from_user_id, i.from_name, i.from_avatar_url
  from public.friend_invites i
  where i.token = p_token
    and i.status = 'pending'
    and (i.expires_at is null or i.expires_at > now());
end;
$$;

grant execute on function public.preview_friend_invite(text) to authenticated;

create or replace function public.accept_friend_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.friend_invites%rowtype;
  current_user uuid;
begin
  current_user := auth.uid();
  if current_user is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into invite_row
  from public.friend_invites i
  where i.token = p_token
    and i.status = 'pending'
    and (i.expires_at is null or i.expires_at > now())
  for update;

  if invite_row.token is null then
    raise exception 'Invite is invalid or expired';
  end if;

  if invite_row.from_user_id = current_user then
    raise exception 'Cannot accept your own invite';
  end if;

  update public.friend_invites
  set status = 'accepted',
      accepted_by = current_user,
      accepted_at = now()
  where token = invite_row.token;

  insert into public.friendships (user_id, friend_id)
  values (current_user, invite_row.from_user_id)
  on conflict do nothing;

  insert into public.friendships (user_id, friend_id)
  values (invite_row.from_user_id, current_user)
  on conflict do nothing;
end;
$$;

grant execute on function public.accept_friend_invite(text) to authenticated;

-- Storage:
-- 1) Create a private bucket named "find_images" in Storage UI (recommended), OR use:
--    insert into storage.buckets (id, name, public) values ('find_images', 'find_images', false);
-- 2) Add policies so only a user can access objects under "<user_id>/...".
-- Note: policies live on storage.objects.
drop policy if exists "find_images_read_own" on storage.objects;
create policy "find_images_read_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'find_images'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or (
      split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
      and exists (
        select 1
        from public.friendships f
        where f.user_id = auth.uid()
          and f.friend_id::text = split_part(name, '/', 1)
      )
    )
  )
);

drop policy if exists "find_images_write_own" on storage.objects;
create policy "find_images_write_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'find_images'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "find_images_update_own" on storage.objects;
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

drop policy if exists "find_images_delete_own" on storage.objects;
create policy "find_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'find_images'
  and split_part(name, '/', 1) = auth.uid()::text
);
