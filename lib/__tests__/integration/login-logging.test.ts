import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as getLocalUserPOST } from '../../../app/api/getLocalUser/route';
import { POST as createUserPOST } from '../../../app/api/createUser/route';
import { createMockRequest, mockBuildEnvironment, createMockPrisma } from '../test-utils';

// Mock the ActivityLogger
const mockActivityLogger = {
  log: vi.fn(),
  logUserLogin: vi.fn(),
  logUserCreated: vi.fn(),
  getClientInfo: vi.fn().mockReturnValue({
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 Test Browser'
  })
};

vi.mock('@/lib/activity-logger', () => ({
  ActivityLogger: mockActivityLogger
}));

// Mock prisma
vi.mock('@/lib/prismadb', () => ({
  default: createMockPrisma()
}));

// Mock zod for createUser
vi.mock('zod', () => ({
  z: {
    object: vi.fn().mockReturnValue({
      parse: vi.fn().mockReturnValue({
        username: 'testuser',
        clerkId: 'user_test123'
      })
    }),
    string: vi.fn().mockReturnValue({
      min: vi.fn().mockReturnThis(),
      regex: vi.fn().mockReturnThis()
    })
  }
}));

describe('Login Logging Integration', () => {
  let envMock: ReturnType<typeof mockBuildEnvironment>;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    envMock = mockBuildEnvironment();
    envMock.setTestMode();
    mockPrisma = require('@/lib/prismadb').default;
    vi.clearAllMocks();
  });

  afterEach(() => {
    envMock.restore();
  });

  describe('User creation logging', () => {
    it('should log successful user creation', async () => {
      const userData = {
        username: 'testuser',
        clerkId: 'user_test123'
      };

      const newUser = {
        id: 'user_test123',
        username: 'testuser',
        createdAt: new Date()
      };

      // Mock user doesn't exist
      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);
      // Mock user creation
      mockPrisma.pesos_User.create.mockResolvedValue(newUser);

      const request = createMockRequest('POST', userData);
      const response = await createUserPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.localUser).toEqual(newUser);

      // Verify user creation was logged
      expect(mockActivityLogger.logUserCreated).toHaveBeenCalledWith(
        'user_test123',
        {
          username: 'testuser',
          createdAt: newUser.createdAt
        },
        '192.168.1.1',
        'Mozilla/5.0 Test Browser'
      );
    });

    it('should log when existing user attempts to create account again', async () => {
      const userData = {
        username: 'existinguser',
        clerkId: 'user_existing123'
      };

      const existingUser = {
        id: 'user_existing123',
        username: 'existinguser',
        createdAt: new Date()
      };

      // Mock user already exists
      mockPrisma.pesos_User.findUnique.mockResolvedValue(existingUser);

      const request = createMockRequest('POST', userData);
      const response = await createUserPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify login event was logged for existing user
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        eventType: "user_login",
        userId: 'user_existing123',
        metadata: {
          username: 'existinguser',
          action: "attempted_duplicate_creation"
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        source: "api"
      });
    });

    it('should log failed user creation due to username conflict', async () => {
      const userData = {
        username: 'conflictuser',
        clerkId: 'user_new123'
      };

      const existingUser = {
        id: 'user_other123',
        username: 'conflictuser',
        createdAt: new Date()
      };

      // Mock no user with this clerkId
      mockPrisma.pesos_User.findUnique
        .mockResolvedValueOnce(null) // First call for clerkId check
        .mockResolvedValueOnce(existingUser); // Second call for username check

      const request = createMockRequest('POST', userData);
      const response = await createUserPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Username is already taken');

      // Verify failed user creation was logged
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        eventType: "user_created",
        userId: 'user_new123',
        metadata: {
          username: 'conflictuser',
          reason: "username_taken"
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        success: false,
        errorMessage: "Username is already taken",
        source: "api"
      });
    });
  });

  describe('User verification logging', () => {
    it('should log user login when getLocalUser finds existing user', async () => {
      const clerkId = 'user_verify123';
      const existingUser = {
        id: clerkId,
        username: 'verifyuser',
        createdAt: new Date()
      };

      mockPrisma.pesos_User.findUnique.mockResolvedValue(existingUser);

      const request = createMockRequest('POST', { clerkId });
      const response = await getLocalUserPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.localUser).toEqual(existingUser);

      // Verify login event was logged
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        eventType: "user_login",
        userId: clerkId,
        metadata: {
          username: 'verifyuser',
          verificationMethod: "getLocalUser",
          timestamp: expect.any(String)
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        source: "api"
      });
    });

    it('should not log login when user does not exist', async () => {
      const clerkId = 'user_nonexistent123';

      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);

      const request = createMockRequest('POST', { clerkId });
      const response = await getLocalUserPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.localUser).toBe(null);

      // Verify no login event was logged
      expect(mockActivityLogger.log).not.toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "user_login"
        })
      );
    });
  });

  describe('Error handling in logging', () => {
    it('should handle ActivityLogger errors gracefully during user creation', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const userData = {
        username: 'erroruser',
        clerkId: 'user_error123'
      };

      const newUser = {
        id: 'user_error123',
        username: 'erroruser',
        createdAt: new Date()
      };

      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);
      mockPrisma.pesos_User.create.mockResolvedValue(newUser);
      
      // Mock logging to fail
      mockActivityLogger.logUserCreated.mockRejectedValue(new Error('Logging failed'));

      const request = createMockRequest('POST', userData);
      const response = await createUserPOST(request);
      const data = await response.json();

      // User creation should still succeed even if logging fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.localUser).toEqual(newUser);

      consoleSpy.mockRestore();
    });

    it('should handle ActivityLogger errors gracefully during user verification', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const clerkId = 'user_logerror123';
      const existingUser = {
        id: clerkId,
        username: 'logerroruser',
        createdAt: new Date()
      };

      mockPrisma.pesos_User.findUnique.mockResolvedValue(existingUser);
      
      // Mock logging to fail
      mockActivityLogger.log.mockRejectedValue(new Error('Logging failed'));

      const request = createMockRequest('POST', { clerkId });
      const response = await getLocalUserPOST(request);
      const data = await response.json();

      // User verification should still succeed even if logging fails
      expect(response.status).toBe(200);
      expect(data.localUser).toEqual(existingUser);

      consoleSpy.mockRestore();
    });
  });

  describe('Client info extraction', () => {
    it('should properly extract IP address and user agent from requests', async () => {
      const clerkId = 'user_clientinfo123';
      const existingUser = {
        id: clerkId,
        username: 'clientinfouser',
        createdAt: new Date()
      };

      mockPrisma.pesos_User.findUnique.mockResolvedValue(existingUser);

      // Create request with custom headers
      const request = createMockRequest('POST', { clerkId });
      request.headers.set('x-forwarded-for', '203.0.113.1, 192.168.1.1');
      request.headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

      // Update mock to return the header values
      mockActivityLogger.getClientInfo.mockReturnValue({
        ipAddress: '203.0.113.1, 192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      });

      const response = await getLocalUserPOST(request);

      expect(response.status).toBe(200);

      // Verify getClientInfo was called and used correct values
      expect(mockActivityLogger.getClientInfo).toHaveBeenCalledWith(request);
      expect(mockActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '203.0.113.1, 192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        })
      );
    });
  });
});