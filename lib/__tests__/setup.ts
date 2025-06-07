import { vi, beforeAll, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Set up test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.CLERK_SECRET_KEY = 'sk_test_mock_key';
  process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key';
  process.env.BUILDING = 'false';
  process.env.NEXT_PHASE = '';
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});