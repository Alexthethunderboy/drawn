import assert from "node:assert/strict";
import test from "node:test";
import { pickRandom, randomIndex } from "../lib/media/random";

test("randomIndex stays inside the requested range", () => {
  for (let iteration = 0; iteration < 2_000; iteration += 1) {
    const index = randomIndex(17);
    assert.ok(index >= 0);
    assert.ok(index < 17);
  }
});

test("random selection rejects empty pools", () => {
  assert.throws(() => pickRandom([]), RangeError);
});

test("single-item pools always return their only item", () => {
  assert.equal(pickRandom(["only"]), "only");
});
