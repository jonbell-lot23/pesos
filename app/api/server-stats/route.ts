import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";

export const dynamic = "force-dynamic";

// Your Clerk ID to exclude from stats
const ADMIN_ID = "user_2XCDGHKZPXhqtZxAYXI5YMnEF1H";

export async function GET() {
  try {
    // Get total number of users (excluding admin)
    const totalUsers = await prisma.pesos_User.count({
      where: {
        NOT: {
          id: ADMIN_ID,
        },
      },
    });

    // Get number of users with no RSS feeds (excluding admin)
    const usersWithNoFeeds = await prisma.pesos_User.count({
      where: {
        NOT: {
          id: ADMIN_ID,
        },
        sources: {
          none: {},
        },
      },
    });

    // Get total number of sources (excluding admin's sources)
    const totalSources = await prisma.pesos_Sources.count({
      where: {
        users: {
          none: {
            userId: ADMIN_ID,
          },
        },
      },
    });

    // Get total number of items (excluding admin's items)
    const totalItems = await prisma.pesos_items.count({
      where: {
        NOT: {
          userId: ADMIN_ID,
        },
      },
    });

    return NextResponse.json({
      totalUsers,
      usersWithNoFeeds,
      totalSources,
      totalItems,
    });
  } catch (error) {
    console.error("Error fetching server stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch server statistics" },
      { status: 500 }
    );
  }
}
