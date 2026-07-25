import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { tmdbImageUrl } from "@/lib/media/providers/tmdb";
import type { MediaItem, MediaRatings } from "@/lib/media/types";

interface TmdbDetails {
  id?: number;
  imdb_id?: string | null;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  runtime?: number | null;
  episode_run_time?: number[];
  genres?: { name?: string }[];
  external_ids?: { imdb_id?: string | null };
}

interface TmdbFindResponse {
  movie_results?: TmdbDetails[];
  tv_results?: TmdbDetails[];
}

interface TmdbSearchResponse {
  results?: TmdbDetails[];
}

interface OmdbRating {
  Source?: string;
  Value?: string;
}

interface OmdbResponse {
  Response?: string;
  Error?: string;
  Plot?: string;
  Runtime?: string;
  Genre?: string;
  imdbRating?: string;
  Ratings?: OmdbRating[];
}

function parseRuntime(value: string | undefined): number | undefined {
  const match = value?.match(/\d+/);
  return match ? finiteNumber(match[0]) : undefined;
}

function parseRatedValue(value: unknown): number | undefined {
  return finiteNumber(value);
}

function applyTmdbDetails(item: MediaItem, details: TmdbDetails): MediaItem {
  const tmdbId = finiteNumber(details.id);
  const imdb =
    nonEmptyString(details.imdb_id) ??
    nonEmptyString(details.external_ids?.imdb_id) ??
    item.externalIds.imdb;
  const rating = finiteNumber(details.vote_average);
  const runtime =
    finiteNumber(details.runtime) ??
    finiteNumber(details.episode_run_time?.[0]) ??
    item.runtimeMinutes;

  return {
    ...item,
    title: nonEmptyString(details.title ?? details.name) ?? item.title,
    synopsis:
      nonEmptyString(details.overview) &&
      item.synopsis.startsWith("Synopsis")
        ? details.overview!.trim()
        : item.synopsis,
    posterUrl:
      tmdbImageUrl(details.poster_path, "w500") ?? item.posterUrl,
    backdropUrl:
      tmdbImageUrl(details.backdrop_path, "w1280") ?? item.backdropUrl,
    runtimeMinutes: runtime,
    genres:
      details.genres?.flatMap((genre) => (genre.name ? [genre.name] : [])) ??
      item.genres,
    ratings:
      rating === undefined
        ? item.ratings
        : { ...item.ratings, tmdb: rating },
    externalIds: {
      ...item.externalIds,
      imdb,
      tmdb: tmdbId ?? item.externalIds.tmdb,
    },
  };
}

async function findTmdbId(item: MediaItem, token: string): Promise<number | undefined> {
  if (item.externalIds.tmdb) return item.externalIds.tmdb;

  if (item.externalIds.imdb) {
    const findUrl = new URL(
      `https://api.themoviedb.org/3/find/${item.externalIds.imdb}`,
    );
    findUrl.searchParams.set("external_source", "imdb_id");
    const found = await fetchJson<TmdbFindResponse>(findUrl, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 86_400 },
    });
    const match =
      item.mediaType === "show"
        ? found.tv_results?.[0]
        : found.movie_results?.[0];
    const id = finiteNumber(match?.id);
    if (id) return id;
  }

  const type = item.mediaType === "show" ? "tv" : "movie";
  const searchUrl = new URL(
    `https://api.themoviedb.org/3/search/${type}`,
  );
  searchUrl.searchParams.set("query", item.title);
  if (item.year) {
    searchUrl.searchParams.set(
      type === "tv" ? "first_air_date_year" : "primary_release_year",
      String(item.year),
    );
  }
  const found = await fetchJson<TmdbSearchResponse>(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 86_400 },
  });
  return finiteNumber(found.results?.[0]?.id);
}

async function enrichFromTmdb(item: MediaItem): Promise<MediaItem> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token || item.mediaType === "anime") return item;

  const tmdbId = await findTmdbId(item, token);
  if (!tmdbId) return item;

  const type = item.mediaType === "show" ? "tv" : "movie";
  const url = new URL(`https://api.themoviedb.org/3/${type}/${tmdbId}`);
  url.searchParams.set("append_to_response", "external_ids");
  url.searchParams.set("language", "en-US");

  const details = await fetchJson<TmdbDetails>(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 86_400 },
  });
  return applyTmdbDetails(item, details);
}

function omdbRatings(payload: OmdbResponse): Partial<MediaRatings> {
  const ratings: Partial<MediaRatings> = {};
  const imdb = parseRatedValue(payload.imdbRating);
  if (imdb !== undefined) ratings.imdb = imdb;

  for (const rating of payload.Ratings ?? []) {
    const value = parseRatedValue(rating.Value);
    if (value === undefined) continue;
    if (rating.Source === "Rotten Tomatoes") ratings.rottenTomatoes = value;
    if (rating.Source === "Metacritic") ratings.metacritic = value;
    if (rating.Source === "Internet Movie Database") ratings.imdb = value;
  }
  return ratings;
}

async function enrichFromOmdb(item: MediaItem): Promise<MediaItem> {
  const apiKey = process.env.OMDB_API_KEY;
  const imdb = item.externalIds.imdb;
  if (!apiKey || !imdb) return item;

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("i", imdb);
  url.searchParams.set("plot", "full");
  const payload = await fetchJson<OmdbResponse>(url, {
    next: { revalidate: 86_400 },
  });
  if (payload.Response === "False") return item;

  const plot = nonEmptyString(payload.Plot);
  const genres = nonEmptyString(payload.Genre)
    ?.split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);

  return {
    ...item,
    synopsis:
      plot && item.synopsis.startsWith("Synopsis") ? plot : item.synopsis,
    runtimeMinutes: parseRuntime(payload.Runtime) ?? item.runtimeMinutes,
    genres: genres?.length ? genres : item.genres,
    ratings: { ...item.ratings, ...omdbRatings(payload) },
  };
}

/**
 * Enrichment is best-effort. The chart result is still useful when an optional
 * metadata service is unavailable or rate-limited.
 */
export async function enrichMedia(item: MediaItem): Promise<MediaItem> {
  let enriched = item;
  try {
    enriched = await enrichFromTmdb(enriched);
  } catch {
    // Keep the upstream chart item.
  }
  try {
    enriched = await enrichFromOmdb(enriched);
  } catch {
    // Keep TMDb/chart metadata if OMDb is unavailable.
  }
  return enriched;
}
