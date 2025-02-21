import pg from "pg";
const { Client } = pg;

console.log("🔍 Starting database connection test...");

// Log environment check
console.log("📊 Environment check:");
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL?.replace(/(.*?:\/\/.*?:).*?@/, "$1[HIDDEN]@")
);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  // Add a longer timeout
  connectionTimeoutMillis: 10000,
  // Add SSL requirement for Supabase
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    console.log("🔌 Attempting to connect...");
    await client.connect();
    console.log("✅ Successfully connected to database!");

    console.log("🔍 Testing simple query...");
    const result = await client.query("SELECT NOW() as current_time");
    console.log(
      "✅ Query successful! Current database time:",
      result.rows[0].current_time
    );

    console.log("🔍 Testing table access...");
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(
      "📋 Available tables:",
      tablesResult.rows.map((row) => row.table_name)
    );
  } catch (error) {
    console.error("❌ Error occurred:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.code) console.error("Error code:", error.code);
    if (error.detail) console.error("Error detail:", error.detail);
    console.error("Full error:", error);
    console.error("Stack trace:", error.stack);
  } finally {
    console.log("👋 Closing connection...");
    await client.end();
    console.log("✅ Connection closed");
  }
}

// Run the test
testConnection().catch((error) => {
  console.error("🚨 Unhandled error:", error);
  process.exit(1);
});
