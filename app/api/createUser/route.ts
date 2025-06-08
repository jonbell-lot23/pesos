// Removed NextResponse import since we're using the native Response directly.
// Import your database client or user-creation module.
// For example, if you're using Prisma:
import { NextResponse } from "next/server";
import { z } from "zod";
import { NextRequest } from "next/server";
import { ActivityLogger } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

// Modify the regex to accept both "clrk_" and "user_" prefixes.
const createUserSchema = z.object({
  username: z.string().min(1, "Username cannot be empty"),
  clerkId: z
    .string()
    .regex(/^(clrk_|user_)[0-9a-zA-Z]+$/, "Invalid clerkId format"),
});

export async function POST(request: Request) {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json(
      { message: "Not available during build" },
      { status: 503 }
    );
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;
    
    // Get client info for logging
    const { ipAddress, userAgent } = ActivityLogger.getClientInfo(request);

    const body = await request.json();
    const { username, clerkId } = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.pesos_User.findUnique({
      where: { id: clerkId },
    });

    if (existingUser) {
      // Log that an existing user tried to create an account again
      await ActivityLogger.log({
        eventType: "user_login",
        userId: clerkId,
        metadata: {
          username: existingUser.username,
          action: "attempted_duplicate_creation"
        },
        ipAddress,
        userAgent,
        source: "api"
      });

      return NextResponse.json({
        success: true,
        message: "User already exists",
        localUser: existingUser,
      });
    }

    // Check if username is already taken
    const existingUsername = await prisma.pesos_User.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existingUsername) {
      // Log failed user creation attempt due to username conflict
      await ActivityLogger.log({
        eventType: "user_created",
        userId: clerkId,
        metadata: {
          username: username.toLowerCase(),
          reason: "username_taken"
        },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: "Username is already taken",
        source: "api"
      });

      return NextResponse.json(
        {
          success: false,
          error: "Username is already taken",
        },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = await prisma.pesos_User.create({
      data: {
        id: clerkId,
        username: username.toLowerCase(),
      },
    });

    // Log successful user creation
    await ActivityLogger.logUserCreated(
      clerkId,
      {
        username: username.toLowerCase(),
        createdAt: newUser.createdAt
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      localUser: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    
    // Log failed user creation
    await ActivityLogger.log({
      eventType: "user_created",
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error"
      },
      success: false,
      errorMessage: error instanceof Error ? error.message : "Failed to create user",
      source: "api"
    });

    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}

export function GET() {
  return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
