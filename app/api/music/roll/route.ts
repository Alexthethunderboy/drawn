import { NextRequest, NextResponse } from "next/server";
import { MediaSourceError } from "@/lib/media/errors";
import { rollMusic } from "@/lib/music";
import {
  MUSIC_SOURCE_IDS,
  type MusicMediaType,
  type MusicSourceId,
} from "@/lib/music/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMusicSource(value: string | null): value is MusicSourceId {
  return MUSIC_SOURCE_IDS.some((source) => source === value);
}

function readExclusions(
  request: NextRequest,
  key: "exclude" | "excludeArtist",
): string[] {
  return [
    ...new Set(
      request.nextUrl.searchParams
        .getAll(key)
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 160),
    ),
  ].slice(0, 12);
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  if (!isMusicSource(source)) {
    return NextResponse.json(
      {
        error:
          "Use a supported music source, for example ?source=all.",
        code: "INVALID_QUERY",
      },
      { status: 400 },
    );
  }

  const rawMediaType = request.nextUrl.searchParams.get("mediaType") ?? "all";
  const mediaType: MusicMediaType =
    rawMediaType === "album" || rawMediaType === "track"
      ? rawMediaType
      : "all";

  try {
    const result = await rollMusic(
      source,
      {
        mediaKeys: readExclusions(request, "exclude"),
        artists: readExclusions(request, "excludeArtist"),
      },
      mediaType,
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MediaSourceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("Unexpected music roll failure", error);
    return NextResponse.json(
      {
        error: "The music roll failed unexpectedly. Try again in a moment.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
