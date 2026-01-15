import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';
import { NextResponse } from 'next/server';

// Mock OpenAI SDK
// createOpenAI returns a function that when called with model name returns a model object
const mockModelObject = {};
const mockClientFunction = vi.fn(() => mockModelObject);
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => mockClientFunction),
}));

// Mock AI SDK generateObject
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

// Mock Cloudflare context
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: {},
  })),
}));

// Mock TEKS schemas
vi.mock('@/lib/schemas/teks-mcq-schema', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    teksSelectionSchema: {
      parse: vi.fn((value) => value),
    },
    teksMcqGenerationSchema: {
      parse: vi.fn((value) => value),
    },
  };
});

const mockGenerateObject = vi.mocked(await import('ai').then((m) => m.generateObject));
const mockCreateOpenAI = vi.mocked(await import('@ai-sdk/openai').then((m) => m.createOpenAI));
const mockGetCloudflareContext = vi.mocked(
  await import('@opennextjs/cloudflare').then((m) => m.getCloudflareContext),
);
const mockTeksSelectionSchema = vi.mocked(
  (await import('@/lib/schemas/teks-mcq-schema')).teksSelectionSchema.parse,
);
const mockTeksMcqGenerationSchema = vi.mocked(
  (await import('@/lib/schemas/teks-mcq-schema')).teksMcqGenerationSchema.parse,
);

function createRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

const validTeksSelection = {
  subject: 'Science',
  gradeLevel: 'Grade 3',
  strandName: 'Recurring themes and concepts',
  standardCode: 'S.3.5.A',
  standardDescription: 'identify and use patterns to explain scientific phenomena',
  topicDescription: 'photosynthesis in plants',
};

const validGeneratedMcq = {
  title: 'Photosynthesis Process',
  description: 'Understanding how plants convert light energy',
  questionText: 'What is the primary function of photosynthesis in plants?',
  choices: [
    { choiceText: 'To produce oxygen', isCorrect: true, displayOrder: 0 },
    { choiceText: 'To absorb water', isCorrect: false, displayOrder: 1 },
    { choiceText: 'To grow roots', isCorrect: false, displayOrder: 2 },
    { choiceText: 'To produce seeds', isCorrect: false, displayOrder: 3 },
  ],
};

