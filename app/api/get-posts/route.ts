import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;

    // Destructure clerkId and username from the request body
    const { clerkId, username } = await req.json();

    console.log("[get-posts] Request payload:", { clerkId, username });

    // First, let's see all users in the database
    const allUsers = await prisma.pesos_User.findMany();
    console.log("[get-posts] All users in database:", allUsers);

    // Find the user in the pesos_User table by clerkId
    const user = await prisma.pesos_User.findUnique({
      where: { id: clerkId },
    });

    console.log("[get-posts] Found user:", user);
    console.log("[get-posts] Received username:", username);
    console.log("[get-posts] Database username:", user?.username);

    // Check if user exists and if the mapped username matches the provided username
    if (!user) {
      console.warn("[get-posts] No user found for clerkId", clerkId);
      return NextResponse.json(
        { allowed: false, posts: [], error: "no_user" },
        { status: 200 }
      );
    }

    if (user.username.toLowerCase() !== username.toLowerCase()) {
      console.warn(
        "[get-posts] Username mismatch:",
        "\nDB username:",
        user.username.toLowerCase(),
        "\nProvided username:",
        username.toLowerCase()
      );
      return NextResponse.json(
        { allowed: false, posts: [], error: "username_mismatch" },
        { status: 200 }
      );
    }

    // Get all posts for this user from pesos_items
    const posts = await prisma.pesos_items.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        url: true,
        slug: true,
        postdate: true,
        sourceId: true,
        // Optionally include source info
        pesos_Sources: {
          select: {
            url: true,
          },
        },
      },
      orderBy: {
        postdate: "desc",
      },
    });

    console.log("[get-posts] Number of posts found:", posts.length);

    return NextResponse.json(
      {
        allowed: true,
        posts: posts.map((post) => ({
          ...post,
          sourceUrl: post.pesos_Sources?.url,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in get-posts API:", error);
    return NextResponse.json({ allowed: false, posts: [] }, { status: 200 });
  }
}
