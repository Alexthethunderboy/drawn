create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_key text not null,
  title text not null,
  media_type text not null check (media_type in ('movie', 'show', 'anime', 'track')),
  category text not null check (category in ('movies', 'tv', 'anime', 'docs', 'music')),
  source text not null,
  source_label text not null,
  year integer,
  synopsis text not null default '',
  poster_url text,
  external_url text,
  external_ids jsonb not null default '{}'::jsonb,
  ratings jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, media_key)
);

create index if not exists watchlist_user_id_idx
  on public.watchlist using btree (user_id);

alter table public.watchlist enable row level security;

grant select, insert, update, delete
  on table public.watchlist
  to authenticated;

drop policy if exists "Users can read their own watchlist" on public.watchlist;
create policy "Users can read their own watchlist"
  on public.watchlist
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add to their own watchlist" on public.watchlist;
create policy "Users can add to their own watchlist"
  on public.watchlist
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own watchlist" on public.watchlist;
create policy "Users can update their own watchlist"
  on public.watchlist
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove from their own watchlist" on public.watchlist;
create policy "Users can remove from their own watchlist"
  on public.watchlist
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
