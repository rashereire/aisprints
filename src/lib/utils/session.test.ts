import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSessionToken,
  createSession,
  validateSessionToken,
  type UserSession,
} from './session';
import { executeMutation, executeQueryFirst } from '@/lib/d1-client';

vi.mock('@/lib/d1-client', () => ({
  executeMutation: vi.fn(),
  executeQueryFirst: vi.fn(),
}));

describe('session utils', () => {
  const mockDb = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSessionToken', () => {
    it('generates a 64-character hex token', () => {
      const token = generateSessionToken();

      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/i.test(token)).toBe(true);
    });

    it('generates different tokens on subsequent calls', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      // Very unlikely to be equal if randomness is working
      expect(token1).not.toBe(token2);
    });
  });

  describe('createSession', () => {
    it('creates session and returns generated token', async () => {
      const userId = 'user-123';

      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      const result = await createSession(mockDb, userId, 2);

      // Verify token is generated (64 hex chars)
      expect(result).toHaveLength(64);
      expect(/^[0-9a-f]+$/i.test(result)).toBe(true);
      
      // Verify executeMutation was called correctly
      expect(executeMutation).toHaveBeenCalledTimes(1);

      const call = vi.mocked(executeMutation).mock.calls[0];
      expect(call[0]).toBe(mockDb);
      expect(call[1]).toMatch(/INSERT INTO user_sessions/);
      // Should use anonymous ? placeholders
      expect(call[1]).toMatch(/\?/);
      expect(call[1]).not.toMatch(/\?[0-9]/);
      // Params: [userId, sessionToken, isoString]
      expect(call[2][0]).toBe(userId);
      expect(call[2][1]).toBe(result); // Token returned matches what was passed
      expect(typeof call[2][2]).toBe('string');
      // Verify expiresAt is a valid ISO string
      expect(() => new Date(call[2][2] as string)).not.toThrow();
    });
  });

  describe('validateSessionToken', () => {
    it('returns session when token is valid and not expired', async () => {
      const token = 'token-123';
      const dbSession: UserSession = {
        id: 'session-1',
        user_id: 'user-1',
        session_token: token,
        expires_at: '2025-01-01T00:00:00Z',
        created_at: '2024-12-31T00:00:00Z',
      };

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(dbSession);

      const result = await validateSessionToken(mockDb, token);

      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('FROM user_sessions'),
        [token],
      );
      expect(result).toEqual(dbSession);
    });

    it('returns null when token is invalid or expired', async () => {
      const token = 'token-123';
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      const result = await validateSessionToken(mockDb, token);

      expect(result).toBeNull();
    });
  });
});

