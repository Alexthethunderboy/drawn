import {
  getBlendSources,
  getSource,
  isSourceAvailableForCategory,
} from "@/lib/media/config";
import { MediaSourceError } from "@/lib/media/errors";
import { enrichMedia } from "@/lib/media/enrich";
import { pickRandom } from "@/lib/media/random";
import { fetchJikanCandidates } from "@/lib/media/providers/jikan";
import { fetchImdbTop250Candidates } from "@/lib/media/providers/rapidapi";
import { fetchTmdbCandidates } from "@/lib/media/providers/tmdb";
import { fetchTraktCandidates } from "@/lib/media/providers/trakt";
import type {
  MediaCategory,
  MediaItem,
  RollResponse,
  SourceId,
} from "@/lib/media/types";

type ConcreteSource = Exclude<SourceId, "all">;

async function fetchConcreteSource(
  category: MediaCategory,
  source: ConcreteSource,
): Promise<MediaItem[]> {
  switch (source) {
    case "trakt-popular":
    case "trakt-trending":
    case "rt-fresh":
    case "imdb-high-rated":
    case "metacritic":
      return fetchTraktCandidates(category, source);
    case "tmdb-popular":
    case "tmdb-top-rated":
      return fetchTmdbCandidates(category, source);
    case "imdb-top-250":
      return fetchImdbTop250Candidates();
    case "mal-top":
    case "mal-popular":
      return fetchJikanCandidates(source);
  }
}

function dedupeCandidates(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const keys = [
      item.externalIds.imdb && `imdb:${item.externalIds.imdb}`,
      item.externalIds.tmdb && `tmdb:${item.externalIds.tmdb}`,
      item.externalIds.mal && `mal:${item.externalIds.mal}`,
      `${item.title.toLowerCase()}:${item.year ?? ""}`,
    ].filter((key): key is string => Boolean(key));

    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

async function fetchBlendedCandidates(
  category: MediaCategory,
): Promise<MediaItem[]> {
  const sources = getBlendSources(category);
  const results = await Promise.allSettled(
    sources.map((source) => fetchConcreteSource(category, source)),
  );

  // Cap each chart equally so a provider's page size does not dominate the roll.
  const candidates = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value.slice(0, 25) : [],
  );

  if (candidates.length === 0) {
    const reasons = results
      .flatMap((result) =>
        result.status === "rejected" && result.reason instanceof Error
          ? [result.reason.message]
          : [],
      )
      .slice(0, 2);
    throw new MediaSourceError(
      reasons[0] ??
        "No configured provider returned a usable title for this category.",
      503,
      "NO_AVAILABLE_SOURCE",
    );
  }

  return dedupeCandidates(candidates);
}

export async function rollMedia(
  category: MediaCategory,
  source: SourceId,
): Promise<RollResponse> {
  if (!isSourceAvailableForCategory(source, category)) {
    throw new MediaSourceError(
      `${getSource(source).label} is not available for this category.`,
      400,
      "INVALID_SOURCE_FOR_CATEGORY",
    );
  }

  const candidates =
    source === "all"
      ? await fetchBlendedCandidates(category)
      : await fetchConcreteSource(category, source);

  if (candidates.length === 0) {
    throw new MediaSourceError(
      "This chart returned no titles. Try another chart or roll again.",
      404,
      "EMPTY_CHART",
    );
  }

  const selected = pickRandom(candidates);
  const item = await enrichMedia(selected);

  return {
    item,
    poolSize: candidates.length,
    generatedAt: new Date().toISOString(),
  };
}
