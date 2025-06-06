// Removed NextResponse import since we're using the native Response directly.
// Import your database client or user-creation module.
// For example, if you're using Prisma:
import { NextResponse } from "next/server";
import { z } from "zod";
import { NextRequest } from "next/server";

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
    const { auth } = await import("@clerk/nextjs");
    const { clerkClient } = await import("@clerk/nextjs/server");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.pesos_User.findUnique({
      where: { id: userId },
    });

    if (existingUser) {
      return NextResponse.json({
        created: false,
        message: "User already exists",
        user: existingUser,
      });
    }

    // Create new user
    const newUser = await prisma.pesos_User.create({
      data: {
        id: userId,
        username: username.toLowerCase(),
      },
    });

    return NextResponse.json({
      created: true,
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
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
