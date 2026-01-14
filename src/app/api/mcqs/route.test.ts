import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock dependencies
vi.mock('@/lib/auth/get-database', () => ({
  getDatabaseFromEnv: vi.fn(),
}));

vi.mock('@/lib/services/mcq-service', () => ({
  getMcqs: vi.fn(),
  createMcq: vi.fn(),
}));

vi.mock('@/lib/auth/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/schemas/mcq-schema', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    mcqCreateSchema: {
      parse: vi.fn((value) => value),
    },
  };
});

const mockGetDatabaseFromEnv = vi.mocked(
  await import('@/lib/auth/get-database').then((m) => m.getDatabaseFromEnv),
);
const mockGetMcqs = vi.mocked(
  await import('@/lib/services/mcq-service').then((m) => m.getMcqs),
);
const mockCreateMcq = vi.mocked(
  await import('@/lib/services/mcq-service').then((m) => m.createMcq),
);
const mockGetCurrentUser = vi.mocked(
  await import('@/lib/auth/get-current-user').then((m) => m.getCurrentUser),
);
const mockMcqCreateSchema = vi.mocked(
  (await import('@/lib/schemas/mcq-schema')).mcqCreateSchema.parse,
);

function createRequest(url: string, init?: RequestInit): NextRequest {
  // @ts-expect-error - constructing minimal NextRequest-like object for tests
  return new Request(url, init);
}

describe('MCQ API route: /api/mcqs', () => {
  const mockDb = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabaseFromEnv.mockReturnValue(mockDb);
  });

  describe('GET /api/mcqs', () => {
    it('returns paginated MCQs with default params', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockGetMcqs.mockResolvedValueOnce(mockResult);

      const req = createRequest('http://localhost/api/mcqs');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mockGetMcqs).toHaveBeenCalledWith(mockDb, {
        page: undefined,
        limit: undefined,
        search: undefined,
        userId: undefined,
        sort: undefined,
        order: undefined,
      });
      expect(json).toEqual(mockResult);
    });

    it('respects page and limit query params', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
      };
      mockGetMcqs.mockResolvedValueOnce(mockResult);

      const req = createRequest('http://localhost/api/mcqs?page=2&limit=5');
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(mockGetMcqs).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ page: 2, limit: 5 }),
      );
    });

    it('validates page must be positive integer', async () => {
      const req = createRequest('http://localhost/api/mcqs?page=0');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Page must be a positive integer');
      expect(mockGetMcqs).not.toHaveBeenCalled();
    });

    it('validates limit must be positive integer and <= 100', async () => {
      const reqInvalid = createRequest('http://localhost/api/mcqs?limit=0');
      const resInvalid = await GET(reqInvalid);
      expect(resInvalid.status).toBe(400);

      const reqTooHigh = createRequest('http://localhost/api/mcqs?limit=101');
      const resTooHigh = await GET(reqTooHigh);
      expect(resTooHigh.status).toBe(400);

      expect(mockGetMcqs).not.toHaveBeenCalled();
    });

    it('handles database errors in GET with 500', async () => {
      mockGetDatabaseFromEnv.mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      const req = createRequest('http://localhost/api/mcqs');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe(
        'Database not available. Please check server configuration.',
      );
      expect(mockGetMcqs).not.toHaveBeenCalled();
    });

    it('handles service errors in GET with 500', async () => {
      mockGetMcqs.mockRejectedValueOnce(new Error('Service error'));

      const req = createRequest('http://localhost/api/mcqs');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Failed to retrieve MCQs');
    });
  });

  describe('POST /api/mcqs', () => {
    const validBody = {
      title: 'Test',
      description: 'Desc',
      questionText: 'Q?',
      choices: [
        { choiceText: 'A', isCorrect: true, displayOrder: 0 },
        { choiceText: 'B', isCorrect: false, displayOrder: 1 },
      ],
    };

    it('creates MCQ successfully when authenticated', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      (mockMcqCreateSchema as any).mockImplementationOnce((v: unknown) => v);
      const created = { id: 'mcq-1', ...validBody };
      mockCreateMcq.mockResolvedValueOnce(created as any);

      const req = createRequest('http://localhost/api/mcqs', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(mockCreateMcq).toHaveBeenCalledWith(mockDb, 'user-1', validBody);
      expect(json).toEqual(created);
    });

    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null);

      const req = createRequest('http://localhost/api/mcqs', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Authentication required');
      expect(mockCreateMcq).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid JSON body', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);

      const badReq = {
        method: 'POST',
        body: '{ invalid json',
      } as any;
      // @ts-expect-error - simulate broken Request.json
      badReq.json = () => {
        throw new Error('Invalid JSON');
      };

      const res = await POST(badReq as NextRequest);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Invalid JSON in request body');
      expect(mockCreateMcq).not.toHaveBeenCalled();
    });

    it('returns 400 for schema validation errors', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      (mockMcqCreateSchema as any).mockImplementationOnce(() => {
        const { z } = require('zod') as typeof import('zod');
        throw new z.ZodError([]);
      });

      const req = createRequest('http://localhost/api/mcqs', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Validation failed');
      expect(mockCreateMcq).not.toHaveBeenCalled();
    });

    it('handles database errors in POST with 500', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      (mockMcqCreateSchema as any).mockImplementationOnce((v: unknown) => v);
      mockGetDatabaseFromEnv.mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      const req = createRequest('http://localhost/api/mcqs', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe(
        'Database not available. Please check server configuration.',
      );
      expect(mockCreateMcq).not.toHaveBeenCalled();
    });

    it('handles other errors in POST with 500', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      (mockMcqCreateSchema as any).mockImplementationOnce((v: unknown) => v);
      mockCreateMcq.mockRejectedValueOnce(new Error('Service error'));

      const req = createRequest('http://localhost/api/mcqs', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Failed to create MCQ');
    });
  });
});

