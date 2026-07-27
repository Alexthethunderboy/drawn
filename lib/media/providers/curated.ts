import curatedLists from "@/data/curated-lists.json";
import { getSource } from "@/lib/media/config";
import type {
  MediaCategory,
  MediaItem,
  SourceId,
} from "@/lib/media/types";

type CuratedMediaSource = Extract<
  SourceId,
  | "letterboxd-most-fans"
  | "rt-anime-movies"
  | "imdb-animated-movies"
  | "rt-documentaries"
  | "letterboxd-documentaries"
>;

interface CuratedRow {
  rank: number;
  title?: string;
  year?: number;
  href?: string;
  poster?: string;
  score?: number;
  rating?: number;
  metascore?: number;
  runtime?: string;
  contentRating?: string;
  genres?: string[];
  directors?: string[];
}

const SOURCE_TO_DATA = {
  "letterboxd-most-fans": "letterboxdFilms",
  "rt-anime-movies": "rottenTomatoesAnime",
  "imdb-animated-movies": "imdbAnimated",
  "rt-documentaries": "rottenTomatoesDocs",
  "letterboxd-documentaries": "letterboxdDocs",
} as const;

const SOURCE_CATEGORY: Record<CuratedMediaSource, MediaCategory> = {
  "letterboxd-most-fans": "movies",
  "rt-anime-movies": "anime",
  "imdb-animated-movies": "anime",
  "rt-documentaries": "docs",
  "letterboxd-documentaries": "docs",
};

function keyPart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

function runtimeMinutes(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const hours = Number(value.match(/(\d+)\s*h/)?.[1] ?? 0);
  const minutes = Number(value.match(/(\d+)\s*m/)?.[1] ?? 0);
  const total = hours * 60 + minutes;
  return total || undefined;
}

function imdbId(value: string | undefined): string | undefined {
  return value?.match(/\/title\/(tt\d+)/)?.[1];
}

export function fetchCuratedMediaCandidates(
  source: CuratedMediaSource,
): MediaItem[] {
  const definition = getSource(source);
  const dataKey = SOURCE_TO_DATA[source];
  const rows = curatedLists.sources[dataKey].items as CuratedRow[];
  const category = SOURCE_CATEGORY[source];

  return rows.flatMap((row): MediaItem[] => {
    if (!row.title) return [];
    const identity = `${keyPart(row.title)}:${row.year ?? "unknown"}`;
    const imdb = imdbId(row.href);
    const isDocumentary = category === "docs";
    const isAnimeMovie =
      source === "rt-anime-movies" || source === "imdb-animated-movies";

    return [
      {
        id: `${source}:${identity}`,
        mediaKey: `${source}:${identity}`,
        title: row.title,
        year: row.year,
        mediaType: "movie",
        category,
        synopsis: `Synopsis unavailable; ranked #${row.rank} on ${definition.label}.`,
        posterUrl: row.poster,
        externalUrl: row.href ?? curatedLists.sources[dataKey].url,
        runtimeMinutes: runtimeMinutes(row.runtime),
        contentRating: row.contentRating,
        genres:
          row.genres?.length
            ? row.genres
            : isDocumentary
              ? ["Documentary"]
              : isAnimeMovie
                ? ["Animation"]
                : [],
        creators: row.directors,
        ratings: {
          rottenTomatoes:
            source === "rt-anime-movies" ||
            source === "rt-documentaries"
              ? row.score
              : undefined,
          imdb:
            source === "imdb-animated-movies" ? row.rating : undefined,
          metacritic:
            source === "imdb-animated-movies" ? row.metascore : undefined,
        },
        externalIds: { imdb },
        source,
        sourceLabel: definition.shortLabel,
        sourceKind: "exact",
        sourceNote: `${definition.description} Browser-verified snapshot from ${curatedLists.generatedAt}; optional metadata enrichment never controls selection.`,
        rank: row.rank,
      },
    ];
  });
}
