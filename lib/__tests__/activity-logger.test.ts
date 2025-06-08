import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivityLogger } from '../activity-logger';
import { createMockPrisma } from './test-utils';

// Mock the prisma import
vi.mock('@/lib/prismadb', () => ({
  default: createMockPrisma()
}));

describe('ActivityLogger', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = require('@/lib/prismadb').default;
    vi.clearAllMocks();
  });

  describe('Basic logging functionality', () => {
    it('should log a basic activity', async () => {
      const logData = {
        eventType: 'page_view' as const,
        userId: 'user_123',
        metadata: { path: '/dashboard' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        source: 'web' as const
      };

      mockPrisma.activityLog.create.mockResolvedValue({
        id: 1,
        timestamp: new Date(),
        ...logData,
        success: true,
        duration: null,
        errorMessage: null
      });

      await ActivityLogger.log(logData);

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'page_view',
          userId: 'user_123',
          metadata: { path: '/dashboard' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          duration: undefined,
          success: true,
          errorMessage: undefined,
          source: 'web'
        }
      });
    });

    it('should handle logging errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPrisma.activityLog.create.mockRejectedValue(new Error('Database error'));

      await ActivityLogger.log({
        eventType: 'page_view',
        userId: 'user_123'
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to log activity:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('User login logging', () => {
    it('should log user login events', async () => {
      const userId = 'user_123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      mockPrisma.activityLog.create.mockResolvedValue({
        id: 1,
        timestamp: new Date(),
        eventType: 'user_login',
        userId,
        ipAddress,
        userAgent,
        success: true,
        metadata: { loginTime: expect.any(String) },
        duration: null,
        errorMessage: null,
        source: 'web'
      });

      await ActivityLogger.logUserLogin(userId, ipAddress, userAgent);

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'user_login',
          userId,
          metadata: {
            loginTime: expect.any(String)
          },
          ipAddress,
          userAgent,
          duration: undefined,
          success: true,
          errorMessage: undefined,
          source: 'web'
        }
      });
    });

    it('should log user logout events with session duration', async () => {
      const userId = 'user_123';
      const sessionDuration = 1800000; // 30 minutes in ms
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      mockPrisma.activityLog.create.mockResolvedValue({
        id: 2,
        timestamp: new Date(),
        eventType: 'user_logout',
        userId,
        duration: sessionDuration,
        ipAddress,
        userAgent,
        success: true,
        metadata: { logoutTime: expect.any(String) },
        errorMessage: null,
        source: 'web'
      });

      await ActivityLogger.logUserLogout(userId, sessionDuration, ipAddress, userAgent);

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'user_logout',
          userId,
          duration: sessionDuration,
          metadata: {
            logoutTime: expect.any(String)
          },
          ipAddress,
          userAgent,
          success: true,
          errorMessage: undefined,
          source: 'web'
        }
      });
    });
  });

  describe('User creation logging', () => {
    it('should log user creation events', async () => {
      const userId = 'user_123';
      const metadata = {
        username: 'testuser',
        createdAt: new Date()
      };
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      mockPrisma.activityLog.create.mockResolvedValue({
        id: 3,
        timestamp: new Date(),
        eventType: 'user_created',
        userId,
        metadata: { ...metadata, timestamp: expect.any(String) },
        ipAddress,
        userAgent,
        success: true,
        duration: null,
        errorMessage: null,
        source: 'web'
      });

      await ActivityLogger.logUserCreated(userId, metadata, ipAddress, userAgent);

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'user_created',
          userId,
          metadata: {
            ...metadata,
            timestamp: expect.any(String)
          },
          ipAddress,
          userAgent,
          duration: undefined,
          success: true,
          errorMessage: undefined,
          source: 'web'
        }
      });
    });
  });

  describe('System update logging with renamed tables', () => {
    it('should log completed system updates to both ActivityLog and pesos_SystemUpdateLog', async () => {
      const metadata = {
        totalFeeds: 10,
        processedFeeds: 8,
        failedFeeds: 2,
        newItems: 5,
        executionTimeMs: 5000,
        triggeredBy: 'cron',
        summary: 'System update completed successfully'
      };

      mockPrisma.activityLog.create.mockResolvedValue({
        id: 4,
        timestamp: new Date(),
        eventType: 'system_update_completed',
        metadata,
        success: true,
        duration: 5000,
        userId: null,
        ipAddress: null,
        userAgent: null,
        errorMessage: null,
        source: 'system'
      });

      mockPrisma.pesos_SystemUpdateLog.create.mockResolvedValue({
        id: 1,
        timestamp: new Date(),
        ...metadata,
        errors: null
      });

      await ActivityLogger.logSystemUpdate(
        'system_update_completed',
        metadata,
        true
      );

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'system_update_completed',
          metadata,
          success: true,
          errorMessage: undefined,
          source: 'system',
          duration: 5000,
          userId: undefined,
          ipAddress: undefined,
          userAgent: undefined
        }
      });

      expect(mockPrisma.pesos_SystemUpdateLog.create).toHaveBeenCalledWith({
        data: {
          totalFeeds: 10,
          processedFeeds: 8,
          failedFeeds: 2,
          newItems: 5,
          executionTimeMs: 5000,
          triggeredBy: 'cron',
          errors: null,
          summary: 'System update completed successfully'
        }
      });
    });

    it('should log failed system updates only to ActivityLog', async () => {
      const metadata = {
        totalFeeds: 10,
        processedFeeds: 3,
        failedFeeds: 7,
        executionTimeMs: 2000,
        triggeredBy: 'manual',
        errors: ['Feed timeout', 'Invalid RSS']
      };

      mockPrisma.activityLog.create.mockResolvedValue({
        id: 5,
        timestamp: new Date(),
        eventType: 'system_update_failed',
        metadata,
        success: false,
        duration: 2000,
        userId: null,
        ipAddress: null,
        userAgent: null,
        errorMessage: 'System update failed',
        source: 'system'
      });

      await ActivityLogger.logSystemUpdate(
        'system_update_failed',
        metadata,
        false,
        'System update failed'
      );

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'system_update_failed',
          metadata,
          success: false,
          errorMessage: 'System update failed',
          source: 'system',
          duration: 2000,
          userId: undefined,
          ipAddress: undefined,
          userAgent: undefined
        }
      });

      // Should not create pesos_SystemUpdateLog for failed updates
      expect(mockPrisma.pesos_SystemUpdateLog.create).not.toHaveBeenCalled();
    });

    it('should handle errors when logging to pesos_SystemUpdateLog', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPrisma.activityLog.create.mockResolvedValue({
        id: 6,
        timestamp: new Date(),
        eventType: 'system_update_completed',
        metadata: {},
        success: true,
        duration: null,
        userId: null,
        ipAddress: null,
        userAgent: null,
        errorMessage: null,
        source: 'system'
      });

      mockPrisma.pesos_SystemUpdateLog.create.mockRejectedValue(new Error('SystemUpdateLog error'));

      await ActivityLogger.logSystemUpdate('system_update_completed', {});

      expect(consoleSpy).toHaveBeenCalledWith('Failed to log system update:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('User session logging', () => {
    it('should log user session events to UserSessionLog', async () => {
      const userId = 'user_123';
      const sessionId = 'session_456';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      mockPrisma.userSessionLog.create.mockResolvedValue({
        id: 1,
        timestamp: new Date(),
        userId,
        action: 'login',
        ipAddress,
        userAgent,
        sessionId,
        duration: null
      });

      await ActivityLogger.logUserSession(
        'login',
        userId,
        sessionId,
        undefined,
        ipAddress,
        userAgent
      );

      expect(mockPrisma.userSessionLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: 'login',
          ipAddress,
          userAgent,
          sessionId,
          duration: undefined
        }
      });
    });

    it('should handle UserSessionLog errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPrisma.userSessionLog.create.mockRejectedValue(new Error('Session log error'));

      await ActivityLogger.logUserSession('login', 'user_123');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to log user session:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('API call logging', () => {
    it('should log API call events', async () => {
      const endpoint = '/api/get-posts';
      const method = 'POST';
      const userId = 'user_123';
      const duration = 150;
      const ipAddress = '192.168.1.1';

      mockPrisma.activityLog.create.mockResolvedValue({
        id: 7,
        timestamp: new Date(),
        eventType: 'api_call',
        userId,
        metadata: { endpoint, method, timestamp: expect.any(String) },
        ipAddress,
        userAgent: null,
        duration,
        success: true,
        errorMessage: null,
        source: 'api'
      });

      await ActivityLogger.logApiCall(
        endpoint,
        method,
        userId,
        true,
        duration,
        undefined,
        ipAddress
      );

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'api_call',
          userId,
          metadata: {
            endpoint,
            method,
            timestamp: expect.any(String)
          },
          success: true,
          duration,
          errorMessage: undefined,
          ipAddress,
          source: 'api'
        }
      });
    });
  });

  describe('Client info extraction', () => {
    it('should extract client info from request headers', () => {
      const mockRequest = {
        headers: {
          get: vi.fn()
            .mockReturnValueOnce('203.0.113.1, 192.168.1.1') // x-forwarded-for
            .mockReturnValueOnce('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        }
      };

      const result = ActivityLogger.getClientInfo(mockRequest as any);

      expect(result).toEqual({
        ipAddress: '203.0.113.1, 192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
    });

    it('should handle missing headers gracefully', () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      };

      const result = ActivityLogger.getClientInfo(mockRequest as any);

      expect(result).toEqual({
        ipAddress: 'unknown',
        userAgent: 'unknown'
      });
    });

    it('should return empty object for invalid request', () => {
      const result = ActivityLogger.getClientInfo(null as any);
      expect(result).toEqual({});
    });
  });
});