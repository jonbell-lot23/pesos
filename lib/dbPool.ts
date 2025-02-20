import { Pool } from "pg";

// Supabase already provides connection pooling, so we'll use their URL
const connectionString =
  process.env.PG_CONNECTION_POOLER_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Database connection string is not configured");
}

const pool = new Pool({
  connectionString,
  max: 2, // Reduced from 3 since we're also using Prisma
  min: 0,
  idleTimeoutMillis: 3000, // Reduced from 5000
  connectionTimeoutMillis: 3000, // Reduced from 5000
  allowExitOnIdle: true,
  // Add statement timeout to prevent long-running queries
  statement_timeout: 10000, // 10 seconds
  // Add SSL configuration for Supabase
  ssl: {
    rejectUnauthorized: false, // Required for Supabase connections
  },
});

// Log pool events for better debugging
pool.on("connect", () => {
  console.log("[Pool] New client connected");
});

pool.on("error", (err) => {
  console.error("[Pool] Unexpected error on idle client", err);
});

pool.on("remove", () => {
  console.log("[Pool] Client removed from pool");
});

// Cleanup function
const cleanup = async () => {
  try {
    await pool.end();
    console.log("[Pool] All connections closed");
  } catch (err) {
    console.error("[Pool] Error during cleanup:", err);
  }
};

// Handle cleanup on app termination
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
process.on("beforeExit", cleanup);

export default pool;
