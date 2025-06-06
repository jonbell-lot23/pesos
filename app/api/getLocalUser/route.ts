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
    return NextResponse.json({ user: null });
  }

  try {
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.pesos_User.findUnique({
      where: { id: userId },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching local user:", error);
    return NextResponse.json({ user: null });
  }
}
