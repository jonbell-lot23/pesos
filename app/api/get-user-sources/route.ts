import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ sources: [] });
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;
    const { auth } = await import("@clerk/nextjs");

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user sources and then fetch the actual sources
    const userSources = await prisma.pesos_UserSources.findMany({
      where: { userId },
    });

    const sourceIds = userSources.map((us) => us.sourceId);

    const sources = await prisma.pesos_Sources.findMany({
      where: {
        id: { in: sourceIds },
      },
      select: {
        id: true,
        url: true,
        active: true,
      },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error fetching user sources:", error);
    return NextResponse.json({ sources: [] });
  }
}
