import { getSource } from "@/lib/media/config";
import { missingEnvironment, MediaSourceError } from "@/lib/media/errors";
import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { randomPage } from "@/lib/media/random";
import type {
  MediaCategory,
  MediaItem,
  SourceId,
} from "@/lib/media/types";

type TraktSource = Extract<
  SourceId,
  | "trakt-popular"
  | "trakt-trending"
  | "rt-fresh"
  | "imdb-high-rated"
  | "metacritic"
>;

interface TraktIds {
  trakt?: number;
  imdb?: string | null;
  tmdb?: number | null;
}

interface TraktMedia {
  title?: string;
  year?: number | null;
  ids?: TraktIds;
  overview?: string | null;
  rating?: number | null;
  runtime?: number | null;
  genres?: string[] | null;
  trailer?: string | null;
}

type TraktResponseEntry = TraktMedia & {
  movie?: TraktMedia;
  show?: TraktMedia;
  watchers?: number;
};

function toMediaKey(media: TraktMedia): string {
  if (media.ids?.imdb) return `imdb:${media.ids.imdb}`;
  if (media.ids?.tmdb) return `tmdb:${media.ids.tmdb}`;
  if (media.ids?.trakt) return `trakt:${media.ids.trakt}`;
  return `title:${media.title ?? "unknown"}:${media.year ?? ""}`.toLowerCase();
}

function unwrapTraktEntry(entry: TraktResponseEntry): TraktMedia {
  return entry.movie ?? entry.show ?? entry;
}

function sourceNote(source: TraktSource): string {
  switch (source) {
    case "rt-fresh":
      return "Filtered by Trakt to an 80–100 Rotten Tomatoes Tomatometer range; not an official Certified Fresh list.";
    case "imdb-high-rated":
      return "Filtered by Trakt to IMDb 8.0–10.0 with at least 25,000 IMDb votes.";
    case "metacritic":
      return "Filtered by Trakt to a Metacritic score range of 80–100.";
    case "trakt-trending":
      return "One of the most-watched titles on Trakt during the last 24 hours.";
    case "trakt-popular":
      return "From Trakt Popular, weighted by rating percentage and number of ratings.";
  }
}

function buildTraktUrl(
  category: MediaCategory,
  source: TraktSource,
): URL {
  const mediaPath = category === "tv" ? "shows" : "movies";
  const endpoint = source === "trakt-trending" ? "trending" : "popular";
  const url = new URL(`https://api.trakt.tv/${mediaPath}/${endpoint}`);

  url.searchParams.set("extended", "full");
  url.searchParams.set("page", String(randomPage(5)));
  url.searchParams.set("limit", "50");

  if (category === "docs") {
    url.searchParams.set("genres", "documentary");
  }

  if (source === "rt-fresh") {
    url.searchParams.set("rt_meters", "80-100");
  }

  if (source === "imdb-high-rated") {
    url.searchParams.set("imdb_ratings", "8.0-10.0");
    url.searchParams.set("imdb_votes", "25000-3000000");
  }

  if (source === "metacritic") {
    url.searchParams.set("metascores", "80-100");
  }

  return url;
}

export async function fetchTraktCandidates(
  category: MediaCategory,
  source: TraktSource,
): Promise<MediaItem[]> {
  const clientId = process.env.TRAKT_CLIENT_ID;
  if (!clientId) throw missingEnvironment("TRAKT_CLIENT_ID");

  const definition = getSource(source);
  const payload = await fetchJson<unknown>(buildTraktUrl(category, source), {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "DRAWN/0.1",
      "trakt-api-key": clientId,
      "trakt-api-version": "2",
    },
    next: { revalidate: source === "trakt-trending" ? 900 : 3600 },
  });

  if (!Array.isArray(payload)) {
    throw new MediaSourceError("Trakt returned an unexpected response shape.");
  }

  const mediaType = category === "tv" ? "show" : "movie";

  return (payload as TraktResponseEntry[])
    .map(unwrapTraktEntry)
    .flatMap((media): MediaItem[] => {
      const title = nonEmptyString(media.title);
      if (!title) return [];

      const key = toMediaKey(media);
      const traktRating = finiteNumber(media.rating);

      return [
        {
          id: key,
          mediaKey: key,
          title,
          year: finiteNumber(media.year),
          mediaType,
          category,
          synopsis:
            nonEmptyString(media.overview) ??
            "Synopsis unavailable from this chart.",
          externalUrl: media.ids?.imdb
            ? `https://www.imdb.com/title/${media.ids.imdb}/`
            : undefined,
          trailerUrl: nonEmptyString(media.trailer),
          runtimeMinutes: finiteNumber(media.runtime),
          genres: Array.isArray(media.genres)
            ? media.genres.filter((genre): genre is string => typeof genre === "string")
            : [],
          ratings: traktRating === undefined ? {} : { trakt: traktRating },
          externalIds: {
            trakt: finiteNumber(media.ids?.trakt),
            imdb: nonEmptyString(media.ids?.imdb),
            tmdb: finiteNumber(media.ids?.tmdb),
          },
          source,
          sourceLabel: definition.shortLabel,
          sourceKind: definition.kind as MediaItem["sourceKind"],
          sourceNote: sourceNote(source),
        },
      ];
    });
}
