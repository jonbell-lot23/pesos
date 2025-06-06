import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json(
      { error: "Not available during build" },
      { status: 503 }
    );
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;
    const { Prisma } = await import("@prisma/client");
    const { auth } = await import("@clerk/nextjs");

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      // Check if source already exists
      const existingSource = await prisma.pesos_Sources.findFirst({
        where: { url },
      });

      if (existingSource) {
        // Check if user already has this source
        const userSource = await prisma.pesos_UserSources.findFirst({
          where: {
            userId,
            sourceId: existingSource.id,
          },
        });

        if (userSource) {
          return NextResponse.json(
            {
              error: "Source already exists in your feed",
              sourceId: existingSource.id,
            },
            { status: 409 }
          );
        }

        // Add existing source to user's feed
        await prisma.pesos_UserSources.create({
          data: {
            userId,
            sourceId: existingSource.id,
          },
        });

        return NextResponse.json({
          message: "Source added to your feed",
          sourceId: existingSource.id,
        });
      }

      // Create new source
      const newSource = await prisma.pesos_Sources.create({
        data: {
          url,
          active: "Y",
        },
      });

      // Add to user's sources
      await prisma.pesos_UserSources.create({
        data: {
          userId,
          sourceId: newSource.id,
        },
      });

      return NextResponse.json({
        message: "New source created and added to your feed",
        sourceId: newSource.id,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return NextResponse.json(
            {
              error: "Source already exists",
            },
            { status: 409 }
          );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Error adding source:", error);
    return NextResponse.json(
      {
        error: "Failed to add source",
      },
      { status: 500 }
    );
  }
}
