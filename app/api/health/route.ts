import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import pool from "@/lib/dbPool";

export async function GET() {
  const healthStatus = {
    prisma: false,
    pool: false,
    poolStats: {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    },
    timestamp: new Date().toISOString(),
    lastError: null as string | null,
  };

  try {
    // Check Prisma connection
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.prisma = true;
  } catch (error) {
    console.error("[Health] Prisma connection failed:", error);
    healthStatus.lastError =
      error instanceof Error ? error.message : "Unknown Prisma error";
  }

  try {
    // Check pool connection and get stats
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      healthStatus.pool = true;

      // Get pool stats
      const poolStatus = await pool.query(`
        SELECT count(*) as total,
               sum(case when state = 'idle' then 1 else 0 end) as idle,
               sum(case when state = 'active' then 1 else 0 end) as active,
               sum(case when state = 'waiting' then 1 else 0 end) as waiting
        FROM pg_stat_activity 
        WHERE application_name LIKE '%pooler%'
      `);

      if (poolStatus.rows[0]) {
        healthStatus.poolStats = {
          totalCount: parseInt(poolStatus.rows[0].total) || 0,
          idleCount: parseInt(poolStatus.rows[0].idle) || 0,
          waitingCount: parseInt(poolStatus.rows[0].waiting) || 0,
        };
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Health] Pool connection failed:", error);
    healthStatus.lastError =
      error instanceof Error ? error.message : "Unknown pool error";
  }

  const isHealthy = healthStatus.prisma && healthStatus.pool;

  // Log health check results
  console.log("[Health] Check completed:", {
    healthy: isHealthy,
    prisma: healthStatus.prisma,
    pool: healthStatus.pool,
    poolStats: healthStatus.poolStats,
    lastError: healthStatus.lastError,
  });

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
