import { NextRequest, NextResponse } from "next/server";
import { ActivityLogger } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const {
      eventType,
      userId,
      metadata,
      ipAddress,
      userAgent,
      duration,
      success = true,
      errorMessage,
      source = "api"
    } = await request.json();

    await ActivityLogger.log({
      eventType,
      userId,
      metadata,
      ipAddress,
      userAgent,
      duration,
      success,
      errorMessage,
      source
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to log activity:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log activity" },
      { status: 500 }
    );
  }
}