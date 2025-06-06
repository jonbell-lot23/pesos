import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ exists: false });
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;

    const { clerkId } = await request.json();

    if (!clerkId) {
      return NextResponse.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const user = await prisma.pesos_User.findUnique({
      where: { id: clerkId },
    });

    return NextResponse.json({ exists: !!user, user });
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json({ exists: false });
  }
}
