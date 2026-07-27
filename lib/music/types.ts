export const MUSIC_SOURCE_IDS = [
  "all",
  "rolling-stone-500",
  "listenbrainz-week",
  "listenbrainz-month",
  "listenbrainz-all-time",
] as const;

export type MusicSourceId = (typeof MUSIC_SOURCE_IDS)[number];

export interface MusicSourceDefinition {
  id: MusicSourceId;
  label: string;
  shortLabel: string;
  description: string;
  requires?: readonly string[];
}

export interface TrackStats {
  listens?: number;
  listeners?: number;
  plays?: number;
}

export interface TrackExternalIds {
  recordingMbid?: string;
  releaseMbid?: string;
  appleMusicId?: string;
  spotifyTrackId?: string;
  spotifyAlbumId?: string;
  isrc?: string;
}

export interface TrackItem {
  id: string;
  mediaKey: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  recordLabel?: string;
  artworkUrl?: string;
  previewUrl?: string;
  externalUrl?: string;
  appleMusicUrl?: string;
  spotifyUrl?: string;
  durationMs?: number;
  genres: string[];
  stats: TrackStats;
  externalIds: TrackExternalIds;
  source: Exclude<MusicSourceId, "all">;
  sourceLabel: string;
  sourceNote: string;
  rank?: number;

  // Shared saved-item contract.
  mediaType: "track" | "album";
  category: "music";
  synopsis: string;
  ratings: Record<string, never>;
}

export interface MusicRollResponse {
  item: TrackItem;
  poolSize: number;
  artistPoolSize: number;
  generatedAt: string;
}
