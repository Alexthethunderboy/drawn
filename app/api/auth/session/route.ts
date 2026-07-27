import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ user: await getCurrentUser() });
  } catch (caught) {
    console.error("Profile session lookup failed", caught);
    return NextResponse.json(
      { user: null, error: "Could not load the current profile." },
      { status: 500 },
    );
  }
}
