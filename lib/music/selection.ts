import { pickRandom } from "@/lib/media/random";
import type { TrackItem } from "@/lib/music/types";

export interface MusicRollExclusions {
  mediaKeys?: readonly string[];
  artists?: readonly string[];
}

export function artistIdentity(artist: string): string {
  return artist
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Removes recent results when possible. If an entire fetched page is excluded,
 * it first relaxes the artist rule while still avoiding exact track repeats.
 */
export function applyMusicExclusions(
  items: readonly TrackItem[],
  exclusions: MusicRollExclusions = {},
): TrackItem[] {
  const excludedTracks = new Set(exclusions.mediaKeys ?? []);
  const excludedArtists = new Set(
    (exclusions.artists ?? []).map(artistIdentity).filter(Boolean),
  );
  const unseenTracks = items.filter(
    (item) => !excludedTracks.has(item.mediaKey),
  );
  const unseenArtists = unseenTracks.filter(
    (item) => !excludedArtists.has(artistIdentity(item.artist)),
  );

  if (unseenArtists.length > 0) return unseenArtists;
  if (unseenTracks.length > 0) return unseenTracks;
  return [...items];
}

export function groupTracksByArtist(
  items: readonly TrackItem[],
): TrackItem[][] {
  const groups = new Map<string, TrackItem[]>();

  for (const item of items) {
    const key = artistIdentity(item.artist);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  return [...groups.values()];
}

/**
 * Selects an artist uniformly first, then one of that artist's tracks.
 * A chart-flooding artist therefore gets one chance, not one per track.
 */
export function pickArtistBalancedTrack(items: readonly TrackItem[]): {
  item: TrackItem;
  artistPoolSize: number;
} {
  const artistGroups = groupTracksByArtist(items);
  const artistGroup = pickRandom(artistGroups);

  return {
    item: pickRandom(artistGroup),
    artistPoolSize: artistGroups.length,
  };
}
