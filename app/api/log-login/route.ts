import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { logEvent } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await logEvent("login", "User logged in", userId);
  return NextResponse.json({ success: true });
}
