import { getSource } from "@/lib/media/config";
import { missingEnvironment, MediaSourceError } from "@/lib/media/errors";
import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
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

  const commonKeys = ["data", "results", "movies", "items", "list", "titles"];
  for (const key of commonKeys) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value)) {
      const nested = findRapidApiItems(value);
      if (nested.length > 0) return nested;
    }
  }

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

export function parseRapidApiTop250(payload: unknown): MediaItem[] {
  const source = getSource("imdb-top-250");

  return findRapidApiItems(payload).flatMap((item, index): MediaItem[] => {
    const title = firstString(item, [
      "title",
      "primaryTitle",
      "primary_title",
      "name",
    ]);
    if (!title) return [];

    const imdb = parseImdbId(item);
    const year = firstNumber(item, ["year", "releaseYear", "release_year"]);
    const rank = firstNumber(item, ["rank", "position", "ranking"]) ?? index + 1;
    const key = imdb
      ? `imdb:${imdb}`
      : `imdb-top:${rank}:${title}:${year ?? ""}`.toLowerCase();
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
          firstString(item, ["plot", "overview", "description", "synopsis"]) ??
          "Synopsis will be added from TMDb or OMDb when configured.",
        posterUrl: firstString(item, [
          "image",
          "image_url",
          "poster",
          "poster_url",
          "primaryImage",
        ]),
        externalUrl: imdb
          ? `https://www.imdb.com/title/${imdb}/`
          : undefined,
        genres: [],
        ratings: rating === undefined ? {} : { imdb: rating },
        externalIds: { imdb },
        source: "imdb-top-250",
        sourceLabel: source.shortLabel,
        sourceKind: "exact",
        sourceNote:
          "From the current literal IMDb Top 250 movie chart via the configured RapidAPI proxy.",
        rank,
      },
    ];
  });
}

export async function fetchImdbTop250Candidates(): Promise<MediaItem[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw missingEnvironment("RAPIDAPI_KEY");

  const host =
    process.env.RAPIDAPI_IMDB_HOST || "imdb248.p.rapidapi.com";
  const path =
    process.env.RAPIDAPI_IMDB_TOP250_PATH ||
    "/api/imdb/rankings/top/250";
  const url = new URL(path, `https://${host}`);
  const payload = await fetchJson<unknown>(url, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": host,
    },
    next: { revalidate: 21_600 },
  });

  const candidates = parseRapidApiTop250(payload);
  if (candidates.length === 0) {
    throw new MediaSourceError(
      "The IMDb RapidAPI provider returned a shape this adapter does not recognize. Update its host/path or parser.",
    );
  }
  return candidates;
}
