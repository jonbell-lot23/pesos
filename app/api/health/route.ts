import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import pool from "@/lib/dbPool";

export async function GET() {
  const healthStatus = {
    prisma: false,
    pool: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check Prisma connection
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.prisma = true;
  } catch (error) {
    console.error("[Health] Prisma connection failed:", error);
  }

  try {
    // Check pool connection
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      healthStatus.pool = true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Health] Pool connection failed:", error);
  }

  const isHealthy = healthStatus.prisma && healthStatus.pool;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      details: healthStatus,
    },
    {
      status: isHealthy ? 200 : 503,
    }
  );
}
