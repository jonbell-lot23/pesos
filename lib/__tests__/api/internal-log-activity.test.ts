import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../../../app/api/internal/log-activity/route';
import { createMockRequest, mockBuildEnvironment, createMockPrisma } from '../test-utils';

// Mock the ActivityLogger
vi.mock('@/lib/activity-logger', () => ({
  ActivityLogger: {
    log: vi.fn(),
  },
}));

// Mock prisma
vi.mock('@/lib/prismadb', () => ({
  default: createMockPrisma()
}));

describe('/api/internal/log-activity', () => {
  let envMock: ReturnType<typeof mockBuildEnvironment>;
  let mockActivityLogger: any;

  beforeEach(() => {
    envMock = mockBuildEnvironment();
    envMock.setTestMode();
    mockActivityLogger = require('@/lib/activity-logger').ActivityLogger;
    vi.clearAllMocks();
  });

  afterEach(() => {
    envMock.restore();
  });

  describe('POST request handling', () => {
    it('should successfully log activity with all parameters', async () => {
      const activityData = {
        eventType: 'user_login',
        userId: 'user_123',
        metadata: {
          path: '/dashboard',
          loginMethod: 'clerk'
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        duration: 150,
        success: true,
        source: 'middleware'
      };

      mockActivityLogger.log.mockResolvedValue(undefined);

      const request = createMockRequest('POST', activityData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        eventType: 'user_login',
        userId: 'user_123',
        metadata: {
          path: '/dashboard',
          loginMethod: 'clerk'
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        duration: 150,
        success: true,
        errorMessage: undefined,
        source: 'middleware'
      });
    });

    it('should handle minimal activity data with defaults', async () => {
      const activityData = {
        eventType: 'page_view'
      };

      mockActivityLogger.log.mockResolvedValue(undefined);

      const request = createMockRequest('POST', activityData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        eventType: 'page_view',
        userId: undefined,
        metadata: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        duration: undefined,
        success: true,
        errorMessage: undefined,
        source: 'api'
      });
    });

    it('should handle error logging', async () => {
      const activityData = {
        eventType: 'api_call',
        userId: 'user_123',
        success: false,
        errorMessage: 'API call failed',
        source: 'api'
      };

      mockActivityLogger.log.mockResolvedValue(undefined);

      const request = createMockRequest('POST', activityData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        eventType: 'api_call',
        userId: 'user_123',
        metadata: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        duration: undefined,
        success: false,
        errorMessage: 'API call failed',
        source: 'api'
      });
    });

    it('should handle ActivityLogger errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const activityData = {
        eventType: 'user_login',
        userId: 'user_123'
      };

      mockActivityLogger.log.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('POST', activityData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to log activity'
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to log activity:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle malformed JSON requests', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = createMockRequest('POST', undefined);
      // Mock json() to reject
      request.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to log activity'
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to log activity:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Event type validation', () => {
    it('should accept all valid event types', async () => {
      const validEventTypes = [
        'user_created',
        'user_login',
        'user_logout',
        'system_update_started',
        'system_update_completed',
        'system_update_failed',
        'feed_sync_started',
        'feed_sync_completed',
        'feed_sync_failed',
        'source_added',
        'source_removed',
        'backup_created',
        'export_requested',
        'page_view',
        'api_call'
      ];

      mockActivityLogger.log.mockResolvedValue(undefined);

      for (const eventType of validEventTypes) {
        const request = createMockRequest('POST', { eventType });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(mockActivityLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({ eventType })
        );
      }
    });
  });

  describe('Source validation', () => {
    it('should handle different source types', async () => {
      const sources = ['web', 'api', 'cron', 'system'];

      mockActivityLogger.log.mockResolvedValue(undefined);

      for (const source of sources) {
        const request = createMockRequest('POST', { 
          eventType: 'page_view',
          source 
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ success: true });
        expect(mockActivityLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({ source })
        );
      }
    });

    it('should default to "api" source when not provided', async () => {
      mockActivityLogger.log.mockResolvedValue(undefined);

      const request = createMockRequest('POST', { 
        eventType: 'page_view'
      });
      const response = await POST(request);

      expect(mockActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'api' })
      );
    });
  });
});