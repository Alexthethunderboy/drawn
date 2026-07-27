import { NextRequest, NextResponse } from "next/server";
import { rollBook } from "@/lib/books";
import {
  BOOK_SOURCE_IDS,
  type BookSourceId,
} from "@/lib/books/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isBookSource(value: string | null): value is BookSourceId {
  return BOOK_SOURCE_IDS.some((source) => source === value);
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  if (!isBookSource(source)) {
    return NextResponse.json(
      { error: "Use a supported book source.", code: "INVALID_QUERY" },
      { status: 400 },
    );
  }

  try {
    const excluded = [
      ...new Set(
        request.nextUrl.searchParams
          .getAll("exclude")
          .map((value) => value.trim())
          .filter((value) => value && value.length <= 180),
      ),
    ].slice(0, 12);
    return NextResponse.json(await rollBook(source, excluded), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unexpected book roll failure", error);
    return NextResponse.json(
      { error: "The book roll failed unexpectedly.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
