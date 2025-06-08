import prisma from "@/lib/prismadb";

export type ActivityEventType = 
  | "user_created"
  | "user_login" 
  | "user_logout"
  | "system_update_started"
  | "system_update_completed"
  | "system_update_failed"
  | "feed_sync_started"
  | "feed_sync_completed"
  | "feed_sync_failed"
  | "source_added"
  | "source_removed"
  | "backup_created"
  | "export_requested"
  | "page_view"
  | "api_call";

export type ActivitySource = "web" | "api" | "cron" | "system";

interface LogActivityParams {
  eventType: ActivityEventType;
  userId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  success?: boolean;
  errorMessage?: string;
  source?: ActivitySource;
}

export class ActivityLogger {
  static async log({
    eventType,
    userId,
    metadata,
    ipAddress,
    userAgent,
    duration,
    success = true,
    errorMessage,
    source = "web"
  }: LogActivityParams) {
    try {
      await prisma.activityLog.create({
        data: {
          eventType,
          userId,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
          ipAddress,
          userAgent,
          duration,
          success,
          errorMessage,
          source
        }
      });
    } catch (error) {
      // Fail silently for logging errors to avoid breaking the main functionality
      console.error("Failed to log activity:", error);
    }
  }

  static async logUserCreated(userId: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    return this.log({
      eventType: "user_created",
      userId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      source: "web"
    });
  }

  static async logUserLogin(userId: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      eventType: "user_login",
      userId,
      metadata: {
        loginTime: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      source: "web"
    });
  }

  static async logUserLogout(userId: string, sessionDuration?: number, ipAddress?: string, userAgent?: string) {
    return this.log({
      eventType: "user_logout",
      userId,
      duration: sessionDuration,
      metadata: {
        logoutTime: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      source: "web"
    });
  }

  static async logSystemUpdate(
    eventType: "system_update_started" | "system_update_completed" | "system_update_failed",
    metadata: {
      totalFeeds?: number;
      processedFeeds?: number;
      failedFeeds?: number;
      newItems?: number;
      executionTimeMs?: number;
      triggeredBy?: string;
      errors?: any;
      summary?: string;
    },
    success: boolean = true,
    errorMessage?: string
  ) {
    // Log to ActivityLog
    await this.log({
      eventType,
      metadata,
      success,
      errorMessage,
      source: "system",
      duration: metadata.executionTimeMs
    });

    // Also log to SystemUpdateLog if it's a completed update
    if (eventType === "system_update_completed") {
      try {
        await prisma.systemUpdateLog.create({
          data: {
            totalFeeds: metadata.totalFeeds || 0,
            processedFeeds: metadata.processedFeeds || 0,
            failedFeeds: metadata.failedFeeds || 0,
            newItems: metadata.newItems || 0,
            executionTimeMs: metadata.executionTimeMs || 0,
            triggeredBy: metadata.triggeredBy,
            errors: metadata.errors ? JSON.parse(JSON.stringify(metadata.errors)) : null,
            summary: metadata.summary
          }
        });
      } catch (error) {
        console.error("Failed to log system update:", error);
      }
    }
  }

  static async logPageView(path: string, userId?: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      eventType: "page_view",
      userId,
      metadata: {
        path,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      source: "web"
    });
  }

  static async logApiCall(endpoint: string, method: string, userId?: string, success: boolean = true, duration?: number, errorMessage?: string, ipAddress?: string) {
    return this.log({
      eventType: "api_call",
      userId,
      metadata: {
        endpoint,
        method,
        timestamp: new Date().toISOString()
      },
      success,
      duration,
      errorMessage,
      ipAddress,
      source: "api"
    });
  }

  static async logUserSession(
    action: "login" | "logout" | "session_refresh",
    userId: string,
    sessionId?: string,
    duration?: number,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.userSessionLog.create({
        data: {
          userId,
          action,
          ipAddress,
          userAgent,
          sessionId,
          duration
        }
      });
    } catch (error) {
      console.error("Failed to log user session:", error);
    }
  }

  // Helper method to get client info from request
  static getClientInfo(request?: Request | { headers: Headers }) {
    if (!request || !request.headers) return {};
    
    const headers = request.headers;
    const ipAddress = headers.get("x-forwarded-for") || 
                     headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = headers.get("user-agent") || "unknown";
    
    return { ipAddress, userAgent };
  }
}