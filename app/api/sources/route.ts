import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    // Create or find the source
    const source = await prisma.pesos_Sources.upsert({
      where: { url },
      update: {},
      create: { url },
    });

    // Create the user-source relationship if it doesn't exist
    await prisma.pesos_UserSources.create({
      data: {
        userId,
        sourceId: source.id,
      },
    });

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Error creating source:", error);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}
