import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { Prisma } from "@prisma/client";

interface Feed {
  url: string;
}

interface RequestData {
  feeds: Feed[];
  userId: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { feeds, userId } = body as RequestData;

    if (!userId || !feeds || !Array.isArray(feeds)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid parameters" },
        { status: 400 }
      );
    }

    // Process feeds in batches to avoid overwhelming the connection pool
    const BATCH_SIZE = 5;
    const results = [];

    for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
      const batch = feeds.slice(i, i + BATCH_SIZE);

      // Process each batch in parallel with transaction protection
      const batchResults = await Promise.all(
        batch.map(async (feed: Feed) => {
          const url = feed.url?.trim();
          if (!url) return null;

          try {
            // Use transaction to ensure atomicity
            return await prisma.$transaction(
              async (tx) => {
                // Upsert into pesos_Sources using the feed URL
                const source = await tx.pesos_Sources.upsert({
                  where: { url },
                  update: {},
                  create: { url },
                });

                // Create or upsert the user-source relation
                await tx.pesos_UserSources.upsert({
                  where: { userId_sourceId: { userId, sourceId: source.id } },
                  update: {},
                  create: {
                    userId,
                    sourceId: source.id,
                  },
                });

                return source;
              },
              {
                maxWait: 5000, // Maximum time to wait for transaction
                timeout: 10000, // Maximum time for the transaction to complete
              }
            );
          } catch (error) {
            console.error(`Error processing feed ${url}:`, error);
            return null;
          }
        })
      );

      results.push(...batchResults.filter(Boolean));

      // Add a small delay between batches
      if (i + BATCH_SIZE < feeds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      sources: results,
      processedCount: results.length,
      totalFeeds: feeds.length,
    });
  } catch (error) {
    console.error("Error adding feeds to database", error);

    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { success: false, error: "Duplicate feed URLs found" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
