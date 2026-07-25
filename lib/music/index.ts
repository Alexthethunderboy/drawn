import { MediaSourceError } from "@/lib/media/errors";
import { pickRandom } from "@/lib/media/random";
import { getMusicBlendSources } from "@/lib/music/config";
import { enrichTrack } from "@/lib/music/enrich";
import { fetchAppleTopSongs } from "@/lib/music/providers/apple";
import { fetchLastFmTracks } from "@/lib/music/providers/lastfm";
import { fetchListenBrainzTracks } from "@/lib/music/providers/listenbrainz";
import type {
  MusicRollResponse,
  MusicSourceId,
  TrackItem,
} from "@/lib/music/types";

type ConcreteMusicSource = Exclude<MusicSourceId, "all">;

async function fetchConcreteMusicSource(
  source: ConcreteMusicSource,
): Promise<TrackItem[]> {
  switch (source) {
    case "listenbrainz-week":
    case "listenbrainz-month":
    case "listenbrainz-all-time":
      return fetchListenBrainzTracks(source);
    case "lastfm-global":
      return fetchLastFmTracks();
    case "apple-top-songs":
      return fetchAppleTopSongs();
  }
}

function trackIdentity(item: TrackItem): string {
  return `${item.artist}:${item.title}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function dedupeTracks(items: TrackItem[]): TrackItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = trackIdentity(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchBlendedTracks(): Promise<TrackItem[]> {
  const results = await Promise.allSettled(
    getMusicBlendSources().map(fetchConcreteMusicSource),
  );
  const candidates = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value.slice(0, 30) : [],
  );

  if (candidates.length === 0) {
    const firstReason = results.find(
      (result) => result.status === "rejected",
    );
    throw new MediaSourceError(
      firstReason?.status === "rejected" &&
      firstReason.reason instanceof Error
        ? firstReason.reason.message
        : "No music chart returned a usable song.",
      503,
      "NO_AVAILABLE_MUSIC_SOURCE",
    );
  }

  return dedupeTracks(candidates);
}

export async function rollMusic(
  source: MusicSourceId,
): Promise<MusicRollResponse> {
  const candidates =
    source === "all"
      ? await fetchBlendedTracks()
      : await fetchConcreteMusicSource(source);

  if (candidates.length === 0) {
    throw new MediaSourceError(
      "This music chart returned no songs. Try another chart.",
      404,
      "EMPTY_MUSIC_CHART",
    );
  }

  const selected = pickRandom(candidates);
  const item = await enrichTrack(selected);

  return {
    item,
    poolSize: candidates.length,
    generatedAt: new Date().toISOString(),
  };
}
