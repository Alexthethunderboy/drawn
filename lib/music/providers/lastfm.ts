import { getMusicSource } from "@/lib/music/config";
import { missingEnvironment, MediaSourceError } from "@/lib/media/errors";
import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { randomPage } from "@/lib/media/random";
import type { TrackItem } from "@/lib/music/types";

interface LastFmTrack {
  name?: string;
  playcount?: string;
  listeners?: string;
  mbid?: string;
  url?: string;
  artist?: { name?: string; mbid?: string };
  image?: { "#text"?: string; size?: string }[];
  "@attr"?: { rank?: string };
}

interface LastFmResponse {
  tracks?: {
    track?: LastFmTrack[];
    "@attr"?: { page?: string; perPage?: string };
  };
  error?: number;
  message?: string;
}

function largestImage(images: LastFmTrack["image"]): string | undefined {
  if (!Array.isArray(images)) return undefined;
  return [...images]
    .reverse()
    .map((image) => nonEmptyString(image["#text"]))
    .find(Boolean);
}

function keyPart(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

export async function fetchLastFmTracks(): Promise<TrackItem[]> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw missingEnvironment("LASTFM_API_KEY");

  const definition = getMusicSource("lastfm-global");
  const page = randomPage(5);
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", "chart.gettoptracks");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "50");
  url.searchParams.set("page", String(page));

  const payload = await fetchJson<LastFmResponse>(url, {
    next: { revalidate: 1800 },
  });
  if (payload.error) {
    throw new MediaSourceError(
      payload.message ?? "Last.fm could not load its chart.",
    );
  }

  const tracks = payload.tracks?.track;
  if (!Array.isArray(tracks)) {
    throw new MediaSourceError("Last.fm returned an unexpected response shape.");
  }

  return tracks.flatMap((track, index): TrackItem[] => {
    const title = nonEmptyString(track.name);
    const artist = nonEmptyString(track.artist?.name);
    if (!title || !artist) return [];

    const mbid = nonEmptyString(track.mbid);
    const key = mbid
      ? `musicbrainz:${mbid}`
      : `track:${keyPart(artist)}:${keyPart(title)}`;
    const rank = finiteNumber(track["@attr"]?.rank) ?? (page - 1) * 50 + index + 1;
    const lastfmUrl = nonEmptyString(track.url);

    return [
      {
        id: key,
        mediaKey: key,
        title,
        artist,
        artworkUrl: largestImage(track.image),
        externalUrl: lastfmUrl,
        genres: [],
        stats: {
          plays: finiteNumber(track.playcount),
          listeners: finiteNumber(track.listeners),
        },
        externalIds: { recordingMbid: mbid, lastfmUrl },
        source: "lastfm-global",
        sourceLabel: definition.shortLabel,
        sourceNote: definition.description,
        rank,
        mediaType: "track",
        category: "music",
        synopsis: `${title} by ${artist}.`,
        ratings: {},
      },
    ];
  });
}
