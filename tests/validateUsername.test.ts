import { validateUsername } from '../lib/utils';
import assert from 'node:assert';
import { test } from 'node:test';

test('accepts valid usernames', () => {
  assert.strictEqual(validateUsername('user_1').isValid, true);
});

test('rejects short usernames', () => {
  const result = validateUsername('ab');
  assert.strictEqual(result.isValid, false);
});

