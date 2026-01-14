import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/auth/get-database', () => ({
  getDatabaseFromEnv: vi.fn(),
}));

vi.mock('@/lib/services/auth-service', () => ({
  register: vi.fn(),
}));

vi.mock('@/lib/auth/cookies', () => ({
  setSessionCookie: vi.fn(),
}));

vi.mock('@/lib/schemas/auth-schema', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    registerSchema: {
      parse: vi.fn((value) => value),
    },
  };
});

const mockGetDatabaseFromEnv = vi.mocked(
  await import('@/lib/auth/get-database').then((m) => m.getDatabaseFromEnv),
);
const mockRegister = vi.mocked(
  await import('@/lib/services/auth-service').then((m) => m.register),
);
const mockSetSessionCookie = vi.mocked(
  await import('@/lib/auth/cookies').then((m) => m.setSessionCookie),
);
const mockRegisterSchemaParse = vi.mocked(
  (await import('@/lib/schemas/auth-schema')).registerSchema.parse,
);

function createRequest(body: unknown): NextRequest {
  // @ts-expect-error - minimal NextRequest-like object
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('Auth API: POST /api/auth/register', () => {
  const mockDb = {} as D1Database;

  const validBody = {
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    email: 'john@example.com',
    password: 'Password123!',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabaseFromEnv.mockReturnValue(mockDb);
  });

  it('creates user and sets session cookie on success', async () => {
    const user = {
      id: 'user-id-123',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    mockRegisterSchemaParse.mockImplementationOnce((v: unknown) => v);
    mockRegister.mockResolvedValueOnce({
      user,
      sessionToken: 'session-token-123',
    });

    const req = createRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.user).toEqual(user);
    expect(mockRegister).toHaveBeenCalledWith(mockDb, validBody);
    expect(mockSetSessionCookie).toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    // @ts-expect-error - simulate broken request.json
    const badReq: NextRequest = {
      json: () => {
        throw new Error('Invalid JSON');
      },
    };

    const res = await POST(badReq);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('returns 400 for schema validation errors', async () => {
    mockRegisterSchemaParse.mockImplementationOnce(() => {
      const { z } = require('zod') as typeof import('zod');
      throw new z.ZodError([]);
    });

    const req = createRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('returns 409 when username already exists', async () => {
    mockRegisterSchemaParse.mockImplementationOnce((v: unknown) => v);
    mockRegister.mockRejectedValueOnce(new Error('Username already exists'));

    const req = createRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe('Username already exists');
  });

  it('returns 409 when email already exists', async () => {
    mockRegisterSchemaParse.mockImplementationOnce((v: unknown) => v);
    mockRegister.mockRejectedValueOnce(new Error('Email already exists'));

    const req = createRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe('Email already exists');
  });

  it('returns 500 when database is not available', async () => {
    mockGetDatabaseFromEnv.mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    mockRegisterSchemaParse.mockImplementationOnce((v: unknown) => v);

    const req = createRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe(
      'Database not available. Please check server configuration.',
    );
  });
});

