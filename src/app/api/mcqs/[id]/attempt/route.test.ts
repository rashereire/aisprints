import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/auth/get-database', () => ({
  getDatabaseFromEnv: vi.fn(),
}));

vi.mock('@/lib/services/mcq-attempt-service', () => ({
  recordAttempt: vi.fn(),
}));

vi.mock('@/lib/auth/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/schemas/mcq-schema', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    mcqAttemptSchema: {
      parse: vi.fn((value) => value),
    },
  };
});

const mockGetDatabaseFromEnv = vi.mocked(
  await import('@/lib/auth/get-database').then((m) => m.getDatabaseFromEnv),
);
const mockRecordAttempt = vi.mocked(
  await import('@/lib/services/mcq-attempt-service').then((m) => m.recordAttempt),
);
const mockGetCurrentUser = vi.mocked(
  await import('@/lib/auth/get-current-user').then((m) => m.getCurrentUser),
);
const mockMcqAttemptSchema = vi.mocked(
  (await import('@/lib/schemas/mcq-schema')).mcqAttemptSchema.parse,
);

function createRequest(url: string, init?: RequestInit): NextRequest {
  // @ts-expect-error - constructing minimal NextRequest-like object for tests
  return new Request(url, init);
}

describe('MCQ Attempt API route: /api/mcqs/[id]/attempt', () => {
  const mockDb = {} as D1Database;

  async function params(id: string) {
    return { id };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabaseFromEnv.mockReturnValue(mockDb);
  });

  const validBody = {
    selectedChoiceId: 'choice-1',
  };

  it('records attempt successfully when authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
    (mockMcqAttemptSchema as any).mockImplementationOnce((v: unknown) => v);
    const attempt = {
      id: 'attempt-1',
      mcqId: 'mcq-1',
      userId: 'user-1',
      selectedChoiceId: 'choice-1',
      isCorrect: true,
      attemptedAt: '2025-01-01T00:00:00Z',
    };
    mockRecordAttempt.mockResolvedValueOnce(attempt as any);

    const req = createRequest('http://localhost/api/mcqs/mcq-1/attempt', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: params('mcq-1') as any });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(attempt);
    expect(mockRecordAttempt).toHaveBeenCalledWith(
      mockDb,
      'user-1',
      'mcq-1',
      'choice-1',
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const req = createRequest('http://localhost/api/mcqs/mcq-1/attempt', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: params('mcq-1') as any });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Authentication required');
    expect(mockRecordAttempt).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);

    const badReq = {
      method: 'POST',
      body: '{ invalid json',
    } as any;
    // @ts-expect-error
    badReq.json = () => {
      throw new Error('Invalid JSON');
    };

    const res = await POST(badReq as NextRequest, {
      params: params('mcq-1') as any,
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
    expect(mockRecordAttempt).not.toHaveBeenCalled();
  });

  it('returns 400 for schema validation errors', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
    (mockMcqAttemptSchema as any).mockImplementationOnce(() => {
      const { z } = require('zod') as typeof import('zod');
      throw new z.ZodError([]);
    });

    const req = createRequest('http://localhost/api/mcqs/mcq-1/attempt', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: params('mcq-1') as any });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(mockRecordAttempt).not.toHaveBeenCalled();
  });

  it('returns 404 when selected choice not found', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
    (mockMcqAttemptSchema as any).mockImplementationOnce((v: unknown) => v);
    mockRecordAttempt.mockRejectedValueOnce(new Error('Choice not found'));

    const req = createRequest('http://localhost/api/mcqs/mcq-1/attempt', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: params('mcq-1') as any });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Selected choice not found');
  });

  it('returns 400 when choice does not belong to MCQ', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
    (mockMcqAttemptSchema as any).mockImplementationOnce((v: unknown) => v);
    mockRecordAttempt.mockRejectedValueOnce(
      new Error('Choice does not belong to this MCQ'),
    );

    const req = createRequest('http://localhost/api/mcqs/mcq-1/attempt', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: params('mcq-1') as any });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Selected choice does not belong to this MCQ');
  });

  it('handles other errors with 500', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
    (mockMcqAttemptSchema as any).mockImplementationOnce((v: unknown) => v);
    mockRecordAttempt.mockRejectedValueOnce(new Error('Service error'));

    const req = createRequest('http://localhost/api/mcqs/mcq-1/attempt', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, { params: params('mcq-1') as any });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Failed to record attempt');
  });
});

