import { getMusicSource } from "@/lib/music/config";
import { missingEnvironment, MediaSourceError } from "@/lib/media/errors";
import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { randomPage } from "@/lib/media/random";
import type { TrackItem } from "@/lib/music/types";

interface AppleArtwork {
  url?: string;
}

interface AppleSong {
  id?: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    durationInMillis?: number;
    genreNames?: string[];
    url?: string;
    artwork?: AppleArtwork;
    previews?: { url?: string }[];
  };
}

interface AppleChartResponse {
  results?: {
    songs?: {
      data?: AppleSong[];
    }[];
  };
}

function artworkUrl(template: unknown): string | undefined {
  const url = nonEmptyString(template);
  return url
    ?.replace("{w}", "700")
    .replace("{h}", "700")
    .replace("{f}", "jpg");
}

export async function fetchAppleTopSongs(): Promise<TrackItem[]> {
  const token = process.env.APPLE_MUSIC_DEVELOPER_TOKEN;
  if (!token) throw missingEnvironment("APPLE_MUSIC_DEVELOPER_TOKEN");

  const storefront = (
    process.env.APPLE_MUSIC_STOREFRONT || "us"
  ).toLowerCase();
  const definition = getMusicSource("apple-top-songs");
  const page = randomPage(3) - 1;
  const url = new URL(
    `https://api.music.apple.com/v1/catalog/${storefront}/charts`,
  );
  url.searchParams.set("types", "songs");
  url.searchParams.set("chart", "most-played");
  url.searchParams.set("limit", "50");
  url.searchParams.set("offset", String(page * 50));

  const payload = await fetchJson<AppleChartResponse>(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  const songs = payload.results?.songs?.[0]?.data;
  if (!Array.isArray(songs)) {
    throw new MediaSourceError(
      "Apple Music returned an unexpected chart response.",
    );
  }

  return songs.flatMap((song, index): TrackItem[] => {
    const title = nonEmptyString(song.attributes?.name);
    const artist = nonEmptyString(song.attributes?.artistName);
    const appleMusicId = nonEmptyString(song.id);
    if (!title || !artist || !appleMusicId) return [];

    const album = nonEmptyString(song.attributes?.albumName);
    const appleMusicUrl = nonEmptyString(song.attributes?.url);
    return [
      {
        id: `apple:${appleMusicId}`,
        mediaKey: `apple:${appleMusicId}`,
        title,
        artist,
        album,
        artworkUrl: artworkUrl(song.attributes?.artwork?.url),
        previewUrl: nonEmptyString(song.attributes?.previews?.[0]?.url),
        externalUrl: appleMusicUrl,
        appleMusicUrl,
        durationMs: finiteNumber(song.attributes?.durationInMillis),
        genres: (song.attributes?.genreNames ?? []).filter(
          (genre) => genre.toLowerCase() !== "music",
        ),
        stats: {},
        externalIds: { appleMusicId },
        source: "apple-top-songs",
        sourceLabel: definition.shortLabel,
        sourceNote: `${definition.description} Storefront: ${storefront.toUpperCase()}.`,
        rank: page * 50 + index + 1,
        mediaType: "track",
        category: "music",
        synopsis: album
          ? `${title} by ${artist}, from ${album}.`
          : `${title} by ${artist}.`,
        ratings: {},
      },
    ];
  });
}
