import { NextRequest, NextResponse } from "next/server";
import type { MediaItem } from "@/lib/media/types";
import type { TrackItem } from "@/lib/music/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WatchlistItem = MediaItem | TrackItem;

function isMediaItem(value: unknown): value is WatchlistItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WatchlistItem>;
  return Boolean(
    item.mediaKey &&
      item.title &&
      item.category &&
      item.source &&
      item.mediaType,
  );
}

function watchlistArtwork(item: WatchlistItem): string | undefined {
  return item.mediaType === "track" ? item.artworkUrl : item.posterUrl;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Add the two NEXT_PUBLIC_SUPABASE variables.",
      },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in before saving a title." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const item =
    body && typeof body === "object" && "item" in body
      ? (body as { item: unknown }).item
      : undefined;
  if (!isMediaItem(item)) {
    return NextResponse.json(
      { error: "A valid rolled media item is required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("watchlist")
    .upsert(
      {
        user_id: user.id,
        media_key: item.mediaKey,
        title: item.title,
        media_type: item.mediaType,
        category: item.category,
        source: item.source,
        source_label: item.sourceLabel,
        year: "year" in item ? item.year ?? null : null,
        synopsis: item.synopsis,
        poster_url: watchlistArtwork(item) ?? null,
        external_url: item.externalUrl ?? null,
        external_ids: item.externalIds,
        ratings: item.ratings,
        snapshot: item,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,media_key" },
    )
    .select("id, media_key, created_at")
    .single();

  if (error) {
    console.error("Watchlist insert failed", error);
    return NextResponse.json(
      { error: "Could not save this title to your watchlist." },
      { status: 500 },
    );
  }

  return NextResponse.json({ saved: true, watchlistItem: data });
}
