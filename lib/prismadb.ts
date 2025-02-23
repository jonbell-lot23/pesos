import { PrismaClient } from "@prisma/client";

// Track active clients for cleanup
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  var _prismaClients: PrismaClient[];
}

if (!global._prismaClients) {
  global._prismaClients = [];
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: ["error", "warn"],
    // Connection pooling is handled by the underlying database connector
    // We can only configure the logging and datasource URL
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Track this client for cleanup
  if (process.env.NODE_ENV === "development") {
    global._prismaClients.push(client);
  }

  return client;
}

const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV === "development") {
  global.prisma = prisma;
}

// Cleanup function that handles all tracked clients
async function cleanup() {
  if (process.env.NODE_ENV === "development" && global._prismaClients) {
    console.log(
      `[Prisma] Cleaning up ${global._prismaClients.length} clients...`
    );
    await Promise.all(
      global._prismaClients.map(async (client) => {
        try {
          await client.$disconnect();
        } catch (e) {
          console.error("[Prisma] Error disconnecting client:", e);
        }
      })
    );
    global._prismaClients = [];
    console.log("[Prisma] All clients disconnected");
  } else if (global.prisma) {
    await global.prisma.$disconnect();
    console.log("[Prisma] Client disconnected");
  }
}

// Remove any existing listeners to prevent duplicates
[
  "SIGTERM",
  "SIGINT",
  "beforeExit",
  "exit",
  "uncaughtException",
  "unhandledRejection",
].forEach((event) => {
  process.removeAllListeners(event);
});

// Set higher max listeners to prevent warnings
process.setMaxListeners(20);

// Handle cleanup on app termination
process.once("SIGTERM", cleanup);
process.once("SIGINT", cleanup);
process.once("beforeExit", cleanup);
process.once("exit", cleanup);

// Handle uncaught errors to prevent connection leaks
process.once("uncaughtException", async (e) => {
  console.error(e);
  await cleanup();
  process.exit(1);
});

process.once("unhandledRejection", async (e) => {
  console.error(e);
  await cleanup();
  process.exit(1);
});

export default prisma;
