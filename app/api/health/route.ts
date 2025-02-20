import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import pool from "@/lib/dbPool";

// Keep track of recent errors
const errorHistory = {
  lastError: null as string | null,
  errorCount: 0,
  lastErrorTime: null as Date | null,
  resetTime: new Date(),
};

// Reset error count every hour
setInterval(() => {
  errorHistory.errorCount = 0;
  errorHistory.resetTime = new Date();
}, 60 * 60 * 1000);

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
    lastError: errorHistory.lastError,
    errorCount: errorHistory.errorCount,
    lastErrorTime: errorHistory.lastErrorTime?.toISOString() || null,
    resetTime: errorHistory.resetTime.toISOString(),
  };

  let prismaError = null;
  let poolError = null;

  try {
    // Check Prisma connection with timeout
    const prismaPromise = Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Prisma connection timeout")), 5000)
      ),
    ]);
    await prismaPromise;
    healthStatus.prisma = true;
  } catch (error) {
    console.error("[Health] Prisma connection failed:", error);
    prismaError =
      error instanceof Error ? error.message : "Unknown Prisma error";
    healthStatus.lastError = prismaError;
    errorHistory.lastError = prismaError;
    errorHistory.lastErrorTime = new Date();
    errorHistory.errorCount++;
  }

  try {
    // Check pool connection with timeout
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      healthStatus.pool = true;

      // Get pool stats
      const poolStatus = await client.query(`
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
    poolError = error instanceof Error ? error.message : "Unknown pool error";
    healthStatus.lastError = poolError;
    errorHistory.lastError = poolError;
    errorHistory.lastErrorTime = new Date();
    errorHistory.errorCount++;
  }

  // More stringent health check criteria
  const isHealthy =
    healthStatus.prisma &&
    healthStatus.pool &&
    healthStatus.poolStats.waitingCount === 0 &&
    errorHistory.errorCount < 3; // Consider unhealthy if we've had multiple errors recently

  // Log health check results with more detail
  console.log("[Health] Check completed:", {
    healthy: isHealthy,
    prisma: {
      connected: healthStatus.prisma,
      error: prismaError,
    },
    pool: {
      connected: healthStatus.pool,
      error: poolError,
      stats: healthStatus.poolStats,
    },
    errorHistory: {
      count: errorHistory.errorCount,
      lastError: errorHistory.lastError,
      lastErrorTime: errorHistory.lastErrorTime,
    },
  });

  // If we're not healthy, return 503 status
  const status = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      details: healthStatus,
      recommendations: !isHealthy
        ? [
            errorHistory.errorCount >= 3
              ? "Multiple connection errors detected - consider restarting the application"
              : null,
            healthStatus.poolStats.waitingCount > 0
              ? "High number of waiting connections - check for connection leaks"
              : null,
            !healthStatus.prisma
              ? "Prisma connection failed - check database connectivity"
              : null,
            !healthStatus.pool
              ? "Pool connection failed - check database connectivity"
              : null,
          ].filter(Boolean)
        : [],
    },
    { status }
  );
}
