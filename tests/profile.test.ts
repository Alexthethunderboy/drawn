import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  loginLocalProfile,
  logoutLocalProfile,
  readLocalProfileEntries,
  readLocalSession,
  registerLocalProfile,
  writeLocalProfileEntries,
} from "@/lib/profile/local";
import type { WatchlistEntry } from "@/lib/watchlist/types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: memoryStorage },
});

beforeEach(() => memoryStorage.clear());

test("local profiles register, restore, log out, and sign back in", async () => {
  const created = await registerLocalProfile("reader.one", "2468");
  assert.equal(created.username, "reader.one");
  assert.deepEqual(readLocalSession(), created);

  logoutLocalProfile();
  assert.equal(readLocalSession(), null);
  await assert.rejects(
    loginLocalProfile("reader.one", "1357"),
    /incorrect/i,
  );
  assert.deepEqual(await loginLocalProfile("READER.ONE", "2468"), created);

  const persisted = memoryStorage.getItem("drawn.profiles.v1") ?? "";
  assert.equal(persisted.includes('"2468"'), false);
});

test("local profiles reject duplicate usernames on the same device", async () => {
  await registerLocalProfile("drawn-user", "2468");
  await assert.rejects(
    registerLocalProfile("DRAWN-USER", "1357"),
    /already exists/i,
  );
});

test("saved picks persist inside the active local profile", async () => {
  const user = await registerLocalProfile("watcher", "2468");
  const entry: WatchlistEntry = {
    savedAt: "2026-07-27T20:00:00.000Z",
    item: {
      mediaKey: "tmdb:movie:550",
      id: "550",
      category: "movies",
      mediaType: "movie",
      source: "tmdb-popular",
      sourceLabel: "TMDb",
      sourceNote: "Test snapshot",
      title: "Fight Club",
      synopsis: "An insomniac meets a soap maker.",
      genres: ["Drama"],
      ratings: {},
      externalIds: {},
      sourceKind: "native",
    },
  };

  writeLocalProfileEntries(user.id, [entry]);
  assert.deepEqual(readLocalProfileEntries(user.id), [entry]);
});
