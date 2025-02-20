// Removed NextResponse import since we're using the native Response directly.
// Import your database client or user-creation module.
// For example, if you're using Prisma:
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";

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

    // Fetch Clerk user information
    const clerkUser = await clerkClient.users.getUser(clerkId);
    console.log(
      "[createUser] Fetched Clerk user publicMetadata:",
      clerkUser.publicMetadata
    );

    // Use the chosen username from publicMetadata if available, otherwise the provided username
    const finalUsername = clerkUser.publicMetadata?.chosenUsername || username;
    console.log("[createUser] Final username chosen:", finalUsername, {
      clerkUserPublicMetadata: clerkUser.publicMetadata,
    });

    // Create a new local user record using clerkId as id
    console.log("[createUser] Creating new user with:", {
      finalUsername,
      clerkId,
    });
    const newUser = await prisma.pesos_User.create({
      data: {
        id: clerkId,
        username: finalUsername,
      },
    });
    console.log("[createUser] Successfully created new user:", newUser);

    // If chosenUsername is not already set in Clerk, update it
    if (!clerkUser.publicMetadata?.chosenUsername) {
      const updateResponse = await clerkClient.users.updateUser(clerkId, {
        publicMetadata: { chosenUsername: finalUsername },
      });
      console.log(
        "[createUser] Updated Clerk publicMetadata with chosenUsername:",
        finalUsername,
        updateResponse
      );
    }

    return NextResponse.json({ success: true, localUser: newUser });
  } catch (error: any) {
    console.error("[createUser] Error creating local user:", error);
    if (error.code === "P2002") {
      console.error(
        "[createUser] Duplicate entry detected for clerkId (likely due to multiple creation attempts)."
      );
    }
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
