// Test user fixtures
export const testUsers = {
  validUser: {
    id: 'clerk_test_123',
    username: 'testuser',
    createdAt: new Date('2023-01-01T00:00:00Z'),
  },
  anotherUser: {
    id: 'clerk_test_456',
    username: 'anotheruser',
    createdAt: new Date('2023-01-02T00:00:00Z'),
  },
  invalidUser: {
    id: 'clerk_invalid',
    username: 'bad!user',
    createdAt: new Date('2023-01-03T00:00:00Z'),
  },
};

// Test source fixtures
export const testSources = {
  rssSource: {
    id: 1,
    url: 'https://example.com/feed.xml',
    active: 'Y',
  },
  blogSource: {
    id: 2,
    url: 'https://blog.example.com/rss',
    active: 'Y',
  },
  inactiveSource: {
    id: 3,
    url: 'https://inactive.example.com/feed',
    active: 'N',
  },
};

// Test post fixtures
export const testPosts = [
  {
    id: 1,
    title: 'First Test Post',
    url: 'https://example.com/post-1',
    description: 'This is the first test post content',
    postdate: new Date('2023-01-01T12:00:00Z'),
    source: 'Example Blog',
    slug: 'first-test-post',
    userId: testUsers.validUser.id,
    sourceId: testSources.rssSource.id,
  },
  {
    id: 2,
    title: 'Second Test Post',
    url: 'https://example.com/post-2',
    description: 'This is the second test post content',
    postdate: new Date('2023-01-02T12:00:00Z'),
    source: 'Example Blog',
    slug: 'second-test-post',
    userId: testUsers.validUser.id,
    sourceId: testSources.rssSource.id,
  },
  {
    id: 3,
    title: 'Another User Post',
    url: 'https://blog.example.com/post-1',
    description: 'Post by another user',
    postdate: new Date('2023-01-03T12:00:00Z'),
    source: 'Another Blog',
    slug: 'another-user-post',
    userId: testUsers.anotherUser.id,
    sourceId: testSources.blogSource.id,
  },
];

// Test feed data fixtures
export const testFeeds = {
  validRSSFeed: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>A test RSS feed</description>
    <link>https://example.com</link>
    <item>
      <title>Test Item 1</title>
      <link>https://example.com/item-1</link>
      <description>Test item description</description>
      <pubDate>Wed, 01 Jan 2023 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Test Item 2</title>
      <link>https://example.com/item-2</link>
      <description>Another test item</description>
      <pubDate>Thu, 02 Jan 2023 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`,

  malformedFeed: `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Broken Feed</title>
    <item>
      <title>Incomplete item
      <link>https://example.com/broken
    </item>
  </channel>`,

  emptyFeed: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
    <description>An empty RSS feed</description>
    <link>https://example.com</link>
  </channel>
</rss>`,
};

// Mock API request/response fixtures
export const apiFixtures = {
  getPostsRequest: {
    clerkId: testUsers.validUser.id,
    username: testUsers.validUser.username,
  },
  getPostsResponse: {
    allowed: true,
    posts: testPosts.filter(p => p.userId === testUsers.validUser.id).map(post => ({
      ...post,
      sourceUrl: testSources.rssSource.url,
    })),
  },
  getUserSourcesResponse: [
    {
      userId: testUsers.validUser.id,
      sourceId: testSources.rssSource.id,
      createdAt: new Date('2023-01-01T00:00:00Z'),
      source: testSources.rssSource,
    },
  ],
  healthCheckResponse: {
    status: 'healthy',
    details: {
      prisma: true,
      pool: true,
      poolStats: {
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      },
      timestamp: '2023-01-01T12:00:00.000Z',
      lastError: null,
      errorCount: 0,
    },
  },
};

// Error response fixtures
export const errorFixtures = {
  noUserError: {
    allowed: false,
    posts: [],
    error: 'no_user',
  },
  usernameMismatchError: {
    allowed: false,
    posts: [],
    error: 'username_mismatch',
  },
  serverError: {
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  },
};