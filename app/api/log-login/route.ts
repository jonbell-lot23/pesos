import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { ActivityLogger } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ipAddress =
    req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  await ActivityLogger.logUserLogin(
    userId,
    ipAddress ?? undefined,
    userAgent ?? undefined
  );
  return NextResponse.json({ success: true });
}
