# DRAWN

A server-randomized culture picker built with Next.js App Router,
React, Tailwind CSS, a lightweight username/PIN profile system, and a
deliberately broad set of ranking providers.

**Drawn from the best.** DRAWN chooses one excellent film, series, anime,
documentary, album, song, or book from credible global rankings so the user can
spend less time choosing and more time enjoying the result.

## Chart routing

| Chart | Movies | TV | Anime | Docs | What it actually means |
| --- | :---: | :---: | :---: | :---: | --- |
| All charts | ✓ | ✓ | ✓ | ✓ | Equal-cap blend of every configured chart |
| Trakt Popular | ✓ | ✓ | — | ✓ | Trakt popularity (rating percentage + rating volume) |
| Trakt Trending | ✓ | ✓ | — | ✓ | Most watched over the last 24 hours |
| Rotten Tomatoes 80%+ | ✓ | — | — | ✓ | Trakt `rt_meters=80-100` filter |
| IMDb Top 1000 | ✓ | — | — | — | Paginated dataset through the selected RapidAPI provider |
| IMDb 8.0+ | ✓ | ✓ | — | ✓ | Trakt `imdb_ratings=8.0-10.0` and 25k+ vote filter |
| Metacritic 80+ | ✓ | — | — | ✓ | Trakt `metascores=80-100` filter |
| TMDb Popular | ✓ | ✓ | — | ✓ | Native TMDb list/discover ordering |
| TMDb Top Rated | ✓ | ✓ | — | ✓ | Native TMDb list/discover ordering with a vote floor |
| MyAnimeList Top | — | — | ✓ | — | Jikan `/v4/top/anime` |
| MyAnimeList Popular | — | — | ✓ | — | Jikan top anime with `filter=bypopularity` |
| Letterboxd Most Fans 250 | ✓ | — | — | — | Complete official list snapshot |
| Rotten Tomatoes Anime 100 | — | — | ✓ | — | Exact editorial list with Tomatometer scores |
| IMDb Animated 35 | — | — | ✓ | — | Exact supplied IMDb list |
| Rotten Tomatoes Docs 100 | — | — | — | ✓ | Exact editorial ranking |
| Letterboxd Documentary 250 | — | — | — | ✓ | Complete official list snapshot |

The UI intentionally does **not** call the Trakt RT filter “Certified Fresh.”
Certified Fresh is a Rotten Tomatoes designation with criteria beyond a simple
Tomatometer threshold. Likewise, IMDb 8.0+ is a live filtered pool, while the
RapidAPI source is the separate Top 1000 dataset selected for this project.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The browser-verified local lists need no key, so Movies, Anime, Docs, Music,
and Books work immediately. Add any combination of the following providers;
“All charts” skips unconfigured or temporarily failed sources and uses all
successful ones:

- `TRAKT_CLIENT_ID`: the client ID from a Trakt API application.
- `TMDB_ACCESS_TOKEN`: the TMDb API Read Access Token (Bearer token).
- `RAPIDAPI_KEY`: enables the IMDb Top 1000 provider after that API is
  subscribed to in RapidAPI.
- `RAPIDAPI_IMDB_HOST`: the selected provider host.
- `RAPIDAPI_IMDB_TOP1000_PATH`: the paginated path template
  (`/list/{page}`).
- `RAPIDAPI_IMDB_PAGE_COUNT`: the provider's page count. The default `100`
  assumes ten records per page and can be corrected if the subscribed response
  uses a different page size.
- `OMDB_API_KEY`: optional. Enriches the one selected title with actual IMDb,
  Rotten Tomatoes, and Metacritic badge values.

All provider secrets stay server-side.

## Username/PIN profiles

DRAWN uses a small Cloudflare D1 database rather than Supabase. A visitor can
create a username with a 4–8 digit PIN, sign in on another device, and access
the same saved movies, shows, anime, documentaries, and tracks. PINs are salted
and PBKDF2-hashed before storage; sessions use an HTTP-only, same-site cookie.
Five incorrect PIN attempts lock sign-in for 15 minutes.

There is intentionally no email collection or recovery flow. This lightweight
profile system is appropriate for a media watchlist, not sensitive personal
data. Usernames and lost PINs cannot currently be recovered.

The D1 schema lives in `db/schema.ts`, with generated migrations in `drizzle/`.
Runtime initialization also creates missing tables for local development.
Existing browser-local saves from `pickfilm.watchlist.v1` are migrated into the
first profile used in that browser.

## Server flow

`GET /api/roll?category=movies&source=all`:

