import { NextRequest, NextResponse } from "next/server";
import { MediaSourceError } from "@/lib/media/errors";
import { rollMedia } from "@/lib/media";
import {
  CATEGORIES,
  SOURCE_IDS,
  type MediaCategory,
  type SourceId,
} from "@/lib/media/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCategory(value: string | null): value is MediaCategory {
  return CATEGORIES.some((category) => category === value);
}

function isSource(value: string | null): value is SourceId {
  return SOURCE_IDS.some((source) => source === value);
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const source = request.nextUrl.searchParams.get("source");

  if (!isCategory(category) || !isSource(source)) {
    return NextResponse.json(
      {
        error:
          "Use a supported category and source, for example ?category=movies&source=all.",
        code: "INVALID_QUERY",
      },
      { status: 400 },
    );
  }

  try {
    const result = await rollMedia(category, source);
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

    console.error("Unexpected roll failure", error);
    return NextResponse.json(
      {
        error: "The roll failed unexpectedly. Try again in a moment.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
