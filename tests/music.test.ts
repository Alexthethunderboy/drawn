import assert from "node:assert/strict";
import test from "node:test";
import {
  getMusicBlendSources,
  getMusicSource,
} from "../lib/music/config";

test("music blend includes every concrete chart exactly once", () => {
  const sources = getMusicBlendSources();
  assert.equal(new Set(sources).size, sources.length);
  assert.deepEqual(sources, [
    "listenbrainz-week",
    "listenbrainz-month",
    "listenbrainz-all-time",
    "lastfm-global",
    "apple-top-songs",
  ]);
});

test("credential-free ListenBrainz remains available by default", () => {
  assert.equal(getMusicSource("listenbrainz-week").requires, undefined);
});
