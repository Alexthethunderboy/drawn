import assert from "node:assert/strict";
import test from "node:test";
import {
  findRapidApiItems,
  parseRapidApiTop1000,
} from "../lib/media/providers/rapidapi";

test("findRapidApiItems handles nested provider wrappers", () => {
  const items = findRapidApiItems({
    data: { results: [{ title: "The Shawshank Redemption" }] },
  });
  assert.equal(items.length, 1);
});

test("findRapidApiItems handles dataframe-style numeric row keys", () => {
  const items = findRapidApiItems({
    0: { Series_Title: "The Shawshank Redemption" },
    1: { Series_Title: "The Godfather" },
  });
  assert.equal(items.length, 2);
});

test("IMDb proxy records normalize into the shared media contract", () => {
  const items = parseRapidApiTop1000({
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

test("IMDb Top 1000 dataset fields normalize into the shared contract", () => {
  const items = parseRapidApiTop1000([
    {
      Series_Title: "The Shawshank Redemption",
      Released_Year: "1994",
      IMDB_Rating: "9.3",
      Meta_score: "80",
      Overview: "Two imprisoned men bond over a number of years.",
      Genre: "Drama",
      Runtime: "142 min",
      Poster_Link: "https://example.com/shawshank.jpg",
    },
  ]);

  assert.equal(
    items[0]?.mediaKey,
    "imdb-top-1000:the shawshank redemption:1994",
  );
  assert.equal(items[0]?.ratings.imdb, 9.3);
  assert.equal(items[0]?.ratings.metacritic, 80);
  assert.equal(items[0]?.runtimeMinutes, 142);
  assert.deepEqual(items[0]?.genres, ["Drama"]);
});
