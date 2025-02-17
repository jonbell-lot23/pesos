import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

// This will be updated by the main backup endpoint
declare global {
  var backupStatus: {
    isRunning: boolean;
    status: "idle" | "running" | "completed" | "failed";
  };
}

// Initialize global state if not exists
if (!global.backupStatus) {
  global.backupStatus = {
    isRunning: false,
    status: "idle",
  };
}

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(global.backupStatus);
  } catch (error) {
    console.error("Error checking backup status:", error);
    return NextResponse.json(
      { error: "Failed to check backup status" },
      { status: 500 }
    );
  }
}
