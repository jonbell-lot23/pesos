import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/profile", "/admin"];
const PUBLIC_ROUTES = ["/", "/feed-selection", "/demo", "/api/check-username"];
const IGNORED_ROUTES = ["/api/check-username"];

// Helper function to log activities
async function logActivity(eventType: string, userId?: string, metadata?: any, req?: NextRequest) {
  try {
    const ipAddress = req?.ip || 
                     req?.headers.get("x-forwarded-for") || 
                     req?.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = req?.headers.get("user-agent") || "unknown";
    
    // We can't directly import ActivityLogger here due to Edge Runtime limitations
    // So we'll use a fetch call to a logging endpoint
    await fetch(new URL("/api/internal/log-activity", req?.url || "http://localhost:3000"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        userId,
        metadata,
        ipAddress,
        userAgent,
        source: "middleware"
      })
    }).catch(error => {
      console.error("Failed to log activity from middleware:", error);
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export default authMiddleware({
  publicRoutes: PUBLIC_ROUTES,
  ignoredRoutes: IGNORED_ROUTES,
  afterAuth: async (auth, req: NextRequest) => {
    if (req.nextUrl.pathname.startsWith("/api/check-username")) {
      return NextResponse.next();
    }

    const path = req.nextUrl.pathname;
    
    // Skip logging for static assets and internal API calls
    if (path.startsWith("/_next/") || 
        path.startsWith("/api/internal/") ||
        path.includes(".") && !path.startsWith("/api/")) {
      return NextResponse.next();
    }

    // Log page views for all routes
    if (auth.userId) {
      await logActivity("page_view", auth.userId, { path }, req);
      
      // Check if this is a login event (user accessing protected route)
      const isProtectedRoute = PROTECTED_ROUTES.some(route => path.startsWith(route));
      if (isProtectedRoute) {
        // Check if this might be a new session by looking at the session token age
        // Note: This is a simple heuristic, in production you might want more sophisticated session tracking
        const sessionCookie = req.cookies.get("__session");
        if (!sessionCookie || req.headers.get("referer")?.includes("clerk")) {
          await logActivity("user_login", auth.userId, { 
            path,
            loginMethod: "clerk",
            timestamp: new Date().toISOString()
          }, req);
        }
      }
    } else if (!PUBLIC_ROUTES.includes(path) && !path.startsWith("/api/")) {
      // Log anonymous page views for protected routes (before redirect)
      await logActivity("page_view", undefined, { 
        path, 
        authenticated: false 
      }, req);
    }

    return NextResponse.next();
  },
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next|api/check-username).*)",
    "/",
    "/(api|trpc)((?!check-username).*)",
  ],
};
