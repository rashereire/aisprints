import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/auth/get-database', () => ({
  getDatabaseFromEnv: vi.fn(),
}));

vi.mock('@/lib/services/auth-service', () => ({
  logout: vi.fn(),
}));

vi.mock('@/lib/auth/cookies', () => ({
  getSessionToken: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

const mockGetDatabaseFromEnv = vi.mocked(
  await import('@/lib/auth/get-database').then((m) => m.getDatabaseFromEnv),
);
const mockLogout = vi.mocked(
  await import('@/lib/services/auth-service').then((m) => m.logout),
);
const mockGetSessionToken = vi.mocked(
  await import('@/lib/auth/cookies').then((m) => m.getSessionToken),
);
const mockClearSessionCookie = vi.mocked(
  await import('@/lib/auth/cookies').then((m) => m.clearSessionCookie),
);

describe('Auth API: POST /api/auth/logout', () => {
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

  it('logs out when session token is present', async () => {
    mockGetSessionToken.mockReturnValueOnce('session-token-123');

    const req = createRequestWithCookies();
    const res = (await POST(req)) as NextResponse;
    const json = await res.json();

    expect(mockGetSessionToken).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalledWith(mockDb, 'session-token-123');
    expect(mockClearSessionCookie).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(json.message).toBe('Logged out successfully');
  });

  it('returns 401 when no session token', async () => {
    mockGetSessionToken.mockReturnValueOnce(undefined);

    const req = createRequestWithCookies();
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Not authenticated');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('returns 500 when logout fails', async () => {
    mockGetSessionToken.mockReturnValueOnce('session-token-123');
    mockLogout.mockRejectedValueOnce(new Error('Service error'));

    const req = createRequestWithCookies();
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Failed to logout');
  });
});

