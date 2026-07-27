export const CATEGORIES = ["movies", "tv", "anime", "docs"] as const;

export type MediaCategory = (typeof CATEGORIES)[number];

export const SOURCE_IDS = [
  "all",
  "trakt-popular",
  "trakt-trending",
  "rt-fresh",
  "imdb-top-1000",
  "imdb-high-rated",
  "metacritic",
  "tmdb-popular",
  "tmdb-top-rated",
  "mal-top",
  "mal-popular",
  "letterboxd-most-fans",
  "rt-anime-movies",
  "imdb-animated-movies",
  "rt-documentaries",
  "letterboxd-documentaries",
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];

export type MediaType = "movie" | "show" | "anime";

export interface SourceDefinition {
  id: SourceId;
  label: string;
  shortLabel: string;
  description: string;
  kind: "blend" | "native" | "filtered" | "exact";
  categories: readonly MediaCategory[];
  requires?: readonly string[];
}

export interface MediaRatings {
  trakt?: number;
  imdb?: number;
  rottenTomatoes?: number;
  metacritic?: number;
  tmdb?: number;
  mal?: number;
}

export interface MediaExternalIds {
  trakt?: number;
  imdb?: string;
  tmdb?: number;
  mal?: number;
}

export interface MediaItem {
  id: string;
  mediaKey: string;
  title: string;
  originalTitle?: string;
  tagline?: string;
  year?: number;
  releaseDate?: string;
  mediaType: MediaType;
  category: MediaCategory;
  synopsis: string;
  posterUrl?: string;
  backdropUrl?: string;
  externalUrl?: string;
  trailerUrl?: string;
  runtimeMinutes?: number;
  seasonCount?: number;
  episodeCount?: number;
  contentRating?: string;
  language?: string;
  genres: string[];
  creators?: string[];
  cast?: string[];
  ratings: MediaRatings;
  externalIds: MediaExternalIds;
  source: Exclude<SourceId, "all">;
  sourceLabel: string;
  sourceKind: Exclude<SourceDefinition["kind"], "blend">;
  sourceNote: string;
  rank?: number;
}

export interface RollResponse {
  item: MediaItem;
  poolSize: number;
  generatedAt: string;
}
