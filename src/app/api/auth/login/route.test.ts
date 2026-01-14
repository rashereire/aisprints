import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/auth/get-database', () => ({
  getDatabaseFromEnv: vi.fn(),
}));

vi.mock('@/lib/services/auth-service', () => ({
  login: vi.fn(),
}));

vi.mock('@/lib/auth/cookies', () => ({
  setSessionCookie: vi.fn(),
}));

vi.mock('@/lib/schemas/auth-schema', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    loginSchema: {
      parse: vi.fn((value) => value),
    },
  };
});

const mockGetDatabaseFromEnv = vi.mocked(
  await import('@/lib/auth/get-database').then((m) => m.getDatabaseFromEnv),
);
const mockLogin = vi.mocked(
  await import('@/lib/services/auth-service').then((m) => m.login),
);
const mockSetSessionCookie = vi.mocked(
  await import('@/lib/auth/cookies').then((m) => m.setSessionCookie),
);
const mockLoginSchemaParse = vi.mocked(
  (await import('@/lib/schemas/auth-schema')).loginSchema.parse,
);

function createRequest(body: unknown): NextRequest {
  // @ts-expect-error - minimal NextRequest-like object
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('Auth API: POST /api/auth/login', () => {
  const mockDb = {} as D1Database;

  const validBody = {
    usernameOrEmail: 'johndoe',
    password: 'Password123!',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabaseFromEnv.mockReturnValue(mockDb);
  });

  it('logs in user and sets session cookie on success', async () => {
    const user = {
      id: 'user-id-123',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    mockLoginSchemaParse.mockImplementationOnce((v: unknown) => v);
    mockLogin.mockResolvedValueOnce({
      user,
      sessionToken: 'session-token-123',
    });

    const req = createRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user).toEqual(user);
    expect(mockLogin).toHaveBeenCalledWith(
      mockDb,
      validBody.usernameOrEmail,
      validBody.password,
    );
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
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('returns 400 for schema validation errors', async () => {
    mockLoginSchemaParse.mockImplementationOnce(() => {
      const { z } = require('zod') as typeof import('zod');
      throw new z.ZodError([]);
    });

    const req = createRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid credentials', async () => {
    mockLoginSchemaParse.mockImplementationOnce((v: unknown) => v);
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    const req = createRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Invalid credentials');
  });

  it('returns 500 when database is not available', async () => {
    mockGetDatabaseFromEnv.mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    mockLoginSchemaParse.mockImplementationOnce((v: unknown) => v);

    const req = createRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe(
      'Database not available. Please check server configuration.',
    );
  });
});

