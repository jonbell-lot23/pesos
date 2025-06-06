import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // More targeted build detection
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

    const sources = await prisma.pesos_Sources.findMany({
      select: {
        id: true,
        url: true,
        active: true,
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error fetching source stats:", error);
    return NextResponse.json({ sources: [] });
  }
}
