import { ActivityLogger, ActivityEventType } from "@/lib/activity-logger";

export async function logEvent(
  eventType: ActivityEventType,
  message: string,
  userId?: string
) {
  try {
    await ActivityLogger.log({
      eventType,
      metadata: { message },
      userId,
      source: "system",
    });
  } catch (error) {
    console.error("[logEvent] Failed to write log", error);
  }
}
