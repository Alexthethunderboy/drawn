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
    id: "rolling-stone-500",
    label: "Rolling Stone · 500 Albums",
    shortLabel: "RS 500",
    description:
      "The complete Rolling Stone 500 Greatest Albums ranking, stored locally for reliable global discovery.",
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
