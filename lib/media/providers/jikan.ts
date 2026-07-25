import { getSource } from "@/lib/media/config";
import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { randomPage } from "@/lib/media/random";
import type { MediaItem, SourceId } from "@/lib/media/types";

type JikanSource = Extract<SourceId, "mal-top" | "mal-popular">;

interface JikanAnime {
  mal_id?: number;
  url?: string;
  title?: string;
  title_english?: string | null;
  synopsis?: string | null;
  score?: number | null;
  rank?: number | null;
  year?: number | null;
  aired?: { prop?: { from?: { year?: number | null } } };
  images?: {
    webp?: { large_image_url?: string | null; image_url?: string | null };
    jpg?: { large_image_url?: string | null; image_url?: string | null };
  };
  trailer?: { url?: string | null };
  genres?: { name?: string }[];
  duration?: string | null;
}

interface JikanResponse {
  data?: JikanAnime[];
}

function parseAnimeRuntime(duration: unknown): number | undefined {
  if (typeof duration !== "string") return undefined;
  const hours = duration.match(/(\d+)\s*hr/);
  const minutes = duration.match(/(\d+)\s*min/);
  const total =
    (hours ? Number.parseInt(hours[1]!, 10) * 60 : 0) +
    (minutes ? Number.parseInt(minutes[1]!, 10) : 0);
  return total || undefined;
}

function cleanSynopsis(value: unknown): string | undefined {
  return nonEmptyString(value)?.replace(/\s*\[Written by MAL Rewrite\]\s*$/i, "");
}

export async function fetchJikanCandidates(
  source: JikanSource,
): Promise<MediaItem[]> {
  const definition = getSource(source);
  const url = new URL("https://api.jikan.moe/v4/top/anime");
  url.searchParams.set("page", String(randomPage(5)));
  url.searchParams.set("limit", "25");
  if (source === "mal-popular") {
    url.searchParams.set("filter", "bypopularity");
  }

  const payload = await fetchJson<JikanResponse>(url, {
    next: { revalidate: 21_600 },
  });

  return (payload.data ?? []).flatMap((anime): MediaItem[] => {
    const malId = finiteNumber(anime.mal_id);
    const title = nonEmptyString(anime.title_english ?? anime.title);
    if (!malId || !title) return [];

    const key = `mal:${malId}`;
    const malRating = finiteNumber(anime.score);
    return [
      {
        id: key,
        mediaKey: key,
        title,
        originalTitle: nonEmptyString(anime.title),
        year:
          finiteNumber(anime.year) ??
          finiteNumber(anime.aired?.prop?.from?.year),
        mediaType: "anime",
        category: "anime",
        synopsis:
          cleanSynopsis(anime.synopsis) ?? "Synopsis unavailable from this chart.",
        posterUrl:
          nonEmptyString(anime.images?.webp?.large_image_url) ??
          nonEmptyString(anime.images?.jpg?.large_image_url) ??
          nonEmptyString(anime.images?.webp?.image_url) ??
          nonEmptyString(anime.images?.jpg?.image_url),
        externalUrl: nonEmptyString(anime.url),
        trailerUrl: nonEmptyString(anime.trailer?.url),
        runtimeMinutes: parseAnimeRuntime(anime.duration),
        genres: (anime.genres ?? []).flatMap((genre) =>
          genre.name ? [genre.name] : [],
        ),
        ratings: malRating === undefined ? {} : { mal: malRating },
        externalIds: { mal: malId },
        source,
        sourceLabel: definition.shortLabel,
        sourceKind: "native",
        sourceNote:
          source === "mal-top"
            ? "From Jikan's current MyAnimeList top-ranked anime chart."
            : "From Jikan's MyAnimeList popularity chart.",
        rank: finiteNumber(anime.rank),
      },
    ];
  });
}
