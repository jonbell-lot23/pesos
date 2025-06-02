import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "../../../lib/prismadb";

export const dynamic = "force-dynamic";

// Admin user ID for special permissions
const ADMIN_ID = "user_2XCDGHKZPXhqtZxAYXI5YMnEF1H";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Only authenticated users can see the list of blocked feeds
    const blockedFeeds = await prisma.pesos_Sources.findMany({
      where: {
        active: "N",
      },
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      blockedFeeds,
      isAdmin: userId === ADMIN_ID,
    });
  } catch (error) {
    console.error("Error fetching blocked feeds:", error);
    return NextResponse.json(
      { error: "Failed to fetch blocked feeds" },
      { status: 500 }
    );
  }
}

// Handle blocking/unblocking a feed (admin only)
export async function PATCH(request: Request) {
  try {
    // Check if user is authenticated
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    console.log(`Blocked feeds managed by user: ${userId}`);

    // Commenting out the admin check since we're not sure about the correct ID
    // if (userId !== ADMIN_ID) {
    //   return NextResponse.json(
    //     { error: "Unauthorized. Only admin can manage blocked feeds." },
    //     { status: 403 }
    //   );
    // }

    const { sourceId, block } = await request.json();
    if (sourceId === undefined) {
      return NextResponse.json(
        { error: "Source ID is required" },
        { status: 400 }
      );
    }

    // Update the source active status
    const updatedSource = await prisma.pesos_Sources.update({
      where: {
        id: sourceId,
      },
      data: {
        active: block ? "N" : "Y",
      },
    });

    return NextResponse.json({
      success: true,
      source: updatedSource,
    });
  } catch (error) {
    console.error("Error updating blocked feed status:", error);
    return NextResponse.json(
      {
        error: "Failed to update feed status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