1. validates the category/source compatibility matrix;
2. reads exact local rankings and queries relevant live upstreams server-side
   with timeouts and response-shape checks;
3. caps blended provider pools equally and deduplicates by external IDs/title;
4. chooses a uniform random index using rejection sampling over Web Crypto;
5. enriches only the chosen item through TMDb and OMDb when configured,
   including poster/backdrop artwork, synopsis, runtime, genres, ratings,
   certification, release date, creators, cast, and trailer links.

List fetches use provider-appropriate revalidation while every roll response
uses `no-store`, keeping the chart data efficient and the selection fresh.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

`npm run dev` uses Vinext so the local D1 binding is available.
GitHub Actions runs the same checks for pull requests and pushes to `main`.

## Deployment

The repository is configured for OpenAI Sites through
`.openai/hosting.json`. Sites supplies the Cloudflare D1 binding named `DB`;
provider credentials from `.env.example` must be configured as hosted runtime
values and must not be committed. The production artifact is created with:

```bash
npm run build:sites
```

## Provider references

- [Trakt API filters](https://docs.trakt.tv/docs/filters)
- [Trakt popular movies](https://docs.trakt.tv/reference/getmoviespopular)
- [TMDb movie discover](https://developer.themoviedb.org/reference/discover-movie)
- [TMDb TV discover](https://developer.themoviedb.org/reference/discover-tv)
- [Jikan v4](https://docs.api.jikan.moe/)
- [IMDb Top 1000 search](https://www.imdb.com/search/title/?groups=top_1000&sort=user_rating%2Cdesc)
- [Selected IMDb Top 1000 RapidAPI](https://rapidapi.com/robotfa-robotfa-default/api/imdb-top-1000-movies-series)
- [OMDb API](https://www.omdbapi.com/)

This product uses the TMDB API but is not endorsed or certified by TMDB.

## Music

The dedicated `/music` page rolls songs and albums from:

| Chart | Credential | Meaning |
| --- | --- | --- |
| Rolling Stone 500 Albums | None | Complete browser-verified all-time ranking stored locally |
| ListenBrainz week | None | Sitewide top recordings for the current week |
| ListenBrainz month | None | Sitewide top recordings for the current month |
| ListenBrainz all time | None | Sitewide all-time recording chart |

“All charts” blends the stored album canon with three worldwide,
credential-free ListenBrainz periods before deduplication. If ListenBrainz is
unavailable, the Rolling Stone catalog keeps the roll functional. The no-key
iTunes Search API enriches only the selected song or album with artwork and an
Apple Music link; track previews are added when available.

When `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are configured, the
server also matches each selected chart track against Spotify and adds its
canonical album metadata and “Open in Spotify” link. `SPOTIFY_MARKET` and
`ITUNES_STOREFRONT` default to `US` only for catalog availability; neither
setting influences the worldwide chart ranking. Spotify is enrichment rather
than a chart source because the current Development Mode Web API does not
expose a public global chart or the contents of Spotify-owned playlists.

Tracks and albums use the same profile-backed Saved menu as movies and shows.

## Books

The `/books` page uses two exact, browser-verified local sources:

| List | Local entries |
| --- | ---: |
| Goodreads Best Selling Books of All Time | 100 |
| The Greatest Books, supplied page 2 | 25 (ranks 26–50) |

Open Library and Google Books are optional, credential-free cover enrichment
for the one selected book. The UI cycles through available cover candidates
and uses a designed DRAWN edition when upstream artwork is unavailable.

## Browser-verified catalogs

`data/curated-lists.json` contains ranks and essential factual metadata from
the supplied Letterboxd, Rotten Tomatoes, IMDb, Goodreads, The Greatest Books,
and Rolling Stone pages. Tests enforce exact contiguous ordering for all eight
catalogs, including ranks 1–500 for Rolling Stone and both Letterboxd Top 250
lists. Editorial prose is not copied into the catalog.

Music references:

- [ListenBrainz sitewide recording statistics](https://listenbrainz.readthedocs.io/en/latest/users/api/statistics.html)
- [iTunes Search API](https://performance-partners.apple.com/search-api)
- [Spotify Client Credentials flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow)
- [Spotify Search endpoint](https://developer.spotify.com/documentation/web-api/reference/search)
- [Rolling Stone 500 Greatest Albums](https://www.rollingstone.com/music/music-lists/best-albums-of-all-time-1062063/)
- [Goodreads Best Selling Books of All Time](https://www.goodreads.com/list/show/33934.Best_Selling_Books_of_All_Time)
- [The Greatest Books](https://thegreatestbooks.org/page/2)
