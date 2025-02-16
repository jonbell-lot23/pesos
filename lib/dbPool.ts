import { Pool } from "pg";

// Supabase already provides connection pooling, so we'll use their URL
const connectionString =
  process.env.PG_CONNECTION_POOLER_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Database connection string is not configured");
}

const pool = new Pool({
  connectionString,
  max: 3, // Reduced further since Supabase handles pooling
  min: 0,
  idleTimeoutMillis: 5000, // Reduced since Supabase handles connection management
  connectionTimeoutMillis: 5000,
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
  console.log("[Pool] Client removed");
});

// Cleanup function to be called when shutting down
async function closePool() {
  try {
    await pool.end();
    console.log("[Pool] Pool has ended");
  } catch (error) {
    console.error("[Pool] Error closing pool:", error);
  }
}

// Handle cleanup on app termination
process.on("SIGTERM", closePool);
process.on("SIGINT", closePool);

export default pool;
