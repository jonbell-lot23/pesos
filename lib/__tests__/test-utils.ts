import { vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Prisma client utilities
export const createMockPrisma = () => {
  return {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
    pesos_User: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pesos_items: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    pesos_Sources: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pesos_UserSources: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    SystemStatus: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    Backup: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    SystemLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
};

// Mock DB pool utilities
export const createMockDbPool = () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };

  return {
    connect: vi.fn().mockResolvedValue(mockClient),
    query: vi.fn(),
    end: vi.fn(),
    mockClient,
  };
};

// Create mock Next.js request
export const createMockRequest = (method: string, body?: any, url?: string) => {
  const request = {
    method,
    url: url || 'http://localhost:3000/api/test',
    json: vi.fn().mockResolvedValue(body || {}),
    headers: new Headers(),
    nextUrl: new URL(url || 'http://localhost:3000/api/test'),
  } as unknown as NextRequest;

  return request;
};

// Mock environment for build detection
export const mockBuildEnvironment = () => {
  const originalEnv = { ...process.env };
  
  return {
    setBuildMode: () => {
      process.env.NEXT_PHASE = 'phase-production-build';
      process.env.BUILDING = 'true';
    },
    setProductionMode: () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_URL = 'test.vercel.app';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
    },
    setTestMode: () => {
      process.env.NODE_ENV = 'test';
      process.env.BUILDING = 'false';
      process.env.NEXT_PHASE = '';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
    },
    restore: () => {
      Object.keys(process.env).forEach(key => {
        if (originalEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalEnv[key];
        }
      });
    },
  };
};

// Utilities for time-based testing
export const timeUtils = {
  mockDate: (date: string | Date) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(date));
  },
  restoreTime: () => {
    vi.useRealTimers();
  },
  advanceTime: (ms: number) => {
    vi.advanceTimersByTime(ms);
  },
};

// Error simulation utilities
export const errorUtils = {
  simulateDatabaseError: (message: string = 'Database connection failed') => {
    const error = new Error(message);
    error.name = 'DatabaseError';
    return error;
  },
  simulateNetworkError: (message: string = 'Network request failed') => {
    const error = new Error(message);
    error.name = 'NetworkError';
    return error;
  },
  simulateTimeout: (message: string = 'Operation timed out') => {
    const error = new Error(message);
    error.name = 'TimeoutError';
    return error;
  },
};