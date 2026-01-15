import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password utils', () => {
  it('hashPassword produces a bcrypt hash that is not the plain password', async () => {
    const password = 'MySecurePassword123!';

    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    // Basic bcrypt format check
    expect(hash.startsWith('$2')).toBe(true);
    expect(hash.length).toBeGreaterThan(20);
  });

  it('hashPassword produces different hashes for the same input (due to salting)', async () => {
    const password = 'SamePassword!';

    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Very unlikely to be equal if salting is used correctly
    expect(hash1).not.toBe(hash2);
  });

  it('verifyPassword returns true for correct password and hash', async () => {
    const password = 'CorrectHorseBatteryStaple';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  it('verifyPassword returns false for incorrect password', async () => {
    const password = 'CorrectHorseBatteryStaple';
    const wrongPassword = 'Tr0ub4dor&3';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(wrongPassword, hash);

    expect(isValid).toBe(false);
  });
});

