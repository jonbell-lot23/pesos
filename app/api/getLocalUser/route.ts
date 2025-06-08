import { NextRequest, NextResponse } from "next/server";
import { ActivityLogger } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

async function getLocalUser(clerkId?: string, request?: NextRequest) {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return { localUser: null };
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;

    let userId = clerkId;

    // If no clerkId provided, try to get from auth
    if (!userId) {
      const { auth } = await import("@clerk/nextjs");
      const authResult = auth();
      userId = authResult.userId || undefined;
    }

    if (!userId) {
      return { localUser: null };
    }

    const user = await prisma.pesos_User.findUnique({
      where: { id: userId },
    });

    // Log successful user authentication/verification if user exists
    if (user && request) {
      const { ipAddress, userAgent } = ActivityLogger.getClientInfo(request);
      await ActivityLogger.log({
        eventType: "user_login",
        userId: user.id,
        metadata: {
          username: user.username,
          verificationMethod: "getLocalUser",
          timestamp: new Date().toISOString()
        },
        ipAddress,
        userAgent,
        source: "api"
      });
    }

    return { localUser: user };
  } catch (error) {
    console.error("Error fetching local user:", error);
    return { localUser: null };
  }
}

export async function GET(request: NextRequest) {
  const result = await getLocalUser(undefined, request);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const { clerkId } = await request.json();
    const result = await getLocalUser(clerkId, request);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ localUser: null });
  }
}
