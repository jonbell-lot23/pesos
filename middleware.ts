import { authMiddleware } from "@clerk/nextjs";

import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export default authMiddleware({
  publicRoutes: ["/", "/feed-selection", "/demo", "/api/check-username"],
  ignoredRoutes: ["/api/check-username"],
  afterAuth: (auth, req: NextRequest) => {
    if (req.nextUrl.pathname.startsWith("/api/check-username")) {
      return NextResponse.next();
    }
    return undefined;
  },
});

export const config = {
  matcher: [
    "/((?!.+.[w]+$|_next|api/check-username).*)",
    "/",
    "/(api|trpc)((?!check-username).*)",
  ],
};
