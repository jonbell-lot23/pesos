import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { feeds, userId } = await request.json();
    if (!userId || !feeds) {
      return NextResponse.json(
        { success: false, error: "Missing parameters" },
        { status: 400 }
      );
    }

    // Process each feed
    for (const feed of feeds) {
      const url = feed.url.trim();
      if (!url) continue;

      // Upsert into pesos_Sources using the feed URL
      const source = await prisma.pesos_Sources.upsert({
        where: { url },
        update: {},
        create: { url },
      });

      // Create or upsert the user-source relation (pesos_UserSources)
      await prisma.pesos_UserSources.upsert({
        where: { userId_sourceId: { userId, sourceId: source.id } },
        update: {},
        create: {
          userId,
          sourceId: source.id,
        },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error adding feeds to database", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
