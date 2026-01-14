import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeQueryFirst,
  executeMutation,
} from '@/lib/d1-client';
import {
  createUser,
  getUserById,
} from '@/lib/services/user-service';
import {
  createSession,
  validateSessionToken,
} from '@/lib/utils/session';
import { verifyPassword } from '@/lib/utils/password';
import {
  register,
  login,
  logout,
  getCurrentUser,
  verifySession,
  cleanupExpiredSessions,
} from './auth-service';
import type { RegisterInput, User } from '@/lib/schemas/auth-schema';

vi.mock('@/lib/d1-client', () => ({
  executeQuery: vi.fn(),
  executeQueryFirst: vi.fn(),
  executeMutation: vi.fn(),
  generateId: vi.fn(),
  getDatabase: vi.fn(),
}));

vi.mock('@/lib/services/user-service', () => ({
  createUser: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('@/lib/utils/session', () => ({
  createSession: vi.fn(),
  validateSessionToken: vi.fn(),
}));

vi.mock('@/lib/utils/password', () => ({
  verifyPassword: vi.fn(),
}));

describe('auth-service', () => {
  const mockDb = {} as D1Database;

  const baseUser: User = {
    id: 'user-id-123',
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    email: 'john@example.com',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const dbUserWithPassword = {
    id: 'user-id-123',
    first_name: 'John',
    last_name: 'Doe',
    username: 'johndoe',
    email: 'john@example.com',
    password_hash: 'hashed-password',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    const input: RegisterInput = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'Password123!',
    };

    it('registers user and creates session', async () => {
      vi.mocked(createUser).mockResolvedValueOnce(baseUser);
      vi.mocked(createSession).mockResolvedValueOnce('session-token-123');

      const result = await register(mockDb, input);

      expect(createUser).toHaveBeenCalledWith(mockDb, input);
      expect(createSession).toHaveBeenCalledWith(mockDb, baseUser.id, 1);
      expect(result).toEqual({
        user: baseUser,
        sessionToken: 'session-token-123',
      });
    });

    it('propagates duplicate username/email errors from createUser', async () => {
      const error = new Error('Username already exists');
      vi.mocked(createUser).mockRejectedValueOnce(error);

      await expect(register(mockDb, input)).rejects.toThrow(
        'Username already exists',
      );
      expect(createSession).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('authenticates user and creates session on valid credentials', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(dbUserWithPassword);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(createSession).mockResolvedValueOnce('session-token-123');

      const result = await login(mockDb, 'johndoe', 'Password123!');

      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('FROM users'),
        ['johndoe', 'johndoe'],
      );
      expect(verifyPassword).toHaveBeenCalledWith(
        'Password123!',
        dbUserWithPassword.password_hash,
      );
      expect(createSession).toHaveBeenCalledWith(
        mockDb,
        baseUser.id,
        1,
      );
      expect(result.user).toEqual(baseUser);
      expect(result.sessionToken).toBe('session-token-123');
    });

    it('throws Invalid credentials when user not found', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      await expect(
        login(mockDb, 'missing', 'Password123!'),
      ).rejects.toThrow('Invalid credentials');
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('throws Invalid credentials when password is incorrect', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(dbUserWithPassword);
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      await expect(
        login(mockDb, 'johndoe', 'WrongPassword'),
      ).rejects.toThrow('Invalid credentials');
      expect(createSession).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deletes session by token', async () => {
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      await logout(mockDb, 'session-token-123');

      expect(executeMutation).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining(
          'DELETE FROM user_sessions WHERE session_token = ?',
        ),
        ['session-token-123'],
      );
    });
  });

  describe('getCurrentUser', () => {
    it('returns user when session is valid', async () => {
      const session = {
        id: 'session-1',
        user_id: 'user-id-123',
        session_token: 'token',
        expires_at: '2025-01-01T00:00:00Z',
        created_at: '2024-12-31T00:00:00Z',
      };

      vi.mocked(validateSessionToken).mockResolvedValueOnce(session as any);
      vi.mocked(getUserById).mockResolvedValueOnce(baseUser);

      const result = await getCurrentUser(mockDb, 'token');

      expect(validateSessionToken).toHaveBeenCalledWith(mockDb, 'token');
      expect(getUserById).toHaveBeenCalledWith(mockDb, 'user-id-123');
      expect(result).toEqual(baseUser);
    });

    it('returns null when session is invalid', async () => {
      vi.mocked(validateSessionToken).mockResolvedValueOnce(null);

      const result = await getCurrentUser(mockDb, 'token');

      expect(result).toBeNull();
      expect(getUserById).not.toHaveBeenCalled();
    });

    it('returns null when user not found for valid session', async () => {
      const session = {
        id: 'session-1',
        user_id: 'user-id-123',
        session_token: 'token',
        expires_at: '2025-01-01T00:00:00Z',
        created_at: '2024-12-31T00:00:00Z',
      };

      vi.mocked(validateSessionToken).mockResolvedValueOnce(session as any);
      vi.mocked(getUserById).mockResolvedValueOnce(null);

      const result = await getCurrentUser(mockDb, 'token');

      expect(result).toBeNull();
    });
  });

  describe('verifySession', () => {
    it('returns true when session is valid', async () => {
      vi.mocked(validateSessionToken).mockResolvedValueOnce({} as any);

      const result = await verifySession(mockDb, 'token');

      expect(result).toBe(true);
    });

    it('returns false when session is invalid', async () => {
      vi.mocked(validateSessionToken).mockResolvedValueOnce(null);

      const result = await verifySession(mockDb, 'token');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('returns number of deleted sessions', async () => {
      vi.mocked(executeMutation).mockResolvedValueOnce({
        meta: { changes: 5 },
      } as any);

      const result = await cleanupExpiredSessions(mockDb);

      expect(executeMutation).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining(
          'DELETE FROM user_sessions WHERE expires_at <= datetime(\'now\')',
        ),
      );
      expect(result).toBe(5);
    });

    it('returns 0 when meta.changes is undefined', async () => {
      vi.mocked(executeMutation).mockResolvedValueOnce({ meta: {} } as any);

      const result = await cleanupExpiredSessions(mockDb);

      expect(result).toBe(0);
    });
  });
});

