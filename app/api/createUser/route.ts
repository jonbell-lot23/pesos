// Removed NextResponse import since we're using the native Response directly.
// Import your database client or user-creation module.
// For example, if you're using Prisma:
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Modify the regex to accept both "clrk_" and "user_" prefixes.
const createUserSchema = z.object({
  username: z.string().min(1, "Username cannot be empty"),
  clerkId: z
    .string()
    .regex(/^(clrk_|user_)[0-9a-zA-Z]+$/, "Invalid clerkId format"),
});

export async function POST(req: NextRequest) {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({
      created: false,
      message: "Not available during build",
    });
  }

  try {
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { username } = body;

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
        username: username,
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
      {
        created: false,
        message: "Failed to create user",
      },
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
