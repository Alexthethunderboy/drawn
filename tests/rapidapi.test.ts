import assert from "node:assert/strict";
import test from "node:test";
import {
  findRapidApiItems,
  parseRapidApiTop250,
} from "../lib/media/providers/rapidapi";

test("findRapidApiItems handles nested provider wrappers", () => {
  const items = findRapidApiItems({
    data: { results: [{ title: "The Shawshank Redemption" }] },
  });
  assert.equal(items.length, 1);
});

test("IMDb proxy records normalize into the shared media contract", () => {
  const items = parseRapidApiTop250({
    results: [
      {
        rank: 1,
        title: "The Shawshank Redemption",
        imdb_id: "tt0111161",
        rating: "9.3",
        year: "1994",
      },
    ],
  });

  assert.equal(items[0]?.mediaKey, "imdb:tt0111161");
  assert.equal(items[0]?.ratings.imdb, 9.3);
  assert.equal(items[0]?.rank, 1);
});
