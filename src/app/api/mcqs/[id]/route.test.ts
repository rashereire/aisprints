import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from './route';

vi.mock('@/lib/auth/get-database', () => ({
  getDatabaseFromEnv: vi.fn(),
}));

vi.mock('@/lib/services/mcq-service', () => ({
  getMcqById: vi.fn(),
  updateMcq: vi.fn(),
  deleteMcq: vi.fn(),
  verifyMcqOwnership: vi.fn(),
}));

vi.mock('@/lib/auth/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/schemas/mcq-schema', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    mcqUpdateSchema: {
      parse: vi.fn((value) => value),
    },
  };
});

const mockGetDatabaseFromEnv = vi.mocked(
  await import('@/lib/auth/get-database').then((m) => m.getDatabaseFromEnv),
);
const mockGetMcqById = vi.mocked(
  await import('@/lib/services/mcq-service').then((m) => m.getMcqById),
);
const mockUpdateMcq = vi.mocked(
  await import('@/lib/services/mcq-service').then((m) => m.updateMcq),
);
const mockDeleteMcq = vi.mocked(
  await import('@/lib/services/mcq-service').then((m) => m.deleteMcq),
);
const mockVerifyMcqOwnership = vi.mocked(
  await import('@/lib/services/mcq-service').then((m) => m.verifyMcqOwnership),
);
const mockGetCurrentUser = vi.mocked(
  await import('@/lib/auth/get-current-user').then((m) => m.getCurrentUser),
);
const mockMcqUpdateSchema = vi.mocked(
  (await import('@/lib/schemas/mcq-schema')).mcqUpdateSchema.parse,
);

function createRequest(url: string, init?: RequestInit): NextRequest {
  // @ts-expect-error - constructing minimal NextRequest-like object for tests
  return new Request(url, init);
}

