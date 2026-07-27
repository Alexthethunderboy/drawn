import assert from "node:assert/strict";
import test from "node:test";
import { parseLocalWatchlist } from "../lib/watchlist/local";

test("local watchlist safely ignores missing and malformed data", () => {
  assert.deepEqual(parseLocalWatchlist(null), []);
  assert.deepEqual(parseLocalWatchlist("not json"), []);
  assert.deepEqual(parseLocalWatchlist('{"item":"not-an-array"}'), []);
});

test("local watchlist keeps valid saved media snapshots", () => {
  const entries = parseLocalWatchlist(
    JSON.stringify([
      {
        savedAt: "2026-07-27T12:00:00.000Z",
        item: {
          mediaKey: "imdb:tt0111161",
          title: "The Shawshank Redemption",
          category: "movies",
          mediaType: "movie",
          source: "imdb-top-1000",
        },
      },
      {
        savedAt: 123,
        item: {
          mediaKey: "invalid",
          title: "Invalid timestamp",
          category: "movies",
          mediaType: "movie",
          source: "imdb-top-1000",
        },
      },
    ]),
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.item.mediaKey, "imdb:tt0111161");
});
