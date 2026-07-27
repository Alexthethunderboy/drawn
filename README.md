# Pickfilm

A server-randomized media and music picker built with Next.js App Router,
React, Tailwind CSS, Supabase, and a deliberately broad set of ranking
providers.

## Chart routing

| Chart | Movies | TV | Anime | Docs | What it actually means |
| --- | :---: | :---: | :---: | :---: | --- |
| All charts | ✓ | ✓ | ✓ | ✓ | Equal-cap blend of every configured chart |
| Trakt Popular | ✓ | ✓ | — | ✓ | Trakt popularity (rating percentage + rating volume) |
| Trakt Trending | ✓ | ✓ | — | ✓ | Most watched over the last 24 hours |
| Rotten Tomatoes 80%+ | ✓ | — | — | ✓ | Trakt `rt_meters=80-100` filter |
| IMDb Top 250 · exact | ✓ | — | — | — | Literal chart through a configurable RapidAPI proxy |
| IMDb 8.0+ | ✓ | ✓ | — | ✓ | Trakt `imdb_ratings=8.0-10.0` and 25k+ vote filter |
| Metacritic 80+ | ✓ | — | — | ✓ | Trakt `metascores=80-100` filter |
| TMDb Popular | ✓ | ✓ | — | ✓ | Native TMDb list/discover ordering |
| TMDb Top Rated | ✓ | ✓ | — | ✓ | Native TMDb list/discover ordering with a vote floor |
| MyAnimeList Top | — | — | ✓ | — | Jikan `/v4/top/anime` |
| MyAnimeList Popular | — | — | ✓ | — | Jikan top anime with `filter=bypopularity` |

The UI intentionally does **not** call the Trakt RT filter “Certified Fresh.”
Certified Fresh is a Rotten Tomatoes designation with criteria beyond a simple
Tomatometer threshold. Likewise, IMDb 8.0+ is a live filtered pool, not the
literal Top 250; the RapidAPI chart is the exact-list mode.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Jikan needs no key, so Anime works immediately. Add any combination of the
following providers; “All charts” skips unconfigured or temporarily failed
sources and uses all successful ones:

- `TRAKT_CLIENT_ID`: the client ID from a Trakt API application.
- `TMDB_ACCESS_TOKEN`: the TMDb API Read Access Token (Bearer token).
- `RAPIDAPI_KEY`: enables the exact IMDb Top 250 provider.
- `RAPIDAPI_IMDB_HOST` and `RAPIDAPI_IMDB_TOP250_PATH`: override these when
  your chosen IMDb RapidAPI provider uses a different host or endpoint.
- `OMDB_API_KEY`: optional. Enriches the one selected title with actual IMDb,
  Rotten Tomatoes, and Metacritic badge values.

All secrets stay server-side. Only the two `NEXT_PUBLIC_SUPABASE_*` values are
exposed to the browser, as intended by Supabase.

## Supabase watchlist

1. Create a Supabase project.
2. Run
   [`supabase/migrations/202607250001_create_watchlist.sql`](supabase/migrations/202607250001_create_watchlist.sql)
   in the SQL editor or through the Supabase CLI.
3. Set:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ```

4. Add `http://localhost:3000/auth/callback` (and the production equivalent)
   to the Auth redirect URL allow-list.

The migration enables RLS and defines owner-only select, insert, update, and
delete policies. Saving uses an upsert on `(user_id, media_key)`, so the same
title is not duplicated.

## Server flow

`GET /api/roll?category=movies&source=all`:

1. validates the category/source compatibility matrix;
2. queries each relevant upstream server-side with timeouts and response-shape
   checks;
3. caps blended provider pools equally and deduplicates by external IDs/title;
4. chooses a uniform random index using rejection sampling over Web Crypto;
5. enriches only the chosen item through TMDb and OMDb when configured.

List fetches use provider-appropriate revalidation while every roll response
uses `no-store`, keeping the chart data efficient and the selection fresh.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

## Provider references

- [Trakt API filters](https://docs.trakt.tv/docs/filters)
- [Trakt popular movies](https://docs.trakt.tv/reference/getmoviespopular)
- [TMDb movie discover](https://developer.themoviedb.org/reference/discover-movie)
- [TMDb TV discover](https://developer.themoviedb.org/reference/discover-tv)
- [Jikan v4](https://docs.api.jikan.moe/)
- [IMDb Top 250](https://www.imdb.com/chart/top/)
- [OMDb API](https://www.omdbapi.com/)
- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

This product uses the TMDB API but is not endorsed or certified by TMDB.

## Music

The dedicated `/music` page rolls songs from:

| Chart | Credential | Meaning |
| --- | --- | --- |
| ListenBrainz week | None | Sitewide top recordings for the current week |
| ListenBrainz month | None | Sitewide top recordings for the current month |
| ListenBrainz all time | None | Sitewide all-time recording chart |
| Last.fm Global Top Tracks | `LASTFM_API_KEY` | Current Last.fm global chart |
| Apple Music Top Songs | `APPLE_MUSIC_DEVELOPER_TOKEN` | Most-played songs for `APPLE_MUSIC_STOREFRONT` |

“All charts” gives every successful source the same candidate cap before
deduplication. The no-key iTunes Search API enriches only the selected song
with artwork, duration, Apple Music links, and a stream-only preview; it is
never treated as a chart.

When `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are configured, the
server also matches each selected chart track against Spotify and adds its
canonical album metadata and “Open in Spotify” link. `SPOTIFY_MARKET` defaults
to `US`. Spotify is enrichment rather than a chart source because the current
Development Mode Web API does not expose a public global chart or the contents
of Spotify-owned playlists.

For existing Supabase projects, apply
[`supabase/migrations/202607250002_extend_watchlist_for_music.sql`](supabase/migrations/202607250002_extend_watchlist_for_music.sql)
so saved tracks are accepted by the watchlist constraints.

Music references:

- [ListenBrainz sitewide recording statistics](https://listenbrainz.readthedocs.io/en/latest/users/api/statistics.html)
- [Last.fm global top tracks](https://www.last.fm/api/show/chart.getTopTracks)
- [Apple Music catalog charts](https://developer.apple.com/documentation/applemusicapi/charts)
- [iTunes Search API](https://performance-partners.apple.com/search-api)
- [Spotify Client Credentials flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow)
- [Spotify Search endpoint](https://developer.spotify.com/documentation/web-api/reference/search)
