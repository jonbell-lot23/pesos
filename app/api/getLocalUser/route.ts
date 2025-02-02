import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { clerkId } = await req.json();
    // Look up the local user record using the Clerk user ID.
    const localUser = await prisma.pesos_User.findUnique({
      where: { id: clerkId },
    });
    return NextResponse.json({ localUser });
  } catch (error) {
    console.error("Error in getLocalUser:", error);
    return NextResponse.json(
      { error: "Failed to fetch local user" },
      { status: 500 }
    );
  }
}
