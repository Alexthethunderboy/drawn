export const MUSIC_SOURCE_IDS = [
  "all",
  "listenbrainz-week",
  "listenbrainz-month",
  "listenbrainz-all-time",
  "lastfm-global",
  "apple-top-songs",
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
  lastfmUrl?: string;
  appleMusicId?: string;
  spotifyTrackId?: string;
  isrc?: string;
}

export interface TrackItem {
  id: string;
  mediaKey: string;
  title: string;
  artist: string;
  album?: string;
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

  // Shared watchlist contract.
  mediaType: "track";
  category: "music";
  synopsis: string;
  ratings: Record<string, never>;
}

export interface MusicRollResponse {
  item: TrackItem;
  poolSize: number;
  generatedAt: string;
}
