import { authMiddleware } from "@clerk/nextjs";

import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export default authMiddleware();

export const config = {
  matcher: [
    "/app/auth/(.*)",
    "/app/auth-placeholder/(.*)",
    "/app/confirmation/(.*)",
    "/app/feed-display/(.*)",
    "/app/feed-selection/(.*)",
    "/app/profile/(.*)",
    "/app/setup-complete/(.*)",
    "/(api|trpc)(.*)",
  ],
};
