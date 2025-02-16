import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "25");

    // Get the local user
    const localUser = await prisma.pesos_User.findUnique({
      where: { id: userId },
    });

    if (!localUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Get total count
    const total = await prisma.pesos_items.count({
      where: {
        userId: localUser.id,
      },
    });

    // Get paginated posts
    const posts = await prisma.pesos_items.findMany({
      where: {
        userId: localUser.id,
      },
      include: {
        pesos_Sources: {
          select: {
            url: true,
          },
        },
      },
      orderBy: {
        postdate: "desc",
      },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({
      posts,
      total,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
