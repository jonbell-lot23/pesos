import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;
    const { auth } = await import("@clerk/nextjs");

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }

    const posts = await prisma.pesos_items.findMany({
      where: {
        sourceId: parseInt(sourceId),
      },
      orderBy: {
        postdate: "desc",
      },
      take: 20,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts by source:", error);
    return NextResponse.json({ posts: [] });
  }
}
