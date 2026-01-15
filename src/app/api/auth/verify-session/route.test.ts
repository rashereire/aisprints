import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/auth/get-database', () => ({
  getDatabaseFromEnv: vi.fn(),
}));

vi.mock('@/lib/services/auth-service', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/auth/cookies', () => ({
  getSessionToken: vi.fn(),
}));

const mockGetDatabaseFromEnv = vi.mocked(
  await import('@/lib/auth/get-database').then((m) => m.getDatabaseFromEnv),
);
const mockVerifySession = vi.mocked(
  await import('@/lib/services/auth-service').then((m) => m.verifySession),
);
const mockGetSessionToken = vi.mocked(
  await import('@/lib/auth/cookies').then((m) => m.getSessionToken),
);

describe('Auth API: POST /api/auth/verify-session', () => {
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

  it('returns valid: true when session is valid', async () => {
    mockGetSessionToken.mockReturnValueOnce('session-token-123');
    mockVerifySession.mockResolvedValueOnce(true);

    const req = createRequestWithCookies();
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ valid: true });
  });

  it('returns 401 when no session token', async () => {
    mockGetSessionToken.mockReturnValueOnce(undefined);

    const req = createRequestWithCookies();
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.valid).toBe(false);
    expect(json.error).toBe('No session token');
    expect(mockVerifySession).not.toHaveBeenCalled();
  });

  it('returns 401 when session is invalid or expired', async () => {
    mockGetSessionToken.mockReturnValueOnce('session-token-123');
    mockVerifySession.mockResolvedValueOnce(false);

    const req = createRequestWithCookies();
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.valid).toBe(false);
    expect(json.error).toBe('Session invalid or expired');
  });

  it('returns 500 when an error occurs', async () => {
    mockGetSessionToken.mockReturnValueOnce('session-token-123');
    mockVerifySession.mockRejectedValueOnce(new Error('Service error'));

    const req = createRequestWithCookies();
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.valid).toBe(false);
    expect(json.error).toBe('Failed to verify session');
  });
});

