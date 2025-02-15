import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { clerkId } = await req.json();
    // Look up the local user record using the Clerk user ID.
    const localUser = await prisma.pesos_User.findUnique({
      where: { id: clerkId },
    });
    return NextResponse.json({ localUser });
  } catch (error: any) {
    console.error("Error in getLocalUser:", error);

    // Check if it's a database connection error
    if (
      error.name === "PrismaClientInitializationError" ||
      error.message.includes("Can't reach database server")
    ) {
      return NextResponse.json(
        {
          error:
            "Database connection error: Unable to reach the database server. Please try again later.",
          code: "DATABASE_CONNECTION_ERROR",
        },
        { status: 500 }
      );
    }

    // Handle other Prisma errors
    if (error.name?.includes("Prisma")) {
      return NextResponse.json(
        {
          error:
            "Database error: Something went wrong with the database operation.",
          code: "DATABASE_ERROR",
        },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
