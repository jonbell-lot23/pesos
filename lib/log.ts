import prisma from "@/lib/prismadb";

export async function logEvent(eventType: string, message: string, userId?: string) {
  try {
    await prisma.systemLog.create({
      data: {
        eventType,
        message,
        userId: userId || null,
      },
    });
  } catch (error) {
    console.error("[logEvent] Failed to write log", error);
  }
}
