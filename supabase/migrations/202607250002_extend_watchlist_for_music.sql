-- Apply this after the original watchlist migration in an existing project.
alter table public.watchlist
  drop constraint if exists watchlist_media_type_check;

alter table public.watchlist
  add constraint watchlist_media_type_check
  check (media_type in ('movie', 'show', 'anime', 'track'));

alter table public.watchlist
  drop constraint if exists watchlist_category_check;

alter table public.watchlist
  add constraint watchlist_category_check
  check (category in ('movies', 'tv', 'anime', 'docs', 'music'));
