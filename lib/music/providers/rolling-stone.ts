import curatedLists from "@/data/curated-lists.json";
import { getMusicSource } from "@/lib/music/config";
import type { TrackItem } from "@/lib/music/types";

interface RollingStoneAlbum {
  rank: number;
  artist?: string;
  album?: string;
  label?: string;
  year?: number;
}

function keyPart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

export function fetchRollingStoneAlbums(): TrackItem[] {
  const source = "rolling-stone-500" as const;
  const definition = getMusicSource(source);
  const rows = curatedLists.sources.rollingStoneAlbums
    .items as RollingStoneAlbum[];

  return rows.flatMap((row): TrackItem[] => {
    if (!row.album || !row.artist) return [];
    const mediaKey = `rolling-stone-album:${keyPart(row.artist)}:${keyPart(row.album)}`;

    return [
      {
        id: mediaKey,
        mediaKey,
        title: row.album,
        artist: row.artist,
        album: row.album,
        year: row.year,
        recordLabel: row.label,
        externalUrl: curatedLists.sources.rollingStoneAlbums.url,
        genres: [],
        stats: {},
        externalIds: {},
        source,
        sourceLabel: definition.shortLabel,
        sourceNote: `${definition.description} Browser-verified snapshot from ${curatedLists.generatedAt}; Spotify and iTunes are optional metadata matches only.`,
        rank: row.rank,
        mediaType: "album",
        category: "music",
        synopsis: `${row.album} by ${row.artist}${row.year ? `, released in ${row.year}` : ""}${row.label ? ` on ${row.label}` : ""}. Ranked #${row.rank} on Rolling Stone's 500 Greatest Albums.`,
        ratings: {},
      },
    ];
  });
}
