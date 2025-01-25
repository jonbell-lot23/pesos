import { authMiddleware } from "@clerk/nextjs";

import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isSignedIn = req.cookies.get("clerkSessionId");

  if (pathname === "/" && isSignedIn) {
    return NextResponse.redirect("/feed-display");
  }

  // Ensure a NextResponse is always returned
  const response = authMiddleware();
  if (response instanceof NextResponse) {
    return response;
  }

  // Fallback response if authMiddleware does not return a NextResponse
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
    "/api/create-user",
  ],
};
