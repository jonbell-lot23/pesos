import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Parse the URL to get the search parameters
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  // Validate the userId exists
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Optionally: Query the database (via Prisma or another service) to check the user exists.
  // For now we'll assume the user exists and return a simple success response.
  return NextResponse.json({ success: true, userId });
}
