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
    return NextResponse.json({ posts: [] });
  }

  try {
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await prisma.pesos_items.findMany({
      where: { userId },
      orderBy: { postdate: "desc" },
      take: 50,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ posts: [] });
  }
}
