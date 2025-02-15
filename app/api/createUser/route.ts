// Removed NextResponse import since we're using the native Response directly.
// Import your database client or user-creation module.
// For example, if you're using Prisma:
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Modify the regex to accept both "clrk_" and "user_" prefixes.
const createUserSchema = z.object({
  username: z.string().min(1, "Username cannot be empty"),
  clerkId: z
    .string()
    .regex(/^(clrk_|user_)[0-9a-zA-Z]+$/, "Invalid clerkId format"),
});

export async function POST(req: Request) {
  const { username, clerkId } = await req.json();
  console.log("[createUser] Received request with:", { username, clerkId });

  try {
    // Check if a local user record already exists
    console.log(
      "[createUser] Checking for existing user with clerkId:",
      clerkId
    );
    const existingUser = await prisma.pesos_User.findUnique({
      where: { id: clerkId },
    });
    console.log("[createUser] Existing user check result:", existingUser);

    if (existingUser) {
      console.log("[createUser] Found existing user, returning");
      return NextResponse.json({ success: true, localUser: existingUser });
    }

    // Create a new local user record using clerkId as id
    console.log("[createUser] Creating new user with:", { username, clerkId });
    const newUser = await prisma.pesos_User.create({
      data: {
        id: clerkId,
        username,
      },
    });
    console.log("[createUser] Successfully created new user:", newUser);

    return NextResponse.json({ success: true, localUser: newUser });
  } catch (error: any) {
    console.error("[createUser] Error creating local user:", error);
    console.error("[createUser] Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    return NextResponse.json(
      { success: false, error: error.message },
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
