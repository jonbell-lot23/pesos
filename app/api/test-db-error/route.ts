import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { PrismaClient } from "@prisma/client";

export async function POST() {
  try {
    // First disconnect the main client
    await prisma.$disconnect();

    // Force an error by trying to query with invalid credentials
    await prisma.$executeRawUnsafe(
      "SELECT pg_terminate_backend(pg_backend_pid())"
    );

    // This should never be reached as the above query should fail
    return NextResponse.json({ success: true });
  } catch (error) {
    // The error is expected - return 500 to trigger error handling
    console.log("[Test] Successfully broke database connection");
    return NextResponse.json(
      { success: false, error: "Database connection broken as requested" },
      { status: 500 }
    );
  }
}
