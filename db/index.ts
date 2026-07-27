import { env } from "cloudflare:workers";

let schemaReady: Promise<D1Database> | undefined;

export function getDb(): D1Database {
  if (!env.DB) {
    throw new Error(
      "The DRAWN database is unavailable. Configure the Sites D1 binding `DB`.",
    );
  }
  return env.DB;
}

export function ensureDb(): Promise<D1Database> {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const db = getDb();
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY NOT NULL,
          username TEXT NOT NULL,
          username_normalized TEXT NOT NULL,
          pin_hash TEXT NOT NULL,
          pin_salt TEXT NOT NULL,
          failed_attempts INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_username_normalized_idx
        ON users (username_normalized)
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE INDEX IF NOT EXISTS sessions_user_id_idx
        ON sessions (user_id)
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS watchlist (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          media_key TEXT NOT NULL,
          snapshot TEXT NOT NULL,
          saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS watchlist_user_media_idx
        ON watchlist (user_id, media_key)
      `),
      db.prepare(`
        CREATE INDEX IF NOT EXISTS watchlist_user_saved_idx
        ON watchlist (user_id, saved_at)
      `),
    ]);
    return db;
  })().catch((error) => {
    schemaReady = undefined;
    throw error;
  });

  return schemaReady;
}
