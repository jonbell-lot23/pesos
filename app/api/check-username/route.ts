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
    return NextResponse.json({ available: true });
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;

    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.pesos_User.findUnique({
      where: { username: username.toLowerCase() },
    });

    return NextResponse.json({ available: !existingUser });
  } catch (error) {
    console.error("Error checking username:", error);
    return NextResponse.json({ available: false });
  }
}
