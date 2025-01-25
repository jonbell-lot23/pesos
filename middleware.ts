import { authMiddleware } from "@clerk/nextjs";

import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export default authMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
