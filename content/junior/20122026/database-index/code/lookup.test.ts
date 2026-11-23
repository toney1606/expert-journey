import { describe, expect, it } from 'vitest';
import { buildEmailIndex, findByEmailIndexed, findByEmailScan } from './lookup';

const users = Array.from({ length: 1000 }, (_, id) => ({ id, email: `user${id}@example.com` }));

describe('email lookup', () => {
  it('scan and index return the same user', () => {
    const index = buildEmailIndex(users);
    expect(findByEmailScan(users, 'user742@example.com')).toEqual(users[742]);
    expect(findByEmailIndexed(index, 'user742@example.com')).toEqual(users[742]);
  });
  it('both return undefined for a missing email', () => {
    expect(findByEmailScan(users, 'nobody@example.com')).toBeUndefined();
    expect(findByEmailIndexed(buildEmailIndex(users), 'nobody@example.com')).toBeUndefined();
  });
});