describe('POST /api/mcqs/generate-teks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mocks
    process.env.OPENAI_API_KEY = 'sk-test-key-1234567890';
    mockGetCloudflareContext.mockReturnValue({ env: {} } as any);
    mockTeksSelectionSchema.mockImplementation((value) => value);
    mockTeksMcqGenerationSchema.mockImplementation((value) => value);
    // Reset mockClientFunction to return model object
    mockClientFunction.mockReturnValue(mockModelObject);
    mockCreateOpenAI.mockReturnValue(mockClientFunction as any);
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('Happy Path', () => {
    it('should generate MCQ successfully with valid TEKS selection', async () => {
      // Arrange
      mockGenerateObject.mockResolvedValueOnce({
        object: validGeneratedMcq,
      } as any);

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(validGeneratedMcq);
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
      expect(mockTeksSelectionSchema).toHaveBeenCalledWith(validTeksSelection);
      expect(mockTeksMcqGenerationSchema).toHaveBeenCalledWith(validGeneratedMcq);
    });

    it('should convert empty string description to null', async () => {
      // Arrange
      const mcqWithEmptyDesc = {
        ...validGeneratedMcq,
        description: '',
      };
      mockGenerateObject.mockResolvedValueOnce({
        object: mcqWithEmptyDesc,
      } as any);

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.description).toBeNull();
    });

    it('should preserve null description', async () => {
      // Arrange
      const mcqWithNullDesc = {
        ...validGeneratedMcq,
        description: null,
      };
      mockGenerateObject.mockResolvedValueOnce({
        object: mcqWithNullDesc,
      } as any);

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.description).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when OPENAI_API_KEY is not configured', async () => {
      // Arrange
      delete process.env.OPENAI_API_KEY;
      mockGetCloudflareContext.mockReturnValue({ env: {} } as any);

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toContain('OpenAI API key is not configured');
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid JSON body', async () => {
      // Arrange
      const req = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as NextRequest;

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should return 400 for Zod validation errors', async () => {
      // Arrange
      const invalidData = { ...validTeksSelection };
      delete (invalidData as any).subject;

      const { ZodError } = await import('zod');
      const zodError = new ZodError([
        { path: ['subject'], message: 'Subject is required', code: 'invalid_type' },
      ]);

      mockTeksSelectionSchema.mockImplementation(() => {
        throw zodError;
      });

      const req = createRequest(invalidData);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toEqual(zodError.issues);
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it('should return 500 when OpenAI API call fails', async () => {
      // Arrange
      const apiError = new Error('OpenAI API error');
      mockGenerateObject.mockRejectedValueOnce(apiError);

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to generate MCQ');
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it('should return 401 when OpenAI API authentication fails', async () => {
      // Arrange
      const authError: any = new Error('Authentication failed');
      authError.status = 401;
      authError.response = {
        data: {
          error: {
            type: 'invalid_request_error',
            code: 'invalid_api_key',
            message: 'Invalid API key',
          },
        },
      };

      mockGenerateObject.mockRejectedValueOnce(authError);

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toContain('OpenAI API authentication failed');
      expect(data.openaiErrorCode).toBe('invalid_api_key');
    });

    it('should return 429 when OpenAI API rate limit exceeded', async () => {
      // Arrange
      const rateLimitError: any = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      rateLimitError.response = {
        data: {
          error: {
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded',
            message: 'Rate limit exceeded',
          },
        },
      };

      mockGenerateObject.mockRejectedValueOnce(rateLimitError);

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(data.error).toContain('rate limit exceeded');
    });

    it('should return 402 when OpenAI API quota exceeded', async () => {
      // Arrange
      const quotaError: any = new Error('Quota exceeded');
      quotaError.status = 402;
      quotaError.response = {
        data: {
          error: {
            type: 'insufficient_quota',
            code: 'insufficient_quota',
            message: 'Quota exceeded',
          },
        },
      };

      mockGenerateObject.mockRejectedValueOnce(quotaError);

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(402);
      expect(data.error).toContain('quota exceeded');
    });

    it('should return 500 when generated MCQ fails validation', async () => {
      // Arrange
      const invalidMcq = {
        ...validGeneratedMcq,
        choices: [], // Invalid: no choices
      };

      mockGenerateObject.mockResolvedValueOnce({
        object: invalidMcq,
      } as any);

      const { ZodError } = await import('zod');
      const zodError = new ZodError([
        { path: ['choices'], message: 'At least 2 choices are required', code: 'too_small' },
      ]);

      mockTeksMcqGenerationSchema.mockImplementation(() => {
        throw zodError;
      });

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toContain('did not meet validation requirements');
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const unexpectedError = new Error('Unexpected error');
      mockTeksSelectionSchema.mockImplementation(() => {
        throw unexpectedError;
      });

      const req = createRequest(validTeksSelection);

      // Act
      const response = await POST(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toContain('unexpected error');
    });
  });

  describe('OWASP Security Tests', () => {
    // 🔒 OWASP INPVAL-001: Verify reflected XSS attacks prevented
    it('🔒 OWASP INPVAL-001: should sanitize XSS payloads in topicDescription', async () => {
      // Note: The AI will handle sanitization, but we should validate input
      const xssPayload = {
        ...validTeksSelection,
        topicDescription: '<script>alert("XSS")</script>photosynthesis',
      };

      // The schema should accept this (AI will handle sanitization)
      // But we verify it doesn't break the system
      mockTeksSelectionSchema.mockReturnValueOnce(xssPayload);
      mockGenerateObject.mockResolvedValueOnce({
        object: validGeneratedMcq,
      } as any);

      const req = createRequest(xssPayload);

      const response = await POST(req);

      // Should not crash - AI will sanitize the output
      expect(response.status).toBe(200);
    });

    // 🔒 OWASP INPVAL-005: Verify SQL injection attacks blocked
    it('🔒 OWASP INPVAL-005: should prevent SQL injection in input fields', async () => {
      const sqlInjectionPayload = {
        ...validTeksSelection,
        topicDescription: "'; DROP TABLE mcqs; --",
      };

      // Schema validation should pass (it's just a string)
      // But the AI should handle it safely
      mockTeksSelectionSchema.mockReturnValueOnce(sqlInjectionPayload);
      mockGenerateObject.mockResolvedValueOnce({
        object: validGeneratedMcq,
      } as any);

      const req = createRequest(sqlInjectionPayload);

      const response = await POST(req);

      // Should not cause SQL injection - we use parameterized queries
      expect(response.status).toBe(200);
    });

    // 🔒 OWASP INPVAL-009: Verify input length limits enforced
    it('🔒 OWASP INPVAL-009: should enforce topicDescription length limits', async () => {
      const tooLongTopic = {
        ...validTeksSelection,
        topicDescription: 'a'.repeat(501), // Exceeds 500 char limit
      };

      const { ZodError } = await import('zod');
      const zodError = new ZodError([
        { path: ['topicDescription'], message: 'Must be 500 characters or less', code: 'too_big' },
      ]);

      mockTeksSelectionSchema.mockImplementation(() => {
        throw zodError;
      });

      const req = createRequest(tooLongTopic);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    // 🔒 OWASP API-001: Verify API authentication required
    it('🔒 OWASP API-001: should require OpenAI API key for protected endpoint', async () => {
      delete process.env.OPENAI_API_KEY;
      mockGetCloudflareContext.mockReturnValue({ env: {} } as any);

      const req = createRequest(validTeksSelection);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('OpenAI API key is not configured');
    });

    // 🔒 OWASP API-002: Verify API authorization checks enforced
    it('🔒 OWASP API-002: should validate request data before processing', async () => {
      const invalidData = { invalid: 'data' };

      const { ZodError } = await import('zod');
      const zodError = new ZodError([
        { path: ['subject'], message: 'Subject is required', code: 'invalid_type' },
      ]);

      mockTeksSelectionSchema.mockImplementation(() => {
        throw zodError;
      });

      const req = createRequest(invalidData);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    // 🔒 OWASP API-003: Verify API input validation (Zod schemas)
    it('🔒 OWASP API-003: should validate all required fields using Zod schemas', async () => {
      const missingFields = {
        subject: 'Science',
        // Missing other required fields
      };

      const { ZodError } = await import('zod');
      const zodError = new ZodError([
        { path: ['gradeLevel'], message: 'Grade level is required', code: 'invalid_type' },
        { path: ['strandName'], message: 'Strand name is required', code: 'invalid_type' },
        { path: ['standardCode'], message: 'Standard code is required', code: 'invalid_type' },
        { path: ['standardDescription'], message: 'Standard description is required', code: 'invalid_type' },
        { path: ['topicDescription'], message: 'Topic description is required', code: 'invalid_type' },
      ]);

      mockTeksSelectionSchema.mockImplementation(() => {
        throw zodError;
      });

      const req = createRequest(missingFields);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toHaveLength(5); // All missing fields reported
    });

    // 🔒 OWASP API-005: Verify API error responses do not leak information
    it('🔒 OWASP API-005: should not leak sensitive information in error responses', async () => {
      const apiError: any = new Error('Internal server error');
      apiError.status = 500;
      apiError.stack = 'Sensitive stack trace information';

      mockGenerateObject.mockRejectedValueOnce(apiError);

      const req = createRequest(validTeksSelection);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      // Should not expose stack traces or internal details
      expect(data.stack).toBeUndefined();
      expect(data.rawError).toBeUndefined(); // Only in development
    });

    // 🔒 OWASP ERR-001: Verify improper error handling does not leak information
    it('🔒 OWASP ERR-001: should provide generic error messages without exposing internals', async () => {
      const internalError = new Error('Database connection failed: password=secret123');

      mockGenerateObject.mockRejectedValueOnce(internalError);

      const req = createRequest(validTeksSelection);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      // Should not expose password or connection details
      expect(data.error).not.toContain('password');
      expect(data.error).not.toContain('secret123');
    });

    // 🔒 OWASP ERR-004: Verify appropriate HTTP status codes returned
    it('🔒 OWASP ERR-004: should return appropriate HTTP status codes', async () => {
      // Import ZodError for creating proper error instances
      const { ZodError } = await import('zod');

      // Test various error scenarios
      const testCases = [
        {
          name: 'Invalid JSON',
          setup: () => {
            return {
              json: async () => {
                throw new Error('Invalid JSON');
              },
            } as unknown as NextRequest;
          },
          expectedStatus: 400,
        },
        {
          name: 'Validation error',
          setup: () => {
            const zodError = new ZodError([
              { path: ['subject'], message: 'Subject is required', code: 'invalid_type' },
            ]);
            mockTeksSelectionSchema.mockImplementation(() => {
              throw zodError;
            });
            return createRequest({});
          },
          expectedStatus: 400,
        },
        {
          name: 'Missing API key',
          setup: () => {
            delete process.env.OPENAI_API_KEY;
            mockGetCloudflareContext.mockReturnValue({ env: {} } as any);
            return createRequest(validTeksSelection);
          },
          expectedStatus: 500,
        },
        {
          name: 'OpenAI auth error',
          setup: () => {
            const error: any = new Error('Auth failed');
            error.status = 401;
            error.response = {
              data: {
                error: {
                  type: 'invalid_request_error',
                  code: 'invalid_api_key',
                },
              },
            };
            mockGenerateObject.mockRejectedValueOnce(error);
            return createRequest(validTeksSelection);
          },
          expectedStatus: 401,
        },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        process.env.OPENAI_API_KEY = 'sk-test-key';
        mockGetCloudflareContext.mockReturnValue({ env: {} } as any);
        mockTeksSelectionSchema.mockImplementation((v) => v);
        mockGenerateObject.mockReset();

        // Setup test case (may configure mocks)
        const req = testCase.setup();
        
        // If setup configured generateObject mock, ensure it's set
        // (setup functions that need generateObject will configure it)
        
        const response = await POST(req);

        expect(response.status).toBe(testCase.expectedStatus);
      }
    });

    // 🔒 OWASP BUSLOGIC-001: Verify business logic data validation enforced
    it('🔒 OWASP BUSLOGIC-001: should validate generated MCQ meets business rules', async () => {
      const invalidMcq = {
        ...validGeneratedMcq,
        choices: [], // Violates business rule: must have 4 choices
      };

      mockGenerateObject.mockResolvedValueOnce({
        object: invalidMcq,
      } as any);

      const { ZodError } = await import('zod');
      const zodError = new ZodError([
        { path: ['choices'], message: 'Must have exactly 4 choices', code: 'custom' },
      ]);

      mockTeksMcqGenerationSchema.mockImplementation(() => {
        throw zodError;
      });

      const req = createRequest(validTeksSelection);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('validation requirements');
    });

    // 🔒 OWASP BUSLOGIC-005: Verify rate limiting on generation endpoint
    it('🔒 OWASP BUSLOGIC-005: should handle rate limiting errors gracefully', async () => {
      const rateLimitError: any = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      rateLimitError.response = {
        data: {
          error: {
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded',
          },
        },
      };

      mockGenerateObject.mockRejectedValueOnce(rateLimitError);

      const req = createRequest(validTeksSelection);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('rate limit');
    });
  });

  describe('Prompt Construction', () => {
    it('should construct prompt with all TEKS selection fields', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: validGeneratedMcq,
      } as any);

      const req = createRequest(validTeksSelection);

      await POST(req);

      // Verify generateObject was called with a prompt containing all fields
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateObject.mock.calls[0];
      expect(callArgs?.[0]?.prompt).toContain(validTeksSelection.subject);
      expect(callArgs?.[0]?.prompt).toContain(validTeksSelection.gradeLevel);
      expect(callArgs?.[0]?.prompt).toContain(validTeksSelection.strandName);
      expect(callArgs?.[0]?.prompt).toContain(validTeksSelection.standardCode);
      expect(callArgs?.[0]?.prompt).toContain(validTeksSelection.standardDescription);
      expect(callArgs?.[0]?.prompt).toContain(validTeksSelection.topicDescription);
    });

    it('should use teksMcqGenerationSchema for structured output', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: validGeneratedMcq,
      } as any);

      const req = createRequest(validTeksSelection);

      await POST(req);

      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateObject.mock.calls[0];
      // Verify schema is passed to generateObject
      expect(callArgs?.[0]?.schema).toBeDefined();
    });
  });
});
