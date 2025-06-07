import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function checkUsernameAvailability(username: string) {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return { available: true };
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;

    if (!username) {
      return { error: "Username is required", available: false };
    }

    const existingUser = await prisma.pesos_User.findUnique({
      where: { username: username.toLowerCase() },
    });

    return { available: !existingUser };
  } catch (error) {
    console.error("Error checking username:", error);
    return { available: false, error: "Database error" };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  const result = await checkUsernameAvailability(username);

  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    const result = await checkUsernameAvailability(username);

    if (result.error) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error parsing request:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
}
