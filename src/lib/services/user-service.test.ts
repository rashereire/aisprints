import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeQueryFirst,
  executeMutation,
  generateId,
} from '@/lib/d1-client';
import {
  createUser,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  getUserByUsernameOrEmail,
  checkUsernameExists,
  checkEmailExists,
} from './user-service';
import { hashPassword } from '@/lib/utils/password';
import type { RegisterInput, User } from '@/lib/schemas/auth-schema';

vi.mock('@/lib/d1-client', () => ({
  executeQuery: vi.fn(),
  executeQueryFirst: vi.fn(),
  executeMutation: vi.fn(),
  generateId: vi.fn(() => 'user-id-123'),
  getDatabase: vi.fn(),
}));

vi.mock('@/lib/utils/password', () => ({
  hashPassword: vi.fn(async (password: string) => `hashed-${password}`),
}));

describe('user-service', () => {
  const mockDb = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateId).mockReturnValue('user-id-123');
  });

  const baseDbUser = {
    id: 'user-id-123',
    first_name: 'John',
    last_name: 'Doe',
    username: 'johndoe',
    email: 'john@example.com',
    password_hash: 'hashed-password',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const baseUser: User = {
    id: 'user-id-123',
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    email: 'john@example.com',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  describe('createUser', () => {
    const input: RegisterInput = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'Password123!',
    };

    it('creates a new user when username and email are available', async () => {
      // No existing username/email
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null); // getUserByUsername
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null); // getUserByEmail

      // After insert, getUserById returns user
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(baseDbUser);

      const result = await createUser(mockDb, input);

      expect(hashPassword).toHaveBeenCalledWith(input.password);
      expect(generateId).toHaveBeenCalledTimes(1);
      expect(executeMutation).toHaveBeenCalledTimes(1);

      const mutationCall = vi.mocked(executeMutation).mock.calls[0];
      expect(mutationCall[0]).toBe(mockDb);
      expect(mutationCall[1]).toMatch(/INSERT INTO users/);
      expect(mutationCall[1]).toMatch(/\?/);
      expect(mutationCall[1]).not.toMatch(/\?[0-9]/);
      expect(mutationCall[2]).toEqual([
        'user-id-123',
        input.firstName,
        input.lastName,
        input.username,
        input.email,
        'hashed-Password123!',
      ]);

      expect(result).toEqual(baseUser);
    });

    it('throws when username already exists', async () => {
      // getUserByUsername returns existing user
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(baseDbUser);

      await expect(createUser(mockDb, input)).rejects.toThrow(
        'Username already exists',
      );
      expect(executeMutation).not.toHaveBeenCalled();
    });

    it('throws when email already exists', async () => {
      // getUserByUsername returns null, getUserByEmail returns user
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(baseDbUser);

      await expect(createUser(mockDb, input)).rejects.toThrow(
        'Email already exists',
      );
      expect(executeMutation).not.toHaveBeenCalled();
    });

    it('throws when created user cannot be retrieved', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null); // username
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null); // email
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null); // getUserById

      await expect(createUser(mockDb, input)).rejects.toThrow(
        'Failed to retrieve created user',
      );
    });
  });

  describe('getUserById', () => {
    it('returns user when found', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(baseDbUser);

      const result = await getUserById(mockDb, 'user-id-123');

      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('FROM users'),
        ['user-id-123'],
      );
      expect(result).toEqual(baseUser);
    });

    it('returns null when user not found', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      const result = await getUserById(mockDb, 'missing');

      expect(result).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    it('returns user when found (case-insensitive)', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(baseDbUser);

      const result = await getUserByUsername(mockDb, 'JohnDoe');

      const call = vi.mocked(executeQueryFirst).mock.calls[0];
      expect(call[1]).toMatch(/LOWER\(username\) = LOWER\(\?\)/);
      expect(call[2]).toEqual(['JohnDoe']);
      expect(result).toEqual(baseUser);
    });

    it('returns null when user not found', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      const result = await getUserByUsername(mockDb, 'missing');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('returns user when found (case-insensitive)', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(baseDbUser);

      const result = await getUserByEmail(mockDb, 'JOHN@EXAMPLE.COM');

      const call = vi.mocked(executeQueryFirst).mock.calls[0];
      expect(call[1]).toMatch(/LOWER\(email\) = LOWER\(\?\)/);
      expect(call[2]).toEqual(['JOHN@EXAMPLE.COM']);
      expect(result).toEqual(baseUser);
    });
  });

  describe('getUserByUsernameOrEmail', () => {
    it('returns user when found by username or email (case-insensitive)', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(baseDbUser);

      const result = await getUserByUsernameOrEmail(mockDb, 'identifier');

      const call = vi.mocked(executeQueryFirst).mock.calls[0];
      expect(call[1]).toMatch(
        /LOWER\(username\) = LOWER\(\?\) OR LOWER\(email\) = LOWER\(\?\)/,
      );
      expect(call[2]).toEqual(['identifier', 'identifier']);
      expect(result).toEqual(baseUser);
    });

    it('returns null when user not found', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      const result = await getUserByUsernameOrEmail(mockDb, 'missing');

      expect(result).toBeNull();
    });
  });

  describe('checkUsernameExists', () => {
    it('returns true when user exists', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(baseDbUser);

      const result = await checkUsernameExists(mockDb, 'johndoe');

      expect(result).toBe(true);
    });

    it('returns false when user does not exist', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      const result = await checkUsernameExists(mockDb, 'missing');

      expect(result).toBe(false);
    });
  });

  describe('checkEmailExists', () => {
    it('returns true when email exists', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(baseDbUser);

      const result = await checkEmailExists(mockDb, 'john@example.com');

      expect(result).toBe(true);
    });

    it('returns false when email does not exist', async () => {
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      const result = await checkEmailExists(mockDb, 'missing@example.com');

      expect(result).toBe(false);
    });
  });
});

