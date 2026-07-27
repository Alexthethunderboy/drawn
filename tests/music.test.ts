import assert from "node:assert/strict";
import test from "node:test";
import {
  getMusicBlendSources,
  getMusicSource,
} from "../lib/music/config";
import {
  applyMusicExclusions,
  groupTracksByArtist,
} from "../lib/music/selection";
import type { TrackItem } from "../lib/music/types";

function track(
  mediaKey: string,
  artist: string,
  title: string,
): TrackItem {
  return {
    id: mediaKey,
    mediaKey,
    artist,
    title,
    genres: [],
    stats: {},
    externalIds: {},
    source: "listenbrainz-week",
    sourceLabel: "LB week",
    sourceNote: "Test chart",
    mediaType: "track",
    category: "music",
    synopsis: `${title} by ${artist}.`,
    ratings: {},
  };
}

test("music blend includes every concrete chart exactly once", () => {
  const sources = getMusicBlendSources();
  assert.equal(new Set(sources).size, sources.length);
  assert.deepEqual(sources, [
    "rolling-stone-500",
    "listenbrainz-week",
    "listenbrainz-month",
    "listenbrainz-all-time",
  ]);
});

test("the local Rolling Stone chart requires no credentials", () => {
  assert.equal(getMusicSource("rolling-stone-500").requires, undefined);
});

test("credential-free ListenBrainz remains available by default", () => {
  assert.equal(getMusicSource("listenbrainz-week").requires, undefined);
});

test("artist balancing gives a chart-flooding artist only one bucket", () => {
  const buckets = groupTracksByArtist([
    track("bts:1", "BTS", "One"),
    track("bts:2", "BTS", "Two"),
    track("bts:3", "bts", "Three"),
    track("radiohead:1", "Radiohead", "Four"),
  ]);

  assert.equal(buckets.length, 2);
  assert.deepEqual(
    buckets.map((bucket) => bucket.length).sort(),
    [1, 3],
  );
});

test("recent tracks and artists are excluded when alternatives exist", () => {
  const candidates = [
    track("bts:1", "BTS", "One"),
    track("radiohead:1", "Radiohead", "Two"),
    track("bjork:1", "Björk", "Three"),
  ];
  const eligible = applyMusicExclusions(candidates, {
    mediaKeys: ["radiohead:1"],
    artists: ["BTS"],
  });

  assert.deepEqual(eligible.map((item) => item.artist), ["Björk"]);
});

test("artist exclusions relax before exact-track exclusions", () => {
  const candidates = [
    track("bts:1", "BTS", "One"),
    track("radiohead:1", "Radiohead", "Two"),
  ];
  const eligible = applyMusicExclusions(candidates, {
    mediaKeys: ["bts:1"],
    artists: ["BTS", "Radiohead"],
  });

  assert.deepEqual(eligible.map((item) => item.mediaKey), ["radiohead:1"]);
});
