import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { tmdbImageUrl } from "@/lib/media/providers/tmdb";
import type { MediaItem, MediaRatings } from "@/lib/media/types";

interface TmdbDetails {
  id?: number;
  imdb_id?: string | null;
  title?: string;
  name?: string;
  overview?: string;
  tagline?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  last_episode_to_air?: { runtime?: number | null };
  genres?: { name?: string }[];
  created_by?: { name?: string }[];
  spoken_languages?: { english_name?: string; name?: string }[];
  credits?: {
    cast?: { name?: string; order?: number }[];
    crew?: { name?: string; job?: string; department?: string }[];
  };
  videos?: {
    results?: {
      key?: string;
      site?: string;
      type?: string;
      official?: boolean;
    }[];
  };
  release_dates?: {
    results?: {
      iso_3166_1?: string;
      release_dates?: { certification?: string; type?: number }[];
    }[];
  };
  content_ratings?: {
    results?: { iso_3166_1?: string; rating?: string }[];
  };
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
  Title?: string;
  Poster?: string;
  Rated?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Actors?: string;
  Language?: string;
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

function splitList(value: string | undefined): string[] | undefined {
  const items = value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "N/A");
  return items?.length ? items : undefined;
}

function isPlaceholderSynopsis(value: string): boolean {
  return /^synopsis\b/i.test(value.trim());
}

function tmdbCertification(details: TmdbDetails): string | undefined {
  const movieRelease =
    details.release_dates?.results
      ?.find((result) => result.iso_3166_1 === "US")
      ?.release_dates?.find(
        (release) => release.certification && release.type === 3,
      ) ??
    details.release_dates?.results
      ?.find((result) => result.iso_3166_1 === "US")
      ?.release_dates?.find((release) => release.certification);
  if (movieRelease?.certification) return movieRelease.certification;

  return nonEmptyString(
    details.content_ratings?.results?.find(
      (result) => result.iso_3166_1 === "US",
    )?.rating,
  );
}

function tmdbTrailer(details: TmdbDetails): string | undefined {
  const videos = details.videos?.results ?? [];
  const trailer =
    videos.find(
      (video) =>
        video.site === "YouTube" &&
        video.type === "Trailer" &&
        video.official,
    ) ??
    videos.find(
      (video) => video.site === "YouTube" && video.type === "Trailer",
    ) ??
    videos.find((video) => video.site === "YouTube");
  return trailer?.key
    ? `https://www.youtube.com/watch?v=${trailer.key}`
    : undefined;
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
    finiteNumber(details.last_episode_to_air?.runtime) ??
    item.runtimeMinutes;
  const creators =
    details.created_by
      ?.flatMap((person) => (person.name ? [person.name] : []))
      .slice(0, 3) ??
    details.credits?.crew
      ?.filter((person) => person.job === "Director")
      .flatMap((person) => (person.name ? [person.name] : []))
      .slice(0, 3);
  const cast = details.credits?.cast
    ?.slice()
    .sort((left, right) => (left.order ?? 999) - (right.order ?? 999))
    .flatMap((person) => (person.name ? [person.name] : []))
    .slice(0, 4);
  const language = nonEmptyString(
    details.spoken_languages?.[0]?.english_name ??
      details.spoken_languages?.[0]?.name,
  );

  return {
    ...item,
    title: nonEmptyString(details.title ?? details.name) ?? item.title,
    synopsis:
      nonEmptyString(details.overview) &&
      isPlaceholderSynopsis(item.synopsis)
        ? details.overview!.trim()
        : item.synopsis,
    tagline: nonEmptyString(details.tagline) ?? item.tagline,
    releaseDate:
      nonEmptyString(details.release_date ?? details.first_air_date) ??
      item.releaseDate,
    posterUrl:
      tmdbImageUrl(details.poster_path, "w500") ?? item.posterUrl,
    backdropUrl:
      tmdbImageUrl(details.backdrop_path, "w1280") ?? item.backdropUrl,
    runtimeMinutes: runtime,
    seasonCount:
      finiteNumber(details.number_of_seasons) ?? item.seasonCount,
    episodeCount:
      finiteNumber(details.number_of_episodes) ?? item.episodeCount,
    contentRating: tmdbCertification(details) ?? item.contentRating,
    language: language ?? item.language,
    genres:
      details.genres?.flatMap((genre) => (genre.name ? [genre.name] : [])) ??
      item.genres,
    creators: creators?.length ? creators : item.creators,
    cast: cast?.length ? cast : item.cast,
    trailerUrl: item.trailerUrl ?? tmdbTrailer(details),
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
  url.searchParams.set(
    "append_to_response",
    "external_ids,credits,videos,release_dates,content_ratings",
  );
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
  const poster =
    nonEmptyString(payload.Poster) && payload.Poster !== "N/A"
      ? payload.Poster
      : undefined;

  return {
    ...item,
    title: nonEmptyString(payload.Title) ?? item.title,
    synopsis:
      plot && isPlaceholderSynopsis(item.synopsis) ? plot : item.synopsis,
    posterUrl: item.posterUrl ?? poster,
    releaseDate:
      nonEmptyString(payload.Released) && payload.Released !== "N/A"
        ? payload.Released
        : item.releaseDate,
    runtimeMinutes: parseRuntime(payload.Runtime) ?? item.runtimeMinutes,
    contentRating:
      nonEmptyString(payload.Rated) && payload.Rated !== "N/A"
        ? payload.Rated
        : item.contentRating,
    language:
      splitList(payload.Language)?.[0] ?? item.language,
    genres: genres?.length ? genres : item.genres,
    creators: splitList(payload.Director) ?? item.creators,
    cast: splitList(payload.Actors)?.slice(0, 4) ?? item.cast,
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
