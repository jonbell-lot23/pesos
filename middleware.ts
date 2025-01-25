import { authMiddleware } from "@clerk/nextjs";

import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isSignedIn = req.cookies.get("clerkSessionId");

  if (pathname === "/" && isSignedIn) {
    return NextResponse.redirect("/feed-display");
  }

  return authMiddleware(req, {
    publicRoutes: ["/", "/feed-selection"],
    ignoredRoutes: ["/api/public"],
  });
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
