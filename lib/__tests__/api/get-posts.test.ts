import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../../../app/api/get-posts/route';
import { createMockPrisma, createMockRequest, mockBuildEnvironment } from '../test-utils';
import { testUsers, testPosts, testSources, apiFixtures, errorFixtures } from '../fixtures';

// Mock modules
vi.mock('@/lib/prismadb', () => ({ default: {} }));

describe('/api/get-posts', () => {
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
    it('should return empty posts during build phase', async () => {
      envMock.setBuildMode();
      const request = createMockRequest('POST', apiFixtures.getPostsRequest);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ posts: [] });
    });

    it('should return empty posts when BUILDING is true', async () => {
      process.env.BUILDING = 'true';
      const request = createMockRequest('POST', apiFixtures.getPostsRequest);

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ posts: [] });
    });

    it('should return empty posts in production without DATABASE_URL', async () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_URL = undefined;
      delete process.env.DATABASE_URL;
      
      const request = createMockRequest('POST', apiFixtures.getPostsRequest);

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ posts: [] });
    });
  });

  describe('Successful requests', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should return posts for valid user with matching username', async () => {
      // Mock user lookup
      mockPrisma.pesos_User.findMany.mockResolvedValue([testUsers.validUser]);
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.validUser);
      
      // Mock posts with source data
      const postsWithSources = testPosts
        .filter(p => p.userId === testUsers.validUser.id)
        .map(post => ({
          ...post,
          pesos_Sources: testSources.rssSource,
        }));
      mockPrisma.pesos_items.findMany.mockResolvedValue(postsWithSources);

      const request = createMockRequest('POST', apiFixtures.getPostsRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(true);
      expect(data.posts).toHaveLength(2);
      expect(data.posts[0]).toHaveProperty('sourceUrl', testSources.rssSource.url);
      expect(data.posts[0].title).toBe('First Test Post');
    });

    it('should handle user with no posts', async () => {
      mockPrisma.pesos_User.findMany.mockResolvedValue([testUsers.anotherUser]);
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.anotherUser);
      mockPrisma.pesos_items.findMany.mockResolvedValue([]);

      const request = createMockRequest('POST', {
        clerkId: testUsers.anotherUser.id,
        username: testUsers.anotherUser.username,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(true);
      expect(data.posts).toHaveLength(0);
    });

    it('should order posts by date descending', async () => {
      mockPrisma.pesos_User.findMany.mockResolvedValue([testUsers.validUser]);
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.validUser);
      
      const postsWithSources = testPosts
        .filter(p => p.userId === testUsers.validUser.id)
        .map(post => ({
          ...post,
          pesos_Sources: testSources.rssSource,
        }));
      mockPrisma.pesos_items.findMany.mockResolvedValue(postsWithSources);

      const request = createMockRequest('POST', apiFixtures.getPostsRequest);
      await POST(request);

      expect(mockPrisma.pesos_items.findMany).toHaveBeenCalledWith({
        where: { userId: testUsers.validUser.id },
        select: {
          id: true,
          title: true,
          url: true,
          slug: true,
          postdate: true,
          sourceId: true,
          pesos_Sources: { select: { url: true } },
        },
        orderBy: { postdate: 'desc' },
      });
    });
  });

  describe('Authentication failures', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should return error when user does not exist', async () => {
      mockPrisma.pesos_User.findMany.mockResolvedValue([]);
      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);

      const request = createMockRequest('POST', {
        clerkId: 'non_existent_id',
        username: 'nonexistent',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(errorFixtures.noUserError);
    });

    it('should return error when username does not match', async () => {
      mockPrisma.pesos_User.findMany.mockResolvedValue([testUsers.validUser]);
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.validUser);

      const request = createMockRequest('POST', {
        clerkId: testUsers.validUser.id,
        username: 'wrongusername',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(errorFixtures.usernameMismatchError);
    });

    it('should handle case-insensitive username comparison', async () => {
      mockPrisma.pesos_User.findMany.mockResolvedValue([testUsers.validUser]);
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.validUser);
      mockPrisma.pesos_items.findMany.mockResolvedValue([]);

      const request = createMockRequest('POST', {
        clerkId: testUsers.validUser.id,
        username: 'TESTUSER', // uppercase version
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(true);
    });
  });

  describe('Input validation', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should handle missing clerkId', async () => {
      const request = createMockRequest('POST', {
        username: testUsers.validUser.username,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(false);
    });

    it('should handle missing username', async () => {
      const request = createMockRequest('POST', {
        clerkId: testUsers.validUser.id,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(false);
    });

    it('should handle malformed JSON request', async () => {
      const request = createMockRequest('POST');
      request.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(false);
    });
  });

  describe('Database errors', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should handle database connection error gracefully', async () => {
      mockPrisma.pesos_User.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest('POST', apiFixtures.getPostsRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(false);
      expect(data.posts).toEqual([]);
    });

    it('should handle posts query error', async () => {
      mockPrisma.pesos_User.findMany.mockResolvedValue([testUsers.validUser]);
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.validUser);
      mockPrisma.pesos_items.findMany.mockRejectedValue(
        new Error('Posts query failed')
      );

      const request = createMockRequest('POST', apiFixtures.getPostsRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowed).toBe(false);
    });
  });

  describe('Response format', () => {
    beforeEach(() => {
      envMock.setTestMode();
    });

    it('should include all required fields in successful response', async () => {
      mockPrisma.pesos_User.findMany.mockResolvedValue([testUsers.validUser]);
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.validUser);
      mockPrisma.pesos_items.findMany.mockResolvedValue([{
        ...testPosts[0],
        pesos_Sources: testSources.rssSource,
      }]);

      const request = createMockRequest('POST', apiFixtures.getPostsRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('allowed');
      expect(data).toHaveProperty('posts');
      expect(data.posts[0]).toHaveProperty('id');
      expect(data.posts[0]).toHaveProperty('title');
      expect(data.posts[0]).toHaveProperty('url');
      expect(data.posts[0]).toHaveProperty('slug');
      expect(data.posts[0]).toHaveProperty('postdate');
      expect(data.posts[0]).toHaveProperty('sourceId');
      expect(data.posts[0]).toHaveProperty('sourceUrl');
    });

    it('should include error field in error responses', async () => {
      mockPrisma.pesos_User.findUnique.mockResolvedValue(null);

      const request = createMockRequest('POST', apiFixtures.getPostsRequest);
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('allowed', false);
      expect(data).toHaveProperty('posts', []);
      expect(data).toHaveProperty('error', 'no_user');
    });
  });

  describe('Logging', () => {
    beforeEach(() => {
      envMock.setTestMode();
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log request payload', async () => {
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.validUser);
      mockPrisma.pesos_items.findMany.mockResolvedValue([]);

      const request = createMockRequest('POST', apiFixtures.getPostsRequest);
      await POST(request);

      expect(console.log).toHaveBeenCalledWith(
        '[get-posts] Request payload:',
        apiFixtures.getPostsRequest
      );
    });

    it('should log username mismatch warnings', async () => {
      mockPrisma.pesos_User.findUnique.mockResolvedValue(testUsers.validUser);

      const request = createMockRequest('POST', {
        clerkId: testUsers.validUser.id,
        username: 'wrongusername',
      });
      await POST(request);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[get-posts] Username mismatch')
      );
    });
  });
});