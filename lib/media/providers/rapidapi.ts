import { getSource } from "@/lib/media/config";
import { missingEnvironment, MediaSourceError } from "@/lib/media/errors";
import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { randomPage } from "@/lib/media/random";
import type { MediaItem } from "@/lib/media/types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * RapidAPI IMDb proxies do not share a response contract. Support the common
 * wrappers while keeping the provider host and endpoint configurable.
 */
export function findRapidApiItems(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) return [];

  const commonKeys = [
    "data",
    "results",
    "movies",
    "items",
    "list",
    "titles",
    "records",
  ];
  for (const key of commonKeys) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value)) {
      const nested = findRapidApiItems(value);
      if (nested.length > 0) return nested;
    }
  }

  // Some dataframe-backed APIs serialize rows as {"0": {...}, "1": {...}}.
  const indexedRows = Object.entries(payload)
    .filter(([key, value]) => /^\d+$/.test(key) && isRecord(value))
    .map(([, value]) => value as UnknownRecord);
  if (indexedRows.length > 0) return indexedRows;

  return [];
}

function firstString(
  item: UnknownRecord,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = nonEmptyString(item[key]);
    if (value) return value;
  }
  return undefined;
}

function firstNumber(
  item: UnknownRecord,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const value = finiteNumber(item[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function parseNestedRating(item: UnknownRecord): number | undefined {
  const direct = firstNumber(item, [
    "rating",
    "imdbRating",
    "imdb_rating",
    "IMDB_Rating",
    "score",
  ]);
  if (direct !== undefined) return direct;

  const ratings = item.ratings;
  if (isRecord(ratings)) {
    return firstNumber(ratings, ["imdb", "rating", "value"]);
  }
  return undefined;
}

function parseImdbId(item: UnknownRecord): string | undefined {
  const direct = firstString(item, [
    "imdb_id",
    "imdbId",
    "id",
    "const",
    "tconst",
  ]);
  const match = direct?.match(/tt\d{5,}/);
  if (match) return match[0];

  const url = firstString(item, ["url", "imdb_url", "link"]);
  return url?.match(/tt\d{5,}/)?.[0];
}

function parseGenres(item: UnknownRecord): string[] {
  const value = firstString(item, ["genres", "genre", "Genre"]);
  return (
    value
      ?.split(",")
      .map((genre) => genre.trim())
      .filter(Boolean) ?? []
  );
}

export function parseRapidApiTop1000(payload: unknown): MediaItem[] {
  const source = getSource("imdb-top-1000");

  return findRapidApiItems(payload).flatMap((item): MediaItem[] => {
    const title = firstString(item, [
      "title",
      "primaryTitle",
      "primary_title",
      "name",
      "Series_Title",
      "series_title",
    ]);
    if (!title) return [];

    const imdb = parseImdbId(item);
    const year = firstNumber(item, [
      "year",
      "releaseYear",
      "release_year",
      "Released_Year",
      "released_year",
    ]);
    const rank = firstNumber(item, ["rank", "position", "ranking"]);
    const key = imdb
      ? `imdb:${imdb}`
      : `imdb-top-1000:${title}:${year ?? ""}`.toLowerCase();
    const rating = parseNestedRating(item);

    return [
      {
        id: key,
        mediaKey: key,
        title,
        year,
        mediaType: "movie",
        category: "movies",
        synopsis:
          firstString(item, [
            "plot",
            "overview",
            "Overview",
            "description",
            "synopsis",
          ]) ??
          "Synopsis will be added from TMDb or OMDb when configured.",
        posterUrl: firstString(item, [
          "image",
          "image_url",
          "poster",
          "poster_url",
          "primaryImage",
          "Poster_Link",
          "poster_link",
        ]),
        externalUrl: imdb
          ? `https://www.imdb.com/title/${imdb}/`
          : undefined,
        runtimeMinutes: firstNumber(item, ["runtime", "Runtime"]),
        genres: parseGenres(item),
        ratings: {
          ...(rating === undefined ? {} : { imdb: rating }),
          ...(firstNumber(item, ["Meta_score", "meta_score"]) === undefined
            ? {}
            : {
                metacritic: firstNumber(item, [
                  "Meta_score",
                  "meta_score",
                ]),
              }),
        },
        externalIds: { imdb },
        source: "imdb-top-1000",
        sourceLabel: source.shortLabel,
        sourceKind: "exact",
        sourceNote:
          "From the IMDb Top 1000 dataset exposed by the configured RapidAPI provider.",
        rank,
      },
    ];
  });
}

export async function fetchImdbTop1000Candidates(): Promise<MediaItem[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw missingEnvironment("RAPIDAPI_KEY");

  const host =
    process.env.RAPIDAPI_IMDB_HOST ||
    "imdb-top-1000-movies-series.p.rapidapi.com";
  const pathTemplate =
    process.env.RAPIDAPI_IMDB_TOP1000_PATH || "/list/{page}";
  const configuredPageCount =
    finiteNumber(process.env.RAPIDAPI_IMDB_PAGE_COUNT) ?? 100;
  const pageCount = Math.max(
    1,
    Math.min(1000, Math.floor(configuredPageCount)),
  );
  const page = randomPage(pageCount);
  const path = pathTemplate.replace("{page}", String(page));
  const url = new URL(path, `https://${host}`);
  const payload = await fetchJson<unknown>(url, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": host,
    },
    next: { revalidate: 21_600 },
  });

  const candidates = parseRapidApiTop1000(payload);
  if (candidates.length === 0) {
    throw new MediaSourceError(
      "The IMDb RapidAPI provider returned a shape this adapter does not recognize. Update its host/path or parser.",
    );
  }
  return candidates;
}
