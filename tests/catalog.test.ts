import assert from "node:assert/strict";
import test from "node:test";
import curatedLists from "../data/curated-lists.json";
import { fetchCuratedMediaCandidates } from "../lib/media/providers/curated";
import { fetchRollingStoneAlbums } from "../lib/music/providers/rolling-stone";

function assertExactRanks(
  items: readonly { rank: number }[],
  first: number,
  last: number,
) {
  assert.equal(items.length, last - first + 1);
  assert.deepEqual(
    items.map((item) => item.rank),
    Array.from({ length: last - first + 1 }, (_, index) => first + index),
  );
}

test("browser-extracted lists retain complete rank order", () => {
  assertExactRanks(curatedLists.sources.letterboxdFilms.items, 1, 250);
  assertExactRanks(curatedLists.sources.rottenTomatoesAnime.items, 1, 100);
  assertExactRanks(curatedLists.sources.imdbAnimated.items, 1, 35);
  assertExactRanks(curatedLists.sources.rottenTomatoesDocs.items, 1, 100);
  assertExactRanks(curatedLists.sources.letterboxdDocs.items, 1, 250);
  assertExactRanks(curatedLists.sources.goodreadsBestsellers.items, 1, 100);
  assertExactRanks(curatedLists.sources.greatestBooksPage2.items, 26, 50);
  assertExactRanks(curatedLists.sources.rollingStoneAlbums.items, 1, 500);
});

test("curated media providers expose the complete local lists", () => {
  assert.equal(
    fetchCuratedMediaCandidates("letterboxd-most-fans").length,
    250,
  );
  assert.equal(fetchCuratedMediaCandidates("rt-anime-movies").length, 100);
  assert.equal(fetchCuratedMediaCandidates("imdb-animated-movies").length, 35);
  assert.equal(fetchCuratedMediaCandidates("rt-documentaries").length, 100);
  assert.equal(
    fetchCuratedMediaCandidates("letterboxd-documentaries").length,
    250,
  );
});

test("Rolling Stone albums are sorted from rank 1 through 500", () => {
  const albums = fetchRollingStoneAlbums();
  assert.equal(albums.length, 500);
  assert.equal(albums[0]?.rank, 1);
  assert.equal(albums.at(-1)?.rank, 500);
  assert.equal(albums[0]?.mediaType, "album");
});
