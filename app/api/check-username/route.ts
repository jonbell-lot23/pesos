import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Add reserved usernames
const RESERVED_USERNAMES = [
  "dashboard",
  "stats",
  "admin",
  "feed",
  "api",
  "settings",
  "profile",
  "login",
  "logout",
  "signup",
  "signin",
  "register",
  "auth",
  "guest",
  "post",
  "posts",
  "user",
  "users",
  "backup",
  "export",
];

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

  // Check for reserved usernames
  if (RESERVED_USERNAMES.includes(trimmed)) {
    return NextResponse.json({
      available: false,
      error: "This username is reserved",
    });
  }

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
