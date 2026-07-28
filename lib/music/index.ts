import { MediaSourceError } from "@/lib/media/errors";
import { getMusicBlendSources } from "@/lib/music/config";
import { enrichTrack } from "@/lib/music/enrich";
import { fetchListenBrainzTracks } from "@/lib/music/providers/listenbrainz";
import { fetchRollingStoneAlbums } from "@/lib/music/providers/rolling-stone";
import {
  applyMusicExclusions,
  pickArtistBalancedTrack,
  type MusicRollExclusions,
} from "@/lib/music/selection";
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
    case "rolling-stone-500":
      return fetchRollingStoneAlbums();
    case "listenbrainz-week":
    case "listenbrainz-month":
    case "listenbrainz-all-time":
      return fetchListenBrainzTracks(source);
  }
}

async function fetchMusicSourceWithFallback(
  source: ConcreteMusicSource,
): Promise<TrackItem[]> {
  try {
    const candidates = await fetchConcreteMusicSource(source);
    if (candidates.length > 0) return candidates;
  } catch {
    // The locally stored album chart below keeps every roll usable.
  }

  if (source === "rolling-stone-500") return [];
  return fetchRollingStoneAlbums().map((item) => ({
    ...item,
    sourceNote: `The requested live chart was unavailable, so this roll used the local ${item.sourceLabel} fallback. ${item.sourceNote}`,
  }));
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
    result.status === "fulfilled" ? result.value : [],
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
  exclusions: MusicRollExclusions = {},
  mediaType: "all" | "album" | "track" = "all",
): Promise<MusicRollResponse> {
  const rawCandidates =
    source === "all"
      ? await fetchBlendedTracks()
      : await fetchMusicSourceWithFallback(source);

  const candidates =
    mediaType === "all"
      ? rawCandidates
      : rawCandidates.filter((item) => item.mediaType === mediaType);

  if (candidates.length === 0) {
    throw new MediaSourceError(
      `This music chart has no ${mediaType === "album" ? "albums" : mediaType === "track" ? "singles" : "records"}. Try another format or chart.`,
      404,
      "EMPTY_MUSIC_CHART",
    );
  }

  const eligibleCandidates = applyMusicExclusions(candidates, exclusions);
  const selection = pickArtistBalancedTrack(eligibleCandidates);
  const item = await enrichTrack(selection.item);

  return {
    item,
    poolSize: candidates.length,
    artistPoolSize: selection.artistPoolSize,
    generatedAt: new Date().toISOString(),
  };
}
