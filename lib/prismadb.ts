import { PrismaClient } from "@prisma/client";

// Use a global variable so that the client is reused in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query"],
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

export default prisma;
