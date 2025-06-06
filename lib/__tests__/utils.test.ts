import { describe, it, expect } from 'vitest';
import { calculateMetrics, validateUsername } from '../utils';

const dayMs = 24 * 60 * 60 * 1000;

describe('calculateMetrics', () => {
  it('computes metrics for sample feed items', () => {
    const items = [
      { title: 'a', link: '1', pubDate: '2023-01-03T00:00:00Z', content: 'aaa' },
      { title: 'b', link: '2', pubDate: '2023-01-02T00:00:00Z', content: 'bb' },
      { title: 'c', link: '3', pubDate: '2023-01-01T00:00:00Z', content: 'c' },
    ];

    const result = calculateMetrics(items);

    expect(result.totalPosts).toBe(3);
    expect(result.averageTimeBetweenPosts).toBe(dayMs);
    expect(result.medianTimeBetweenPosts).toBe(dayMs);
    expect(result.averageLengthOfPosts).toBe(2);
  });
});

describe('validateUsername', () => {
  it('validates usernames correctly', () => {
    expect(validateUsername('user_123').isValid).toBe(true);
    const short = validateUsername('ab');
    expect(short.isValid).toBe(false);
    expect(short.error).toMatch(/at least 3/);

    const invalid = validateUsername('invalid!');
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toMatch(/letters, numbers/);
  });
});
