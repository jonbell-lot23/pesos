import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ activity: [] });
  }

  // Only proceed if we're definitely in runtime (not build)
  try {
    const { auth, currentUser } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();
    const user = await currentUser();

    console.log("[activity-stats] Clerk userId:", userId);
    console.log("[activity-stats] Clerk user:", user);

    if (!userId || !user) {
      console.log("[activity-stats] No userId from auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get activity stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // First, get the local user
    console.log("[activity-stats] Looking up local user for Clerk ID:", userId);
    let localUser = await prisma.pesos_User.findUnique({
      where: { id: userId },
    });

    console.log("[activity-stats] Local user result:", localUser);

    // If no local user exists, create one
    if (!localUser) {
      console.log("[activity-stats] Creating local user for Clerk ID:", userId);
      try {
        localUser = await prisma.pesos_User.create({
          data: {
            id: userId,
            username: user.username || "user_" + userId.substring(0, 8),
          },
        });
        console.log("[activity-stats] Created local user:", localUser);
      } catch (error) {
        console.error("[activity-stats] Error creating local user:", error);
        return NextResponse.json(
          { error: "Failed to create local user" },
          { status: 500 }
        );
      }
    }

    // Get post counts by date
    console.log("[activity-stats] Fetching post stats for user:", localUser.id);
    const postStats = await prisma.pesos_items.groupBy({
      by: ["postdate"],
      where: {
        userId: localUser.id,
        postdate: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        postdate: "asc",
      },
    });

    console.log("[activity-stats] Post stats result:", postStats);

    // Get source counts by date
    console.log(
      "[activity-stats] Fetching source stats for user:",
      localUser.id
    );
    const sourceStats = await prisma.pesos_UserSources.groupBy({
      by: ["createdAt"],
      where: {
        userId: localUser.id,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        sourceId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log("[activity-stats] Source stats result:", sourceStats);

    // Format the data for the frontend
    const activity = [
      ...postStats.map((stat) => ({
        date: stat.postdate.toISOString().split("T")[0],
        count: stat._count.id,
        type: "Posts",
      })),
      ...sourceStats.map((stat) => ({
        date: stat.createdAt.toISOString().split("T")[0],
        count: stat._count.sourceId,
        type: "Sources Added",
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    console.log("[activity-stats] Final formatted activity:", activity);

    return NextResponse.json({ activity });
  } catch (error) {
    // If anything fails, just return empty activity data
    return NextResponse.json({ activity: [] });
  }
}
