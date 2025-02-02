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

  try {
    // Check if a local user record already exists
    const existingUser = await prisma.pesos_User.findUnique({
      where: { id: clerkId },
    });

    if (existingUser) {
      return NextResponse.json({ success: true, localUser: existingUser });
    }

    // Create a new local user record using clerkId as id
    const newUser = await prisma.pesos_User.create({
      data: {
        id: clerkId,
        username,
      },
    });

    return NextResponse.json({ success: true, localUser: newUser });
  } catch (error: any) {
    console.error("Error creating local user:", error);
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
