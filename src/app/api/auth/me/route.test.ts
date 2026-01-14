import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/auth/get-database', () => ({
  getDatabaseFromEnv: vi.fn(),
}));

vi.mock('@/lib/services/auth-service', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/auth/cookies', () => ({
  getSessionToken: vi.fn(),
}));

const mockGetDatabaseFromEnv = vi.mocked(
  await import('@/lib/auth/get-database').then((m) => m.getDatabaseFromEnv),
);
const mockGetCurrentUser = vi.mocked(
  await import('@/lib/services/auth-service').then((m) => m.getCurrentUser),
);
const mockGetSessionToken = vi.mocked(
  await import('@/lib/auth/cookies').then((m) => m.getSessionToken),
);

describe('Auth API: GET /api/auth/me', () => {
  const mockDb = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabaseFromEnv.mockReturnValue(mockDb);
  });

  function createRequestWithCookies(
    cookies: Record<string, string> = {},
  ): NextRequest {
    const cookieMap = new Map<string, string>(Object.entries(cookies));
    const nextCookies = {
      get: (name: string) => {
        const value = cookieMap.get(name);
        return value ? { name, value } : undefined;
      },
    } as any;

    // @ts-expect-error - minimal NextRequest-like object
    return {
      cookies: nextCookies,
    };
  }

  it('returns user when session is valid', async () => {
    const user = {
      id: 'user-id-123',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    mockGetSessionToken.mockReturnValueOnce('session-token-123');
    mockGetCurrentUser.mockResolvedValueOnce(user as any);

    const req = createRequestWithCookies();
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(user);
    expect(mockGetCurrentUser).toHaveBeenCalledWith(
      mockDb,
      'session-token-123',
    );
  });

  it('returns 401 when no session token', async () => {
    mockGetSessionToken.mockReturnValueOnce(undefined);

    const req = createRequestWithCookies();
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Not authenticated');
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('returns 401 when user not found for session', async () => {
    mockGetSessionToken.mockReturnValueOnce('session-token-123');
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const req = createRequestWithCookies();
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Not authenticated');
  });

  it('returns 500 when an error occurs', async () => {
    mockGetSessionToken.mockReturnValueOnce('session-token-123');
    mockGetCurrentUser.mockRejectedValueOnce(new Error('Service error'));

    const req = createRequestWithCookies();
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Failed to get user information');
  });
});

