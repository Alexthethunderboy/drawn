import type {
  MediaCategory,
  SourceDefinition,
  SourceId,
} from "@/lib/media/types";

export const CATEGORY_LABELS: Record<MediaCategory, string> = {
  movies: "Movies",
  tv: "TV Shows",
  anime: "Anime",
  docs: "Docs",
};

export const SOURCES: readonly SourceDefinition[] = [
  {
    id: "all",
    label: "All charts",
    shortLabel: "All charts",
    description: "An even blend of every configured chart available here.",
    kind: "blend",
    categories: ["movies", "tv", "anime", "docs"],
  },
  {
    id: "trakt-popular",
    label: "Trakt Popular",
    shortLabel: "Trakt",
    description: "Popularity weighted by rating percentage and rating volume.",
    kind: "native",
    categories: ["movies", "tv", "docs"],
    requires: ["TRAKT_CLIENT_ID"],
  },
  {
    id: "trakt-trending",
    label: "Trakt Trending",
    shortLabel: "Trakt live",
    description: "The most-watched titles on Trakt during the last 24 hours.",
    kind: "native",
    categories: ["movies", "tv", "docs"],
    requires: ["TRAKT_CLIENT_ID"],
  },
  {
    id: "rt-fresh",
    label: "Rotten Tomatoes 80%+",
    shortLabel: "RT 80%+",
    description:
      "A Trakt movie pool filtered to an 80–100 Tomatometer range. It is not the official Certified Fresh list.",
    kind: "filtered",
    categories: ["movies", "docs"],
    requires: ["TRAKT_CLIENT_ID"],
  },
  {
    id: "imdb-top-250",
    label: "IMDb Top 250 · exact",
    shortLabel: "IMDb 250",
    description:
      "The literal current IMDb movie chart through your configured RapidAPI proxy.",
    kind: "exact",
    categories: ["movies"],
    requires: ["RAPIDAPI_KEY"],
  },
  {
    id: "imdb-high-rated",
    label: "IMDb 8.0+",
    shortLabel: "IMDb 8+",
    description:
      "A Trakt pool filtered to IMDb ratings of 8.0–10 with at least 25,000 votes.",
    kind: "filtered",
    categories: ["movies", "tv", "docs"],
    requires: ["TRAKT_CLIENT_ID"],
  },
  {
    id: "metacritic",
    label: "Metacritic 80+",
    shortLabel: "Meta 80+",
    description: "A Trakt movie pool filtered to Metascores of 80–100.",
    kind: "filtered",
    categories: ["movies", "docs"],
    requires: ["TRAKT_CLIENT_ID"],
  },
  {
    id: "tmdb-popular",
    label: "TMDb Popular",
    shortLabel: "TMDb",
    description: "TMDb titles ordered by current popularity.",
    kind: "native",
    categories: ["movies", "tv", "docs"],
    requires: ["TMDB_ACCESS_TOKEN"],
  },
  {
    id: "tmdb-top-rated",
    label: "TMDb Top Rated",
    shortLabel: "TMDb top",
    description: "TMDb titles ordered by rating with a vote-count floor.",
    kind: "native",
    categories: ["movies", "tv", "docs"],
    requires: ["TMDB_ACCESS_TOKEN"],
  },
  {
    id: "mal-top",
    label: "MyAnimeList Top",
    shortLabel: "MAL top",
    description: "The top-ranked anime returned by Jikan's MyAnimeList chart.",
    kind: "native",
    categories: ["anime"],
  },
  {
    id: "mal-popular",
    label: "MyAnimeList Popular",
    shortLabel: "MAL popular",
    description: "The most popular anime returned by Jikan.",
    kind: "native",
    categories: ["anime"],
  },
] as const;

const SOURCE_MAP = new Map(SOURCES.map((source) => [source.id, source]));

export function getSource(source: SourceId): SourceDefinition {
  const match = SOURCE_MAP.get(source);
  if (!match) {
    throw new Error(`Unknown media source: ${source}`);
  }
  return match;
}

export function getSourcesForCategory(
  category: MediaCategory,
): SourceDefinition[] {
  return SOURCES.filter((source) => source.categories.includes(category));
}

export function isSourceAvailableForCategory(
  source: SourceId,
  category: MediaCategory,
): boolean {
  return getSource(source).categories.includes(category);
}

export function getBlendSources(
  category: MediaCategory,
): Exclude<SourceId, "all">[] {
  return getSourcesForCategory(category)
    .filter((source) => source.id !== "all")
    .map((source) => source.id as Exclude<SourceId, "all">);
}
