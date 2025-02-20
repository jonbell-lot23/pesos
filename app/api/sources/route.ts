import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "../../../lib/prismadb";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all sources for the user
    const userSources = await prisma.pesos_UserSources.findMany({
      where: { userId },
      include: {
        source: true,
      },
    });

    return NextResponse.json({
      sources: userSources.map((us) => us.source),
    });
  } catch (error) {
    console.error("Error fetching sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // First try to find an existing source
    const existingSource = await prisma.pesos_Sources.findUnique({
      where: { url },
    });

    let source;
    if (existingSource) {
      source = existingSource;
      console.log("Found existing source:", source);
    } else {
      // Create new source with explicit ID sequence
      source = await prisma.pesos_Sources.create({
        data: { url },
      });
      console.log("Created new source:", source);
    }

    // Now handle the user-source relationship
    const existingRelation = await prisma.pesos_UserSources.findUnique({
      where: {
        userId_sourceId: {
          userId,
          sourceId: source.id,
        },
      },
    });

    if (!existingRelation) {
      await prisma.pesos_UserSources.create({
        data: {
          userId,
          sourceId: source.id,
        },
      });
      console.log("Created new user-source relationship");
    } else {
      console.log("User-source relationship already exists");
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Error in POST /api/sources:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || "Failed to create source" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
