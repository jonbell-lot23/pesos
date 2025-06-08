import { NextResponse } from "next/server";
import { ActivityLogger } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Create some sample activity logs for testing
    const sampleUserId = "user_sample123";
    
    // Log some user activities
    await ActivityLogger.logUserCreated(sampleUserId, {
      username: "testuser",
      source: "manual_test"
    }, "127.0.0.1", "Test User Agent");
    
    await ActivityLogger.logUserLogin(sampleUserId, "127.0.0.1", "Test User Agent");
    
    // Log some system activities
    await ActivityLogger.logSystemUpdate(
      "system_update_completed",
      {
        totalFeeds: 25,
        processedFeeds: 25,
        failedFeeds: 2,
        newItems: 47,
        executionTimeMs: 15432,
        triggeredBy: "cron",
        summary: "Sample system update for testing"
      },
      true
    );
    
    // Log some page views
    await ActivityLogger.logPageView("/dashboard", sampleUserId, "127.0.0.1", "Test User Agent");
    await ActivityLogger.logPageView("/feed-selection", sampleUserId, "127.0.0.1", "Test User Agent");
    
    // Log some API calls
    await ActivityLogger.logApiCall("/api/get-posts", "GET", sampleUserId, true, 234, undefined, "127.0.0.1");
    await ActivityLogger.logApiCall("/api/add-source", "POST", sampleUserId, false, 156, "Source URL is invalid", "127.0.0.1");
    
    // Log some general activities
    await ActivityLogger.log({
      eventType: "source_added",
      userId: sampleUserId,
      metadata: {
        sourceUrl: "https://example.com/feed.xml",
        sourceType: "RSS"
      },
      ipAddress: "127.0.0.1",
      userAgent: "Test User Agent",
      success: true,
      source: "web"
    });
    
    await ActivityLogger.log({
      eventType: "export_requested",
      userId: sampleUserId,
      metadata: {
        exportType: "JSON",
        itemCount: 156
      },
      ipAddress: "127.0.0.1",
      userAgent: "Test User Agent",
      duration: 2341,
      success: true,
      source: "web"
    });

    return NextResponse.json({
      success: true,
      message: "Test activity logs created successfully"
    });

  } catch (error) {
    console.error("Error creating test logs:", error);
    return NextResponse.json(
      { error: "Failed to create test logs" },
      { status: 500 }
    );
  }
}