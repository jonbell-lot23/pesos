import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({
      available: false,
      error: "No username provided",
    });
  }

  const trimmed = username.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { name: trimmed },
    });
    if (user) {
      return NextResponse.json({ available: false });
    } else {
      return NextResponse.json({ available: true });
    }
  } catch (error) {
    console.error("Error in check-username:", error);
    return NextResponse.json({
      available: false,
      error: "Internal server error",
    });
  }
}
