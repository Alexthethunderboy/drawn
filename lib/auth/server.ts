import { cookies } from "next/headers";
import { ensureDb } from "@/db";
import { createRandomToken, sha256 } from "@/lib/auth/crypto";
import type { AuthUser } from "@/lib/auth/types";

// Keep the legacy cookie name so the rebrand does not sign existing users out.
const SESSION_COOKIE = "pickfilm_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionUserRow {
  id: string;
  username: string;
  expires_at: string;
}

export async function createSession(userId: string): Promise<void> {
  const db = await ensureDb();
  const token = createRandomToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  ).toISOString();

  await db.batch([
    db
      .prepare("DELETE FROM sessions WHERE expires_at <= ?")
      .bind(new Date().toISOString()),
    db
      .prepare(
        `INSERT INTO sessions (token_hash, user_id, expires_at)
         VALUES (?, ?, ?)`,
      )
      .bind(tokenHash, userId, expiresAt),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await ensureDb();
  const tokenHash = await sha256(token);
  const row = await db
    .prepare(
      `SELECT users.id, users.username, sessions.expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?`,
    )
    .bind(tokenHash)
    .first<SessionUserRow>();

  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    await db
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(tokenHash)
      .run();
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return { id: row.id, username: row.username };
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await ensureDb();
    await db
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  }
  cookieStore.delete(SESSION_COOKIE);
}
