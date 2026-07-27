import { getMusicSource } from "@/lib/music/config";
import { MediaSourceError } from "@/lib/media/errors";
import { fetchJson, finiteNumber, nonEmptyString } from "@/lib/media/http";
import { randomPage } from "@/lib/media/random";
import type { MusicSourceId, TrackItem } from "@/lib/music/types";

type ListenBrainzSource = Extract<
  MusicSourceId,
  "listenbrainz-week" | "listenbrainz-month" | "listenbrainz-all-time"
>;

interface ListenBrainzRecording {
  artist_name?: string;
  track_name?: string;
  release_name?: string;
  listen_count?: number;
  recording_mbid?: string;
  release_mbid?: string;
  caa_release_mbid?: string;
}

interface ListenBrainzResponse {
  payload?: {
    recordings?: ListenBrainzRecording[];
  };
}

const PAGE_SIZE = 100;
const TOP_CHART_LIMIT = 1_000;

function chartRange(source: ListenBrainzSource): string {
  if (source === "listenbrainz-week") return "week";
  if (source === "listenbrainz-month") return "month";
  return "all_time";
}

function keyPart(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

export async function fetchListenBrainzTracks(
  source: ListenBrainzSource,
): Promise<TrackItem[]> {
  const definition = getMusicSource(source);
  // Sample the full top 1,000 instead of repeatedly hovering near chart #1.
  const page = randomPage(TOP_CHART_LIMIT / PAGE_SIZE) - 1;
  const url = new URL(
    "https://api.listenbrainz.org/1/stats/sitewide/recordings",
  );
  url.searchParams.set("range", chartRange(source));
  url.searchParams.set("count", String(PAGE_SIZE));
  url.searchParams.set("offset", String(page * PAGE_SIZE));

  const payload = await fetchJson<ListenBrainzResponse>(url, {
    headers: { "User-Agent": "DRAWN/0.1 (music discovery)" },
    next: { revalidate: 3600 },
  });
  const recordings = payload.payload?.recordings;
  if (!Array.isArray(recordings)) {
    throw new MediaSourceError(
      "ListenBrainz returned an unexpected response shape.",
    );
  }

  return recordings.flatMap((recording, index): TrackItem[] => {
    const title = nonEmptyString(recording.track_name);
    const artist = nonEmptyString(recording.artist_name);
    if (!title || !artist) return [];

    const recordingMbid = nonEmptyString(recording.recording_mbid);
    const releaseMbid =
      nonEmptyString(recording.caa_release_mbid) ??
      nonEmptyString(recording.release_mbid);
    const key = recordingMbid
      ? `musicbrainz:${recordingMbid}`
      : `track:${keyPart(artist)}:${keyPart(title)}`;
    const album = nonEmptyString(recording.release_name);

    return [
      {
        id: key,
        mediaKey: key,
        title,
        artist,
        album,
        artworkUrl: releaseMbid
          ? `https://coverartarchive.org/release/${releaseMbid}/front-500`
          : undefined,
        externalUrl: recordingMbid
          ? `https://musicbrainz.org/recording/${recordingMbid}`
          : undefined,
        genres: [],
        stats: { listens: finiteNumber(recording.listen_count) },
        externalIds: { recordingMbid, releaseMbid },
        source,
        sourceLabel: definition.shortLabel,
        sourceNote: `${definition.description} Sampled from its global top ${TOP_CHART_LIMIT}; artists are balanced before selection.`,
        rank: page * PAGE_SIZE + index + 1,
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
