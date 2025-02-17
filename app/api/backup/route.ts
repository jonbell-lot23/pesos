import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";
import { spawn } from "child_process";

let isBackupRunning = false;
let lastBackupStatus = "idle";

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isBackupRunning) {
      return NextResponse.json(
        { error: "Backup already in progress" },
        { status: 409 }
      );
    }

    isBackupRunning = true;
    lastBackupStatus = "running";

    // Run the backup process
    const backupProcess = spawn("node", ["scripts/backup.js"], {
      stdio: "pipe",
    });

    backupProcess.on("close", (code) => {
      isBackupRunning = false;
      lastBackupStatus = code === 0 ? "completed" : "failed";
    });

    return NextResponse.json({ status: "started" });
  } catch (error) {
    isBackupRunning = false;
    lastBackupStatus = "failed";
    console.error("Error in backup:", error);
    return NextResponse.json(
      { error: "Failed to start backup" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      status: lastBackupStatus,
      isRunning: isBackupRunning,
    });
  } catch (error) {
    console.error("Error checking backup status:", error);
    return NextResponse.json(
      { error: "Failed to check backup status" },
      { status: 500 }
    );
  }
}
