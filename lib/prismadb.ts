import { PrismaClient } from "@prisma/client";

// Use a global variable so that the client is reused in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
    // Connection pooling is handled by the underlying database connector
    // We can only configure the logging and datasource URL
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Only do this in development
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Ensure connections are properly closed when the app exits
async function cleanup() {
  if (global.prisma) {
    await global.prisma.$disconnect();
    console.log("Prisma Client disconnected");
  }
}

// Handle cleanup on app termination
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
process.on("beforeExit", cleanup);
process.on("exit", cleanup);

// Handle uncaught errors to prevent connection leaks
process.on("uncaughtException", async (e) => {
  console.error(e);
  await cleanup();
  process.exit(1);
});

process.on("unhandledRejection", async (e) => {
  console.error(e);
  await cleanup();
  process.exit(1);
});

export default prisma;
