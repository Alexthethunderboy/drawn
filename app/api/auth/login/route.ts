import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { constantTimeEqual, hashPin } from "@/lib/auth/crypto";
import { readCredentials } from "@/lib/auth/request";
import { createSession } from "@/lib/auth/server";
import { normalizeUsername } from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  username: string;
  pin_hash: string;
  pin_salt: string;
  failed_attempts: number;
  locked_until: string | null;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
  const { credentials, error } = await readCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const db = await ensureDb();
    const row = await db
      .prepare(
        `SELECT id, username, pin_hash, pin_salt, failed_attempts, locked_until
         FROM users
         WHERE username_normalized = ?`,
      )
      .bind(normalizeUsername(credentials.username))
      .first<UserRow>();

    if (!row) {
      return NextResponse.json(
        { error: "Username or PIN is incorrect." },
        { status: 401 },
      );
    }

    if (row.locked_until && Date.parse(row.locked_until) > Date.now()) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    }

    const attemptedHash = await hashPin(credentials.pin, row.pin_salt);
    if (!constantTimeEqual(attemptedHash, row.pin_hash)) {
      const attempts = row.failed_attempts + 1;
      const lockedUntil =
        attempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : null;
      await db
        .prepare(
          `UPDATE users
           SET failed_attempts = ?, locked_until = ?
           WHERE id = ?`,
        )
        .bind(
          lockedUntil ? 0 : attempts,
          lockedUntil,
          row.id,
        )
        .run();
      return NextResponse.json(
        {
          error: lockedUntil
            ? "Too many attempts. Try again in 15 minutes."
            : "Username or PIN is incorrect.",
        },
        { status: lockedUntil ? 429 : 401 },
      );
    }

    await db
      .prepare(
        `UPDATE users
         SET failed_attempts = 0, locked_until = NULL
         WHERE id = ?`,
      )
      .bind(row.id)
      .run();
    await createSession(row.id);

    return NextResponse.json({
      user: { id: row.id, username: row.username },
    });
  } catch (caught) {
    console.error("Local profile sign-in failed", caught);
    return NextResponse.json(
      { error: "Could not sign in right now." },
      { status: 500 },
    );
  }
}
