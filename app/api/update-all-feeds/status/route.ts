import { NextResponse } from "next/server";
import { headers } from "next/headers";

// Define the type to match the one in the main update endpoint
type UpdateStatus = {
  isRunning: boolean;
  status: "idle" | "running" | "completed" | "failed";
  lastError: string | null;
  lastRun: Date | null;
  logs: string[];
  failedFeeds: Record<string, { url: string, failedAt: Date, error: string }>;
};

// This will be updated by the main update endpoint
declare global {
  var updateStatus: UpdateStatus | undefined;
}

// Initialize global state if not exists
if (!global.updateStatus) {
  global.updateStatus = {
    isRunning: false,
    status: "idle",
    lastError: null,
    lastRun: null,
    logs: [],
    failedFeeds: {},
  };
}

export async function GET(request: Request) {
  // Get the manual parameter from the URL
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get("manual") === "true";

  // If it's a manual request from the dashboard, don't require auth
  if (!isManual) {
    // Check if this is a cron job request
    const headersList = headers();
    const authorization = headersList.get("authorization");
    const isCronRequest =
      authorization === `Bearer ${process.env.CRON_SECRET_TOKEN}`;

    if (!isCronRequest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.json(
    global.updateStatus || {
      isRunning: false,
      status: "idle",
      lastError: null,
      lastRun: null,
      logs: [],
      failedFeeds: {},
    }
  );
}
