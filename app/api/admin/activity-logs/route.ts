import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const eventType = searchParams.get("eventType");
    const userId = searchParams.get("userId");
    const success = searchParams.get("success");
    const source = searchParams.get("source");
    const days = parseInt(searchParams.get("days") || "7");

    // Calculate date filter
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Build where clause
    const where: Prisma.ActivityLogWhereInput = {
      timestamp: {
        gte: since,
      },
    };

    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;
    if (success !== null && success !== undefined)
      where.success = success === "true";
    if (source) where.source = source;

    // Fetch activity logs
    const [logs, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: {
          timestamp: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Get summary statistics
    const [
      totalUsers,
      totalLogins,
      recentSystemUpdates,
      errorCount,
      eventTypeCounts,
      userCounts,
      sourceCounts,
    ] = await Promise.all([
      // Total unique users
      prisma.activityLog.count({
        where: {
          eventType: "user_created",
          timestamp: { gte: since },
        },
      }),

      // Total logins in period
      prisma.activityLog.count({
        where: {
          eventType: "user_login",
          timestamp: { gte: since },
        },
      }),

      // Recent system updates
      prisma.pesos_SystemUpdateLog.findMany({
        where: {
          timestamp: { gte: since },
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 10,
      }),

      // Error count
      prisma.activityLog.count({
        where: {
          success: false,
          timestamp: { gte: since },
        },
      }),

      // Event type breakdown
      prisma.activityLog.groupBy({
        by: ["eventType"],
        where: {
          timestamp: { gte: since },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      }),

      // User activity breakdown (top 10 most active users)
      prisma.activityLog.groupBy({
        by: ["userId"],
        where: {
          userId: { not: null },
          timestamp: { gte: since },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      }),

      // Source breakdown
      prisma.activityLog.groupBy({
        by: ["source"],
        where: {
          timestamp: { gte: since },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      }),
    ]);

    return NextResponse.json({
      logs,
      totalCount,
      stats: {
        newUsers: totalUsers,
        totalLogins,
        errorCount,
        systemUpdates: recentSystemUpdates.length,
        period: `Last ${days} days`,
      },
      breakdowns: {
        eventTypes: eventTypeCounts.map(
          (et: { eventType: string; _count: { id: number } }) => ({
            eventType: et.eventType,
            count: et._count.id,
          })
        ),
        users: userCounts.map(
          (uc: { userId: string | null; _count: { id: number } }) => ({
            userId: uc.userId || "unknown",
            count: uc._count.id,
          })
        ),
        sources: sourceCounts.map(
          (sc: { source: string | null; _count: { id: number } }) => ({
            source: sc.source || "unknown",
            count: sc._count.id,
          })
        ),
      },
      recentSystemUpdates,
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
