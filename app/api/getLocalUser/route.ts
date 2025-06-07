import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getLocalUser(clerkId?: string) {
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

    return { localUser: user };
  } catch (error) {
    console.error("Error fetching local user:", error);
    return { localUser: null };
  }
}

export async function GET() {
  const result = await getLocalUser();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clerkId } = body;

    const result = await getLocalUser(clerkId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error parsing POST request:", error);
    return NextResponse.json({ localUser: null });
  }
}
