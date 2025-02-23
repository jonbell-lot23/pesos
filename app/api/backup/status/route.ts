import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

// Define the type to match the one in the main backup endpoint
type BackupStatus = {
  isRunning: boolean;
  status: "idle" | "running" | "completed" | "failed";
  lastError: string | null;
};

// This will be updated by the main backup endpoint
declare global {
  var backupStatus: BackupStatus | undefined;
}

// Initialize global state if not exists
if (!global.backupStatus) {
  global.backupStatus = {
    isRunning: false,
    status: "idle",
    lastError: null,
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      global.backupStatus || {
        isRunning: false,
        status: "idle",
        lastError: null,
      }
    );
  } catch (error) {
    console.error("Error checking backup status:", error);
    return NextResponse.json(
      { error: "Failed to check backup status" },
      { status: 500 }
    );
  }
}
