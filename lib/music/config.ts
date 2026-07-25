import type {
  MusicSourceDefinition,
  MusicSourceId,
} from "@/lib/music/types";

export const MUSIC_SOURCES: readonly MusicSourceDefinition[] = [
  {
    id: "all",
    label: "All charts",
    shortLabel: "All charts",
    description:
      "An equal blend of every configured global music chart.",
  },
  {
    id: "listenbrainz-week",
    label: "ListenBrainz · This week",
    shortLabel: "LB week",
    description:
      "The most-listened-to recordings across ListenBrainz this week.",
  },
  {
    id: "listenbrainz-month",
    label: "ListenBrainz · This month",
    shortLabel: "LB month",
    description:
      "The most-listened-to recordings across ListenBrainz this month.",
  },
  {
    id: "listenbrainz-all-time",
    label: "ListenBrainz · All time",
    shortLabel: "LB all time",
    description:
      "ListenBrainz's sitewide all-time recording chart.",
  },
  {
    id: "lastfm-global",
    label: "Last.fm Global Top Tracks",
    shortLabel: "Last.fm",
    description: "The current global top-tracks chart from Last.fm.",
    requires: ["LASTFM_API_KEY"],
  },
  {
    id: "apple-top-songs",
    label: "Apple Music Top Songs",
    shortLabel: "Apple Music",
    description:
      "Apple Music's most-played songs for the configured storefront.",
    requires: ["APPLE_MUSIC_DEVELOPER_TOKEN"],
  },
] as const;

const MUSIC_SOURCE_MAP = new Map(
  MUSIC_SOURCES.map((source) => [source.id, source]),
);

export function getMusicSource(source: MusicSourceId): MusicSourceDefinition {
  const match = MUSIC_SOURCE_MAP.get(source);
  if (!match) throw new Error(`Unknown music source: ${source}`);
  return match;
}

export function getMusicBlendSources(): Exclude<MusicSourceId, "all">[] {
  return MUSIC_SOURCES.filter((source) => source.id !== "all").map(
    (source) => source.id as Exclude<MusicSourceId, "all">,
  );
}