describe('MCQ API route: /api/mcqs/[id]', () => {
  const mockDb = {} as D1Database;

  async function params(id: string) {
    return { id };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabaseFromEnv.mockReturnValue(mockDb);
  });

  describe('GET /api/mcqs/[id]', () => {
    it('returns MCQ when found', async () => {
      const mcq = { id: 'mcq-1', title: 'Test' } as any;
      mockGetMcqById.mockResolvedValueOnce(mcq);

      const req = createRequest('http://localhost/api/mcqs/mcq-1');
      const res = await GET(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mockGetMcqById).toHaveBeenCalledWith(mockDb, 'mcq-1');
      expect(json).toEqual(mcq);
    });

    it('returns 404 when MCQ not found', async () => {
      mockGetMcqById.mockResolvedValueOnce(null);

      const req = createRequest('http://localhost/api/mcqs/missing');
      const res = await GET(req, { params: params('missing') as any });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('MCQ not found');
    });

    it('handles database errors with 500', async () => {
      mockGetDatabaseFromEnv.mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      const req = createRequest('http://localhost/api/mcqs/mcq-1');
      const res = await GET(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe(
        'Database not available. Please check server configuration.',
      );
    });
  });

  describe('PUT /api/mcqs/[id]', () => {
    const updateBody = { title: 'Updated' };

    it('updates MCQ successfully when user owns it', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockVerifyMcqOwnership.mockResolvedValueOnce(true);
      mockGetMcqById.mockResolvedValueOnce({ id: 'mcq-1' } as any);
      (mockMcqUpdateSchema as any).mockImplementationOnce((v: unknown) => v);
      const updated = { id: 'mcq-1', title: 'Updated' };
      mockUpdateMcq.mockResolvedValueOnce(updated as any);

      const req = createRequest('http://localhost/api/mcqs/mcq-1', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      });
      const res = await PUT(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual(updated);
      expect(mockUpdateMcq).toHaveBeenCalledWith(
        mockDb,
        'mcq-1',
        'user-1',
        updateBody,
      );
    });

    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null);

      const req = createRequest('http://localhost/api/mcqs/mcq-1', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      });
      const res = await PUT(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Authentication required');
      expect(mockVerifyMcqOwnership).not.toHaveBeenCalled();
    });

    it('returns 403 when user does not own MCQ', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockVerifyMcqOwnership.mockResolvedValueOnce(false);

      const req = createRequest('http://localhost/api/mcqs/mcq-1', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      });
      const res = await PUT(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe('You do not have permission to update this MCQ');
      expect(mockUpdateMcq).not.toHaveBeenCalled();
    });

    it('returns 404 when MCQ not found', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockVerifyMcqOwnership.mockResolvedValueOnce(true);
      mockGetMcqById.mockResolvedValueOnce(null);

      const req = createRequest('http://localhost/api/mcqs/missing', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      });
      const res = await PUT(req, { params: params('missing') as any });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('MCQ not found');
      expect(mockUpdateMcq).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid JSON body', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockVerifyMcqOwnership.mockResolvedValueOnce(true);
      mockGetMcqById.mockResolvedValueOnce({ id: 'mcq-1' } as any);

      const badReq = {
        method: 'PUT',
        body: '{ invalid json',
      } as any;
      // @ts-expect-error
      badReq.json = () => {
        throw new Error('Invalid JSON');
      };

      const res = await PUT(badReq as NextRequest, {
        params: params('mcq-1') as any,
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Invalid JSON in request body');
      expect(mockUpdateMcq).not.toHaveBeenCalled();
    });

    it('returns 400 for schema validation errors', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockVerifyMcqOwnership.mockResolvedValueOnce(true);
      mockGetMcqById.mockResolvedValueOnce({ id: 'mcq-1' } as any);
      (mockMcqUpdateSchema as any).mockImplementationOnce(() => {
        // Simulate z.ZodError thrown from within route
        const { z } = require('zod') as typeof import('zod');
        throw new z.ZodError([]);
      });

      const req = createRequest('http://localhost/api/mcqs/mcq-1', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      });
      const res = await PUT(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Validation failed');
      expect(mockUpdateMcq).not.toHaveBeenCalled();
    });

    it('handles other errors with 500', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockVerifyMcqOwnership.mockResolvedValueOnce(true);
      mockGetMcqById.mockResolvedValueOnce({ id: 'mcq-1' } as any);
      (mockMcqUpdateSchema as any).mockImplementationOnce((v: unknown) => v);
      mockUpdateMcq.mockRejectedValueOnce(new Error('Service error'));

      const req = createRequest('http://localhost/api/mcqs/mcq-1', {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      });
      const res = await PUT(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Failed to update MCQ');
    });
  });

  describe('DELETE /api/mcqs/[id]', () => {
    it('deletes MCQ successfully when user owns it', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockGetMcqById.mockResolvedValueOnce({ id: 'mcq-1' } as any);
      mockVerifyMcqOwnership.mockResolvedValueOnce(true);
      mockDeleteMcq.mockResolvedValueOnce(undefined as any);

      const req = createRequest('http://localhost/api/mcqs/mcq-1', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe('MCQ deleted successfully');
      expect(mockDeleteMcq).toHaveBeenCalledWith(mockDb, 'mcq-1', 'user-1');
    });

    it('returns 401 when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null);

      const req = createRequest('http://localhost/api/mcqs/mcq-1', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Authentication required');
      expect(mockDeleteMcq).not.toHaveBeenCalled();
    });

    it('returns 404 when MCQ not found', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockGetMcqById.mockResolvedValueOnce(null);

      const req = createRequest('http://localhost/api/mcqs/missing', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: params('missing') as any });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('MCQ not found');
      expect(mockDeleteMcq).not.toHaveBeenCalled();
    });

    it('returns 403 when user does not own MCQ', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockGetMcqById.mockResolvedValueOnce({ id: 'mcq-1' } as any);
      mockVerifyMcqOwnership.mockResolvedValueOnce(false);

      const req = createRequest('http://localhost/api/mcqs/mcq-1', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe('You do not have permission to delete this MCQ');
      expect(mockDeleteMcq).not.toHaveBeenCalled();
    });

    it('handles other errors with 500', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ id: 'user-1' } as any);
      mockGetMcqById.mockResolvedValueOnce({ id: 'mcq-1' } as any);
      mockVerifyMcqOwnership.mockResolvedValueOnce(true);
      mockDeleteMcq.mockRejectedValueOnce(new Error('Service error'));

      const req = createRequest('http://localhost/api/mcqs/mcq-1', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: params('mcq-1') as any });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Failed to delete MCQ');
    });
  });
});

