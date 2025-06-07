import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../../../app/api/check-username/route';
import { createMockPrisma, createMockRequest, mockBuildEnvironment } from '../test-utils';
import { testUsers } from '../fixtures';

// Mock modules
vi.mock('@/lib/prismadb', () => ({ default: {} }));

describe('/api/check-username', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let envMock: ReturnType<typeof mockBuildEnvironment>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    envMock = mockBuildEnvironment();

    // Mock the Prisma client
    vi.doMock('@/lib/prismadb', () => ({ default: mockPrisma }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    envMock.restore();
  });

  describe('Build-time checks', () => {
    it('should return available during build phase', async () => {
      envMock.setBuildMode();
      const request = createMockRequest('POST', { username: 'testuser' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ available: true });
    });
  });

  describe('Valid username checks', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should return available for new username', async () => {
      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);

      const request = createMockRequest('POST', { username: 'newuser' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(true);
      expect(data.message).toBeUndefined();

      expect(mockPrisma.pesos_User.findUnique).toHaveBeenCalledWith({
        where: { username: 'newuser' },
      });
    });

    it('should return unavailable for existing username', async () => {
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.validUser);

      const request = createMockRequest('POST', { username: testUsers.validUser.username });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Username is already taken');
    });

    it('should handle case-insensitive username comparison', async () => {
      // Mock finding a user with lowercase username
      mockPrisma.pesos_User.findUnique.mockResolvedValue({
        ...testUsers.validUser,
        username: 'testuser',
      });

      const request = createMockRequest('POST', { username: 'TESTUSER' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(mockPrisma.pesos_User.findUnique).toHaveBeenCalledWith({
        where: { username: 'TESTUSER' },
      });
    });
  });

  describe('Input validation', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should reject username that is too short', async () => {
      const request = createMockRequest('POST', { username: 'ab' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Username must be at least 3 characters long');
      
      // Should not query database for invalid username
      expect(mockPrisma.pesos_User.findUnique).not.toHaveBeenCalled();
    });

    it('should reject username that is too long', async () => {
      const longUsername = 'a'.repeat(29); // 29 characters
      const request = createMockRequest('POST', { username: longUsername });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Username must be no more than 28 characters long');
      
      expect(mockPrisma.pesos_User.findUnique).not.toHaveBeenCalled();
    });

    it('should reject username with invalid characters', async () => {
      const invalidUsernames = [
        'user@name',
        'user name',
        'user-name',
        'user.name',
        'user#name',
        'user!name',
      ];

      for (const username of invalidUsernames) {
        const request = createMockRequest('POST', { username });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.available).toBe(false);
        expect(data.message).toBe('Username can only contain letters, numbers, and underscores');
        
        expect(mockPrisma.pesos_User.findUnique).not.toHaveBeenCalled();
      }
    });

    it('should accept valid usernames', async () => {
      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);

      const validUsernames = [
        'user123',
        'User_Name',
        'test_user_123',
        'validUsername',
        'a1b2c3',
        '123456',
        'user_',
        '_user',
      ];

      for (const username of validUsernames) {
        const request = createMockRequest('POST', { username });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.available).toBe(true);
        
        expect(mockPrisma.pesos_User.findUnique).toHaveBeenCalledWith({
          where: { username },
        });

        // Reset mock for next iteration
        mockPrisma.pesos_User.findUnique.mockClear();
      }
    });

    it('should handle missing username', async () => {
      const request = createMockRequest('POST', {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Username is required');
      
      expect(mockPrisma.pesos_User.findUnique).not.toHaveBeenCalled();
    });

    it('should handle null username', async () => {
      const request = createMockRequest('POST', { username: null });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Username is required');
    });

    it('should handle empty string username', async () => {
      const request = createMockRequest('POST', { username: '' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Username must be at least 3 characters long');
    });

    it('should trim whitespace from username', async () => {
      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);

      const request = createMockRequest('POST', { username: '  validuser  ' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(true);
      
      // Should query with trimmed username
      expect(mockPrisma.pesos_User.findUnique).toHaveBeenCalledWith({
        where: { username: 'validuser' },
      });
    });
  });

  describe('Database errors', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should handle database connection error', async () => {
      mockPrisma.pesos_User.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest('POST', { username: 'testuser' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Internal server error');
    });

    it('should handle timeout errors', async () => {
      mockPrisma.pesos_User.findUnique.mockRejectedValue(
        new Error('Query timeout')
      );

      const request = createMockRequest('POST', { username: 'testuser' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Internal server error');
    });
  });

  describe('Request parsing', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should handle malformed JSON', async () => {
      const request = createMockRequest('POST');
      request.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Invalid request format');
    });

    it('should handle non-object request body', async () => {
      const request = createMockRequest('POST', 'invalid');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.available).toBe(false);
      expect(data.message).toBe('Username is required');
    });
  });

  describe('Response format', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should always include available field', async () => {
      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);

      const request = createMockRequest('POST', { username: 'testuser' });
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('available');
      expect(typeof data.available).toBe('boolean');
    });

    it('should include message for errors', async () => {
      const request = createMockRequest('POST', { username: 'ab' });
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('available', false);
      expect(data).toHaveProperty('message');
      expect(typeof data.message).toBe('string');
    });

    it('should not leak internal error details', async () => {
      mockPrisma.pesos_User.findUnique.mockRejectedValue(
        new Error('Internal database schema details')
      );

      const request = createMockRequest('POST', { username: 'testuser' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.message).toBe('Internal server error');
      expect(data.message).not.toContain('schema');
      expect(data.message).not.toContain('database');
    });
  });

  describe('Rate limiting considerations', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should handle rapid successive requests', async () => {
      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);

      const requests = Array.from({ length: 5 }, (_, i) => 
        createMockRequest('POST', { username: `user${i}` })
      );

      const responses = await Promise.all(
        requests.map(request => POST(request))
      );

      // All requests should be handled successfully
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      expect(mockPrisma.pesos_User.findUnique).toHaveBeenCalledTimes(5);
    });
  });
});