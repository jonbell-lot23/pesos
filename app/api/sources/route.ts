import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "../../../lib/prismadb";

export const dynamic = "force-dynamic";

// Admin user ID for special permissions
const ADMIN_ID = "user_2XCDGHKZPXhqtZxAYXI5YMnEF1H";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      console.warn("[sources/GET] No userId from auth");
      return NextResponse.json(
        { error: "Unauthorized", code: "NO_USER" },
        { status: 401 }
      );
    }

    // Get all sources for the user
    const userSources = await prisma.pesos_UserSources.findMany({
      where: { userId },
      include: {
        source: true,
      },
    });

    // Check if any sources are disabled (active="N")
    const hasDisabledSources = userSources.some(
      (us) => us.source.active === "N"
    );

    // Get the URLs of disabled sources
    const disabledSources = userSources
      .filter((us) => us.source.active === "N")
      .map((us) => us.source.url);

    return NextResponse.json({
      sources: userSources.map((us) => us.source),
      hasDisabledSources,
      disabledSources,
    });
  } catch (error) {
    console.error("[sources/GET] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("Auth") || error.message.includes("auth")) {
        return NextResponse.json(
          {
            error: "Authentication error - please try again",
            code: "AUTH_ERROR",
          },
          { status: 401 }
        );
      }

      if (error.name?.includes("Prisma")) {
        return NextResponse.json(
          {
            error: "Database error - please try again later",
            code: "DB_ERROR",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch sources", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      console.warn("[sources/POST] No userId from auth");
      return NextResponse.json(
        { error: "Unauthorized", code: "NO_USER" },
        { status: 401 }
      );
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json(
        { error: "URL is required", code: "MISSING_URL" },
        { status: 400 }
      );
    }

    // First try to find an existing source
    const existingSource = await prisma.pesos_Sources.findUnique({
      where: { url },
    });

    let source;
    if (existingSource) {
      source = existingSource;
      console.log("[sources/POST] Found existing source:", source);
    } else {
      // Create new source with explicit ID sequence
      source = await prisma.pesos_Sources.create({
        data: { url },
      });
      console.log("[sources/POST] Created new source:", source);
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
      console.log("[sources/POST] Created new user-source relationship");
    } else {
      console.log("[sources/POST] User-source relationship already exists");
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error("[sources/POST] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("Auth") || error.message.includes("auth")) {
        return NextResponse.json(
          {
            error: "Authentication error - please try again",
            code: "AUTH_ERROR",
          },
          { status: 401 }
        );
      }

      if (error.name?.includes("Prisma")) {
        return NextResponse.json(
          {
            error: "Database error - please try again later",
            code: "DB_ERROR",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "An unexpected error occurred", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
