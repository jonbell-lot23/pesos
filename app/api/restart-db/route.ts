import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // First disconnect Prisma
    await prisma.$disconnect();

    // Create a new pool connection to test direct database access
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      // Short timeouts to fail fast if there's an issue
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
    });

    try {
      // Test the pool connection
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        client.release();
      }
      // Clean up the test pool
      await pool.end();
    } catch (poolError) {
      console.error("Pool connection test failed:", poolError);
      throw new Error("Database pool connection failed");
    }

    // Now try to reconnect Prisma
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to restart database connection:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to restart database connection. The database might be temporarily unavailable - please try again in a few minutes.",
      },
      { status: 500 }
    );
  }
}
