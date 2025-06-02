import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

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

    // Process feeds in batches to avoid overwhelming the connection pool
    const BATCH_SIZE = 5;
    const results = [];

    for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
      const batch = feeds.slice(i, i + BATCH_SIZE);

      // Process each batch in parallel, but with transaction protection
      const batchResults = await Promise.all(
        batch.map(async (feedUrl: string) => {
          // Use transaction to ensure atomicity
          return prisma.$transaction(
            async (tx) => {
              try {
                // Find or create the source
                const source = await tx.pesos_Sources.upsert({
                  where: { url: feedUrl },
                  update: {},
                  create: { url: feedUrl },
                });

                // Create the user-source relationship
                await tx.pesos_UserSources.upsert({
                  where: {
                    userId_sourceId: {
                      userId,
                      sourceId: source.id,
                    },
                  },
                  update: {},
                  create: {
                    userId,
                    sourceId: source.id,
                  },
                });

                return source;
              } catch (error) {
                // Log the error but don't fail the entire batch
                console.error(`Error processing feed ${feedUrl}:`, error);
                return null;
              }
            },
            {
              maxWait: 5000, // Maximum time to wait for transaction
              timeout: 10000, // Maximum time for the transaction to complete
            }
          );
        })
      );

      results.push(...batchResults.filter(Boolean));

      // Add a small delay between batches to prevent overwhelming the connection pool
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
    console.error("Error migrating feeds:", error);

    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Duplicate feed URLs found" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to migrate feeds" },
      { status: 500 }
    );
  }
}
