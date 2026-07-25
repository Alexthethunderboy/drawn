import { getSource } from "@/lib/media/config";
import { missingEnvironment, MediaSourceError } from "@/lib/media/errors";
import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { randomPage } from "@/lib/media/random";
import type {
  MediaCategory,
  MediaItem,
  SourceId,
} from "@/lib/media/types";

type TmdbSource = Extract<SourceId, "tmdb-popular" | "tmdb-top-rated">;

interface TmdbListItem {
  id?: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
}

interface TmdbListResponse {
  results?: TmdbListItem[];
}

const TMDB_IMAGE_ROOT = "https://image.tmdb.org/t/p";

function imageUrl(
  path: string | null | undefined,
  size: "w500" | "w1280",
): string | undefined {
  return path ? `${TMDB_IMAGE_ROOT}/${size}${path}` : undefined;
}

function getYear(item: TmdbListItem): number | undefined {
  const date = item.release_date ?? item.first_air_date;
  if (!date) return undefined;
  return finiteNumber(date.slice(0, 4));
}

function buildTmdbUrl(
  category: MediaCategory,
  source: TmdbSource,
): URL {
  const type = category === "tv" ? "tv" : "movie";
  const page = randomPage(5);

  if (category !== "docs") {
    const list = source === "tmdb-popular" ? "popular" : "top_rated";
    const url = new URL(`https://api.themoviedb.org/3/${type}/${list}`);
    url.searchParams.set("language", "en-US");
    url.searchParams.set("page", String(page));
    return url;
  }

  const url = new URL("https://api.themoviedb.org/3/discover/movie");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("include_video", "false");
  url.searchParams.set("with_genres", "99");
  url.searchParams.set("page", String(page));
  url.searchParams.set(
    "sort_by",
    source === "tmdb-popular" ? "popularity.desc" : "vote_average.desc",
  );
  if (source === "tmdb-top-rated") {
    url.searchParams.set("vote_count.gte", "100");
  }
  return url;
}

export async function fetchTmdbCandidates(
  category: MediaCategory,
  source: TmdbSource,
): Promise<MediaItem[]> {
  const accessToken = process.env.TMDB_ACCESS_TOKEN;
  if (!accessToken) throw missingEnvironment("TMDB_ACCESS_TOKEN");

  const definition = getSource(source);
  const payload = await fetchJson<TmdbListResponse>(
    buildTmdbUrl(category, source),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 3600 },
    },
  );

  if (!Array.isArray(payload.results)) {
    throw new MediaSourceError("TMDb returned an unexpected response shape.");
  }

  const mediaType = category === "tv" ? "show" : "movie";

  return payload.results.flatMap((item): MediaItem[] => {
    const id = finiteNumber(item.id);
    const title = nonEmptyString(item.title ?? item.name);
    if (!id || !title) return [];

    const key = `tmdb:${id}`;
    const tmdbRating = finiteNumber(item.vote_average);
    return [
      {
        id: key,
        mediaKey: key,
        title,
        originalTitle: nonEmptyString(
          item.original_title ?? item.original_name,
        ),
        year: getYear(item),
        mediaType,
        category,
        synopsis:
          nonEmptyString(item.overview) ??
          "Synopsis unavailable from this chart.",
        posterUrl: imageUrl(item.poster_path, "w500"),
        backdropUrl: imageUrl(item.backdrop_path, "w1280"),
        externalUrl: `https://www.themoviedb.org/${mediaType === "show" ? "tv" : "movie"}/${id}`,
        genres: [],
        ratings: tmdbRating === undefined ? {} : { tmdb: tmdbRating },
        externalIds: { tmdb: id },
        source,
        sourceLabel: definition.shortLabel,
        sourceKind: definition.kind as MediaItem["sourceKind"],
        sourceNote:
          source === "tmdb-popular"
            ? "From TMDb's current popularity chart."
            : "From TMDb's top-rated chart with a vote-count floor.",
      },
    ];
  });
}

export { imageUrl as tmdbImageUrl };
