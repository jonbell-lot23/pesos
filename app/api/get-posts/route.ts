import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { clerkId } = await req.json();

    // First get the user from pesos_User table
    const user = await prisma.pesos_User.findUnique({
      where: { id: clerkId }, // clerkId maps to id in pesos_User
    });

    if (!user) {
      return NextResponse.json({ posts: [] }, { status: 200 });
    }

    // Get all posts for this user from pesos_items
    const posts = await prisma.pesos_items.findMany({
      where: {
        userId: user.id, // This matches the pesos_User id
      },
      select: {
        id: true,
        title: true,
        url: true,
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
      // Limit to recent posts first
      take: 50,
    });

    return NextResponse.json(
      {
        posts: posts.map((post) => ({
          ...post,
          sourceUrl: post.pesos_Sources?.url,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in get-posts API:", error);
    return NextResponse.json({ posts: [] }, { status: 200 });
  }
}
