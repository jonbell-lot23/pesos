import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prismadb";

export async function POST(req: NextRequest) {
  try {
    // Destructure clerkId and username from the request body
    const { clerkId, username } = await req.json();

    // Find the user in the pesos_User table by clerkId
    const user = await prisma.pesos_User.findUnique({
      where: { id: clerkId },
    });

    console.log("[get-posts] Found user:", user);

    // Check if user exists and if the mapped username matches the provided username
    if (!user) {
      console.warn("[get-posts] No user found for clerkId", clerkId);
      return NextResponse.json({ allowed: false, posts: [] }, { status: 200 });
    }

    if (user.username.toLowerCase() !== username.toLowerCase()) {
      console.warn(
        "[get-posts] Username mismatch: mapped username (",
        user.username,
        ") vs provided (",
        username,
        ")"
      );
      return NextResponse.json({ allowed: false, posts: [] }, { status: 200 });
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
      take: 50,
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
