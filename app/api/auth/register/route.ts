import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { createRandomToken, hashPin } from "@/lib/auth/crypto";
import { readCredentials } from "@/lib/auth/request";
import { createSession } from "@/lib/auth/server";
import { normalizeUsername } from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { credentials, error } = await readCredentials(request);
  if (!credentials) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const db = await ensureDb();
    const usernameNormalized = normalizeUsername(credentials.username);
    const existing = await db
      .prepare("SELECT id FROM users WHERE username_normalized = ?")
      .bind(usernameNormalized)
      .first();
    if (existing) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 },
      );
    }

    const id = crypto.randomUUID();
    const salt = createRandomToken(16);
    const pinHash = await hashPin(credentials.pin, salt);
    await db
      .prepare(
        `INSERT INTO users
          (id, username, username_normalized, pin_hash, pin_salt)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        credentials.username,
        usernameNormalized,
        pinHash,
        salt,
      )
      .run();

    await createSession(id);
    return NextResponse.json(
      { user: { id, username: credentials.username } },
      { status: 201 },
    );
  } catch (caught) {
    if (String(caught).toLowerCase().includes("unique")) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 },
      );
    }
    console.error("Local profile registration failed", caught);
    return NextResponse.json(
      { error: "Could not create the profile right now." },
      { status: 500 },
    );
  }
}
