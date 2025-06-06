import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";

// This route should only run during runtime, not during build
export const dynamic = "force-dynamic";
export const runtime = "edge";
export const preferredRegion = "iad1";

// Disable static generation for this route
export const generateStaticParams = () => {
  return [];
};

export async function GET() {
  try {
    // Call the update-all-feeds endpoint
    const response = await fetch("http://localhost:3000/api/update-all-feeds", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Log the results to console for monitoring
    console.log("[Cron] Feed update completed:", data.message);

    return NextResponse.json({
      success: true,
      message: data.message,
      stats: data.stats,
    });
  } catch (error) {
    console.error("[Cron] Error updating feeds:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
