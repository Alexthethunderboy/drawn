import { NextResponse } from "next/server";
import { ensureDb } from "@/db";
import { getCurrentUser } from "@/lib/auth/server";
import {
  isWatchlistItem,
  type WatchlistEntry,
} from "@/lib/watchlist/types";

export const dynamic = "force-dynamic";
const MAX_SNAPSHOT_BYTES = 100_000;

interface WatchlistRow {
  snapshot: string;
  saved_at: string;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Sign in before using saved picks." },
        { status: 401 },
      ),
    };
  }
  return { user };
}

export async function GET() {
  try {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;

    const db = await ensureDb();
    const result = await db
      .prepare(
        `SELECT snapshot, saved_at
         FROM watchlist
         WHERE user_id = ?
         ORDER BY saved_at DESC
         LIMIT 100`,
      )
      .bind(auth.user.id)
      .all<WatchlistRow>();

    const entries = (result.results ?? []).flatMap((row) => {
      try {
        const item: unknown = JSON.parse(row.snapshot);
        return isWatchlistItem(item)
          ? [{ item, savedAt: row.saved_at } satisfies WatchlistEntry]
          : [];
      } catch {
        return [];
      }
    });
    return NextResponse.json({ entries });
  } catch (caught) {
    console.error("Watchlist lookup failed", caught);
    return NextResponse.json(
      { error: "Could not load saved picks." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;

    const body = (await request.json()) as { item?: unknown };
    if (!isWatchlistItem(body.item)) {
      return NextResponse.json(
        { error: "A valid rolled item is required." },
        { status: 400 },
      );
    }

    const snapshot = JSON.stringify(body.item);
    if (new TextEncoder().encode(snapshot).byteLength > MAX_SNAPSHOT_BYTES) {
      return NextResponse.json(
        { error: "This item is too large to save." },
        { status: 413 },
      );
    }

    const db = await ensureDb();
    const savedAt = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO watchlist
          (id, user_id, media_key, snapshot, saved_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, media_key)
         DO UPDATE SET snapshot = excluded.snapshot, saved_at = excluded.saved_at`,
      )
      .bind(
        crypto.randomUUID(),
        auth.user.id,
        body.item.mediaKey,
        snapshot,
        savedAt,
      )
      .run();

    return NextResponse.json({
      saved: true,
      entry: { item: body.item, savedAt } satisfies WatchlistEntry,
    });
  } catch (caught) {
    console.error("Watchlist save failed", caught);
    return NextResponse.json(
      { error: "Could not save this pick." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireUser();
    if ("response" in auth) return auth.response;

    let mediaKey: string | undefined;
    try {
      const body = (await request.json()) as { mediaKey?: unknown };
      mediaKey =
        typeof body.mediaKey === "string" && body.mediaKey
          ? body.mediaKey
          : undefined;
    } catch {
      mediaKey = undefined;
    }

    const db = await ensureDb();
    if (mediaKey) {
      await db
        .prepare(
          "DELETE FROM watchlist WHERE user_id = ? AND media_key = ?",
        )
        .bind(auth.user.id, mediaKey)
        .run();
    } else {
      await db
        .prepare("DELETE FROM watchlist WHERE user_id = ?")
        .bind(auth.user.id)
        .run();
    }

    return NextResponse.json({ removed: true });
  } catch (caught) {
    console.error("Watchlist delete failed", caught);
    return NextResponse.json(
      { error: "Could not update saved picks." },
      { status: 500 },
    );
  }
}
