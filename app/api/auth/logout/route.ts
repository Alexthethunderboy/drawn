import { NextResponse } from "next/server";
import { deleteCurrentSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await deleteCurrentSession();
    return NextResponse.json({ user: null });
  } catch (caught) {
    console.error("Profile sign-out failed", caught);
    return NextResponse.json(
      { error: "Could not sign out right now." },
      { status: 500 },
    );
  }
}
