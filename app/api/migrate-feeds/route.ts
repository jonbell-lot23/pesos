import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { feeds } = await request.json();

    if (!Array.isArray(feeds)) {
      return NextResponse.json(
        { error: "Invalid feeds format" },
        { status: 400 }
      );
    }

    // Process each feed URL
    const results = await Promise.all(
      feeds.map(async (feedUrl: string) => {
        // Find or create the source
        const source = await prisma.pesos_Sources.upsert({
          where: { url: feedUrl },
          update: {},
          create: { url: feedUrl },
        });

        // Create the user-source relationship
        await prisma.pesos_UserSources.create({
          data: {
            userId,
            sourceId: source.id,
          },
        });

        return source;
      })
    );

    return NextResponse.json({ success: true, sources: results });
  } catch (error) {
    console.error("Error migrating feeds:", error);
    return NextResponse.json(
      { error: "Failed to migrate feeds" },
      { status: 500 }
    );
  }
}
