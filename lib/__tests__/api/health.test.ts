import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '../../../app/api/health/route';
import { createMockPrisma, createMockDbPool, mockBuildEnvironment, timeUtils, errorUtils } from '../test-utils';
import { apiFixtures } from '../fixtures';

// Mock modules
vi.mock('@/lib/prismadb', () => ({ default: {} }));
vi.mock('@/lib/dbPool', () => ({ default: {}, withRetry: vi.fn() }));

describe('/api/health', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockPool: ReturnType<typeof createMockDbPool>;
  let envMock: ReturnType<typeof mockBuildEnvironment>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockPool = createMockDbPool();
    envMock = mockBuildEnvironment();

    // Set up successful mocks by default
    mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
    mockPool.mockClient.query.mockResolvedValue({ rows: [{ total: 5, idle: 3, active: 2, waiting: 0 }] });

    // Mock the imports
    vi.doMock('@/lib/prismadb', () => ({ default: mockPrisma }));
    vi.doMock('@/lib/dbPool', () => ({ 
      default: mockPool,
      withRetry: vi.fn((callback) => callback(mockPool.mockClient))
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    timeUtils.restoreTime();
    envMock.restore();
  });

  describe('Build-time checks', () => {
    it('should return build-time response when NEXT_PHASE is phase-production-build', async () => {
      envMock.setBuildMode();

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ status: 'ok', message: 'Build time check' });
    });

    it('should return build-time response when BUILDING is true', async () => {
      process.env.BUILDING = 'true';
      process.env.NEXT_PHASE = '';

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ status: 'ok', message: 'Build time check' });
    });

    it('should return build-time response in production without DATABASE_URL', async () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_URL = undefined;
      delete process.env.DATABASE_URL;

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ status: 'ok', message: 'Build time check' });
    });
  });

  describe('Healthy system', () => {
    it('should return healthy status when all systems are working', async () => {
      envMock.setTestMode();

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.details.prisma).toBe(true);
      expect(data.details.pool).toBe(true);
      expect(data.details.poolStats.waitingCount).toBe(0);
      expect(data.details.errorCount).toBe(0);
    });

    it('should include correct pool statistics', async () => {
      envMock.setTestMode();
      mockPool.mockClient.query.mockResolvedValue({
        rows: [{ total: 10, idle: 6, active: 4, waiting: 0 }]
      });

      const response = await GET();
      const data = await response.json();

      expect(data.details.poolStats).toEqual({
        totalCount: 10,
        idleCount: 6,
        waitingCount: 0,
      });
    });
  });

  describe('Database failures', () => {
    it('should handle Prisma connection failure', async () => {
      envMock.setTestMode();
      const dbError = errorUtils.simulateDatabaseError('Connection refused');
      mockPrisma.$queryRaw.mockRejectedValue(dbError);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.details.prisma).toBe(false);
      expect(data.details.lastError).toBe('Connection refused');
    });

    it('should handle pool connection failure', async () => {
      envMock.setTestMode();
      const poolError = errorUtils.simulateNetworkError('Pool exhausted');
      
      vi.doMock('@/lib/dbPool', () => ({ 
        default: mockPool,
        withRetry: vi.fn().mockRejectedValue(poolError)
      }));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.details.pool).toBe(false);
      expect(data.details.lastError).toBe('Pool exhausted');
    });

    it('should handle Prisma timeout', async () => {
      envMock.setTestMode();
      // Mock a slow Prisma query that times out
      mockPrisma.$queryRaw.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Prisma connection timeout')), 10)
        )
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.details.prisma).toBe(false);
      expect(data.details.lastError).toContain('timeout');
    });
  });

  describe('Unhealthy conditions', () => {
    it('should be unhealthy when there are waiting connections', async () => {
      envMock.setTestMode();
      mockPool.mockClient.query.mockResolvedValue({
        rows: [{ total: 10, idle: 2, active: 6, waiting: 2 }]
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.details.poolStats.waitingCount).toBe(2);
      expect(data.recommendations).toContain('High number of waiting connections - check for connection leaks');
    });

    it('should track error count and be unhealthy after multiple errors', async () => {
      envMock.setTestMode();
      
      // First, simulate multiple failed requests to build up error count
      const dbError = errorUtils.simulateDatabaseError('Repeated failure');
      mockPrisma.$queryRaw.mockRejectedValue(dbError);

      // Make several failed requests
      await GET();
      await GET();
      await GET();

      // Now make a successful request - should still be unhealthy due to error count
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.details.errorCount).toBeGreaterThanOrEqual(3);
      expect(data.recommendations).toContain('Multiple connection errors detected - consider restarting the application');
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      envMock.setTestMode();
      
      // Mock an unexpected error during health check
      vi.doMock('@/lib/prismadb', () => {
        throw new Error('Unexpected import error');
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.message).toBe('Health check failed');
    });
  });

  describe('Response format', () => {
    it('should include all required fields in healthy response', async () => {
      envMock.setTestMode();
      timeUtils.mockDate('2023-01-01T12:00:00Z');

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('details');
      expect(data.details).toHaveProperty('prisma');
      expect(data.details).toHaveProperty('pool');
      expect(data.details).toHaveProperty('poolStats');
      expect(data.details).toHaveProperty('timestamp');
      expect(data.details).toHaveProperty('lastError');
      expect(data.details).toHaveProperty('errorCount');
      expect(data.recommendations).toEqual([]);
    });

    it('should include recommendations in unhealthy response', async () => {
      envMock.setTestMode();
      const dbError = errorUtils.simulateDatabaseError('Test error');
      mockPrisma.$queryRaw.mockRejectedValue(dbError);

      const response = await GET();
      const data = await response.json();

      expect(data.recommendations).toBeInstanceOf(Array);
      expect(data.recommendations.length).toBeGreaterThan(0);
      expect(data.recommendations).toContain('Prisma connection failed - check database connectivity');
    });
  });

  describe('Performance', () => {
    it('should complete health check within reasonable time', async () => {
      envMock.setTestMode();
      const startTime = Date.now();
      
      await GET();
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(6000); // Should complete within 6 seconds (timeout is 5s)
    });
  });
});