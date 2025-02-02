import { Pool } from "pg";

// Use a connection string that points to your dedicated PG Pooler (e.g. pgBouncer).
// Fallback to DATABASE_URL if no dedicated pooler URL is provided.
const connectionString =
  process.env.PG_CONNECTION_POOLER_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  max: 10, // Maximum number of connections (adjust as needed)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Optional: Log pool errors.
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

export default pool;
