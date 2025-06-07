import { describe, it, expect } from 'vitest';
import { calculateMetrics, validateUsername, cn, sleep } from '../utils';

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

  it('handles empty items array', () => {
    const result = calculateMetrics([]);

    expect(result.totalPosts).toBe(0);
    expect(result.averageTimeBetweenPosts).toBe(0);
    expect(result.medianTimeBetweenPosts).toBe(0);
    expect(result.averageLengthOfPosts).toBe(0);
  });

  it('handles single item', () => {
    const items = [
      { title: 'single', link: '1', pubDate: '2023-01-01T00:00:00Z', content: 'test' },
    ];

    const result = calculateMetrics(items);

    expect(result.totalPosts).toBe(1);
    expect(result.averageTimeBetweenPosts).toBe(0);
    expect(result.medianTimeBetweenPosts).toBe(0);
    expect(result.averageLengthOfPosts).toBe(4);
  });

  it('uses title length when content is missing', () => {
    const items = [
      { title: 'long title here', link: '1', pubDate: '2023-01-01T00:00:00Z' },
      { title: 'short', link: '2', pubDate: '2023-01-02T00:00:00Z' },
    ];

    const result = calculateMetrics(items);

    expect(result.averageLengthOfPosts).toBe(Math.round((15 + 5) / 2));
  });

  it('calculates median correctly for even number of items', () => {
    const items = [
      { title: 'a', link: '1', pubDate: '2023-01-04T00:00:00Z', content: 'test' },
      { title: 'b', link: '2', pubDate: '2023-01-03T00:00:00Z', content: 'test' },
      { title: 'c', link: '3', pubDate: '2023-01-01T00:00:00Z', content: 'test' },
      { title: 'd', link: '4', pubDate: '2023-01-02T00:00:00Z', content: 'test' },
    ];

    const result = calculateMetrics(items);

    // Time diffs: [dayMs, 2*dayMs, dayMs] -> sorted: [dayMs, dayMs, 2*dayMs] -> median: (dayMs + dayMs) / 2
    expect(result.medianTimeBetweenPosts).toBe(dayMs);
  });

  it('calculates median correctly for odd number of items', () => {
    const items = [
      { title: 'a', link: '1', pubDate: '2023-01-05T00:00:00Z', content: 'test' },
      { title: 'b', link: '2', pubDate: '2023-01-03T00:00:00Z', content: 'test' },
      { title: 'c', link: '3', pubDate: '2023-01-01T00:00:00Z', content: 'test' },
    ];

    const result = calculateMetrics(items);

    // Time diffs: [2*dayMs, 2*dayMs] -> median is middle element
    expect(result.medianTimeBetweenPosts).toBe(2 * dayMs);
  });

  it('handles items with same publication date', () => {
    const items = [
      { title: 'a', link: '1', pubDate: '2023-01-01T00:00:00Z', content: 'test' },
      { title: 'b', link: '2', pubDate: '2023-01-01T00:00:00Z', content: 'test' },
    ];

    const result = calculateMetrics(items);

    expect(result.averageTimeBetweenPosts).toBe(0);
    expect(result.medianTimeBetweenPosts).toBe(0);
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

  it('accepts valid usernames', () => {
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

    validUsernames.forEach(username => {
      const result = validateUsername(username);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('rejects usernames that are too short', () => {
    const shortUsernames = ['a', 'ab', '12', 'x_'];

    shortUsernames.forEach(username => {
      const result = validateUsername(username);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be at least 3 characters long');
    });
  });

  it('rejects usernames that are too long', () => {
    const longUsername = 'a'.repeat(29); // 29 characters
    const result = validateUsername(longUsername);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username must be no more than 28 characters long');
  });

  it('accepts usernames at length boundaries', () => {
    const shortestValid = 'abc'; // 3 characters
    const longestValid = 'a'.repeat(28); // 28 characters

    expect(validateUsername(shortestValid).isValid).toBe(true);
    expect(validateUsername(longestValid).isValid).toBe(true);
  });

  it('rejects usernames with invalid characters', () => {
    const invalidUsernames = [
      'user@name',
      'user name',
      'user-name',
      'user.name',
      'user#name',
      'user$name',
      'user%name',
      'user!name',
      'user+name',
      'user=name',
      'user/name',
      'user\\name',
      'user|name',
      'user<name',
      'user>name',
      'user?name',
      'user*name',
      'user(name)',
      'user[name]',
      'user{name}',
      'user^name',
      'user~name',
      'user`name',
    ];

    invalidUsernames.forEach(username => {
      const result = validateUsername(username);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username can only contain letters, numbers, and underscores');
    });
  });

  it('trims whitespace from username', () => {
    const result = validateUsername('  valid_user  ');
    expect(result.isValid).toBe(true);
  });

  it('rejects username that becomes too short after trimming', () => {
    const result = validateUsername('  a  ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username must be at least 3 characters long');
  });

  it('handles empty and whitespace-only usernames', () => {
    const emptyResult = validateUsername('');
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.error).toBe('Username must be at least 3 characters long');

    const whitespaceResult = validateUsername('   ');
    expect(whitespaceResult.isValid).toBe(false);
    expect(whitespaceResult.error).toBe('Username must be at least 3 characters long');
  });
});

describe('cn', () => {
  it('merges class names correctly', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    const result = cn('base', true && 'conditional', false && 'hidden');
    expect(result).toBe('base conditional');
  });

  it('deduplicates and handles Tailwind conflicts', () => {
    const result = cn('p-4', 'p-8'); // p-8 should override p-4
    expect(result).toBe('p-8');
  });

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('handles arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('handles object notation', () => {
    const result = cn({
      'class1': true,
      'class2': false,
      'class3': true,
    });
    expect(result).toBe('class1 class3');
  });

  it('handles complex Tailwind class conflicts', () => {
    const result = cn(
      'bg-red-500 text-white p-4',
      'bg-blue-500 m-2', // bg-blue-500 should override bg-red-500
      'text-black' // text-black should override text-white
    );
    expect(result).toBe('text-white p-4 bg-blue-500 m-2 text-black');
  });
});

describe('sleep', () => {
  it('resolves after specified time', async () => {
    const startTime = Date.now();
    await sleep(100);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some variance
    expect(endTime - startTime).toBeLessThan(200); // Should not take too long
  });

  it('resolves immediately with 0ms', async () => {
    const startTime = Date.now();
    await sleep(0);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(50); // Should be very fast
  });

  it('returns a promise', () => {
    const result = sleep(1);
    expect(result).toBeInstanceOf(Promise);
  });

  it('handles negative values', async () => {
    // Negative values should be treated as 0
    const startTime = Date.now();
    await sleep(-100);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(50);
  });
});

describe('Edge cases and error conditions', () => {
  it('calculateMetrics handles malformed dates', () => {
    const items = [
      { title: 'a', link: '1', pubDate: 'invalid-date', content: 'test' },
      { title: 'b', link: '2', pubDate: '2023-01-01T00:00:00Z', content: 'test' },
    ];

    // Should not throw an error
    expect(() => calculateMetrics(items)).not.toThrow();
  });

  it('calculateMetrics handles very large time differences', () => {
    const items = [
      { title: 'a', link: '1', pubDate: '2023-01-01T00:00:00Z', content: 'test' },
      { title: 'b', link: '2', pubDate: '1990-01-01T00:00:00Z', content: 'test' },
    ];

    const result = calculateMetrics(items);
    expect(result.averageTimeBetweenPosts).toBeGreaterThan(0);
    expect(result.medianTimeBetweenPosts).toBeGreaterThan(0);
  });

  it('validateUsername handles unicode characters', () => {
    const unicodeUsername = 'user_测试';
    const result = validateUsername(unicodeUsername);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username can only contain letters, numbers, and underscores');
  });
});
