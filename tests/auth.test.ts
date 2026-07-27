import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeUsername,
  pinValidationError,
  usernameValidationError,
} from "../lib/auth/validation";

test("usernames normalize consistently", () => {
  assert.equal(normalizeUsername("  FilmFan_24 "), "filmfan_24");
});

test("username validation accepts the supported profile format", () => {
  assert.equal(usernameValidationError("film.fan-24"), null);
  assert.notEqual(usernameValidationError("ab"), null);
  assert.notEqual(usernameValidationError("film fan"), null);
});

test("PIN validation allows only four to eight digits", () => {
  assert.equal(pinValidationError("482910"), null);
  assert.notEqual(pinValidationError("123"), null);
  assert.notEqual(pinValidationError("12a4"), null);
  assert.notEqual(pinValidationError("123456789"), null);
});
