import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json(
      { message: "Not available during build" },
      { status: 503 }
    );
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;

    const { url, title, description, source, userId, sourceId } =
      await request.json();

    if (!url || !title || !userId) {
      return NextResponse.json(
        { error: "url, title, and userId are required" },
        { status: 400 }
      );
    }

    const saved = await prisma.pesos_items.create({
      data: {
        url,
        title,
        description: description || "",
        source: source || "",
        userId,
        sourceId: sourceId ? parseInt(sourceId) : null,
        postdate: new Date(),
        slug: `${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      },
    });

    return NextResponse.json({ success: true, item: saved });
  } catch (error) {
    console.error("Error saving pesos item:", error);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}
