import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeQuery,
  executeQueryFirst,
  executeMutation,
  executeBatch,
  generateId,
} from '@/lib/d1-client';
import {
  createMcq,
  getMcqById,
  getMcqs,
  updateMcq,
  deleteMcq,
  verifyMcqOwnership,
} from './mcq-service';
import type { McqCreateInput, McqWithChoices } from '@/lib/schemas/mcq-schema';

// Mock the d1-client module
vi.mock('@/lib/d1-client', () => ({
  executeQuery: vi.fn(),
  executeQueryFirst: vi.fn(),
  executeMutation: vi.fn(),
  executeBatch: vi.fn(),
  generateId: vi.fn(() => 'mock-id-123'),
  getDatabase: vi.fn(),
}));

/**
 * Helper function to create mock database MCQ structure (snake_case)
 */
function createMockDbMcq(overrides?: Partial<{
  id: string;
  title: string;
  description: string | null;
  question_text: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}>): {
  id: string;
  title: string;
  description: string | null;
  question_text: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
} {
  return {
    id: 'mcq-id-123',
    title: 'Test MCQ',
    description: 'Test description',
    question_text: 'What is 2+2?',
    created_by_user_id: 'user-id-123',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Helper function to create mock database MCQ choice structure (snake_case)
 */
function createMockDbMcqChoice(overrides?: Partial<{
  id: string;
  mcq_id: string;
  choice_text: string;
  is_correct: number;
  display_order: number;
  created_at: string;
}>): {
  id: string;
  mcq_id: string;
  choice_text: string;
  is_correct: number;
  display_order: number;
  created_at: string;
} {
  return {
    id: 'choice-id-123',
    mcq_id: 'mcq-id-123',
    choice_text: 'Four',
    is_correct: 1,
    display_order: 0,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Helper function to create mock MCQ create input (camelCase)
 */
function createMockMcqCreateInput(overrides?: Partial<McqCreateInput>): McqCreateInput {
  return {
    title: 'Test MCQ',
    description: 'Test description',
    questionText: 'What is 2+2?',
    choices: [
      {
        choiceText: 'Three',
        isCorrect: false,
        displayOrder: 0,
      },
      {
        choiceText: 'Four',
        isCorrect: true,
        displayOrder: 1,
      },
    ],
    ...overrides,
  };
}

describe('mcq-service', () => {
  const mockDb = {} as D1Database;
  const mockUserId = 'user-id-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset generateId to return predictable IDs
    vi.mocked(generateId).mockReturnValue('mock-id-123');
    // Reset executeQuery mock
    vi.mocked(executeQuery).mockReset();
    vi.mocked(executeQueryFirst).mockReset();
    vi.mocked(executeBatch).mockReset();
    vi.mocked(executeMutation).mockReset();
  });

  describe('createMcq', () => {
    it('should successfully create MCQ with choices in transaction', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput();
      const mcqId = 'mcq-id-123';
      const choiceId1 = 'choice-id-1';
      const choiceId2 = 'choice-id-2';

      // Mock generateId to return different IDs for MCQ and choices
      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      // Mock executeBatch (transaction)
      vi.mocked(executeBatch).mockResolvedValueOnce([]);

      // Mock getMcqById (called after creation to fetch the created MCQ)
      const mockDbMcq = createMockDbMcq({ id: mcqId });
      const mockDbChoices = [
        createMockDbMcqChoice({
          id: choiceId1,
          mcq_id: mcqId,
          choice_text: 'Three',
          is_correct: 0,
          display_order: 0,
        }),
        createMockDbMcqChoice({
          id: choiceId2,
          mcq_id: mcqId,
          choice_text: 'Four',
          is_correct: 1,
          display_order: 1,
        }),
      ];

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(mockDbMcq);
      vi.mocked(executeQuery).mockResolvedValueOnce(mockDbChoices);

      // Act
      const result = await createMcq(mockDb, mockUserId, mcqData);

      // Assert
      // Verify executeBatch was called with correct statements
      expect(executeBatch).toHaveBeenCalledTimes(1);
      expect(executeBatch).toHaveBeenCalledWith(
        mockDb,
        expect.arrayContaining([
          // MCQ INSERT statement
          expect.objectContaining({
            sql: expect.stringContaining('INSERT INTO mcqs'),
            params: expect.arrayContaining([
              mcqId,
              mcqData.title,
              mcqData.description,
              mcqData.questionText,
              mockUserId,
            ]),
          }),
          // Choice 1 INSERT statement
          expect.objectContaining({
            sql: expect.stringContaining('INSERT INTO mcq_choices'),
            params: expect.arrayContaining([
              choiceId1,
              mcqId,
              'Three',
              0, // is_correct as integer
              0, // display_order
            ]),
          }),
          // Choice 2 INSERT statement
          expect.objectContaining({
            sql: expect.stringContaining('INSERT INTO mcq_choices'),
            params: expect.arrayContaining([
              choiceId2,
              mcqId,
              'Four',
              1, // is_correct as integer
              1, // display_order
            ]),
          }),
        ])
      );

      // Verify generateId was called correct number of times (1 for MCQ + 2 for choices)
      expect(generateId).toHaveBeenCalledTimes(3);

      // Verify getMcqById was called to fetch the created MCQ
      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('SELECT * FROM mcqs WHERE id = ?'),
        [mcqId]
      );

      // Verify result structure
      expect(result).toMatchObject({
        id: mcqId,
        title: mcqData.title,
        description: mcqData.description,
        questionText: mcqData.questionText,
        createdByUserId: mockUserId,
        choices: expect.arrayContaining([
          expect.objectContaining({
            choiceText: 'Three',
            isCorrect: false,
            displayOrder: 0,
          }),
          expect.objectContaining({
            choiceText: 'Four',
            isCorrect: true,
            displayOrder: 1,
          }),
        ]),
      });
    });

    it('should generate IDs for MCQ and all choices', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput({
        choices: [
          { choiceText: 'A', isCorrect: false, displayOrder: 0 },
          { choiceText: 'B', isCorrect: true, displayOrder: 1 },
          { choiceText: 'C', isCorrect: false, displayOrder: 2 },
        ],
      });
      const mcqId = 'generated-mcq-id';
      const choiceId1 = 'generated-choice-1';
      const choiceId2 = 'generated-choice-2';
      const choiceId3 = 'generated-choice-3';

      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2)
        .mockReturnValueOnce(choiceId3);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await createMcq(mockDb, mockUserId, mcqData);

      // Assert
      // Should generate 1 ID for MCQ + 3 IDs for choices = 4 total
      expect(generateId).toHaveBeenCalledTimes(4);
      
      // Verify IDs are used in the batch statements
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      expect(batchCall[0]!.params[0]).toBe(mcqId); // MCQ INSERT uses mcqId
      expect(batchCall[1]!.params[0]).toBe(choiceId1); // First choice uses choiceId1
      expect(batchCall[2]!.params[0]).toBe(choiceId2); // Second choice uses choiceId2
      expect(batchCall[3]!.params[0]).toBe(choiceId3); // Third choice uses choiceId3
    });

    it('should convert boolean isCorrect to integer (0/1) for database', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput({
        choices: [
          { choiceText: 'False', isCorrect: false, displayOrder: 0 },
          { choiceText: 'True', isCorrect: true, displayOrder: 1 },
        ],
      });
      const mcqId = 'mcq-id';
      const choiceId1 = 'choice-1';
      const choiceId2 = 'choice-2';

      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await createMcq(mockDb, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      // First choice has isCorrect: false, should be converted to 0
      expect(batchCall[1]!.params[3]).toBe(0);
      // Second choice has isCorrect: true, should be converted to 1
      expect(batchCall[2]!.params[3]).toBe(1);
    });

    it('should handle null description', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput({
        description: null,
      });
      const mcqId = 'mcq-id';
      const choiceId1 = 'choice-1';
      const choiceId2 = 'choice-2';

      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(
        createMockDbMcq({ id: mcqId, description: null })
      );
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      const result = await createMcq(mockDb, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      // Description should be null in the INSERT params
      expect(batchCall[0]!.params[2]).toBeNull();
      
      // Result should also have null description
      expect(result.description).toBeNull();
    });

    it('should handle undefined description (converts to null)', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput();
      delete mcqData.description; // Remove description to test undefined handling
      const mcqId = 'mcq-id';
      const choiceId1 = 'choice-1';
      const choiceId2 = 'choice-2';

      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(
        createMockDbMcq({ id: mcqId, description: null })
      );
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await createMcq(mockDb, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      // Undefined description should be converted to null
      expect(batchCall[0]!.params[2]).toBeNull();
    });

    it('should fetch created MCQ after insertion', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput();
      const mcqId = 'mcq-id';
      const choiceId1 = 'choice-1';
      const choiceId2 = 'choice-2';

      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      
      const mockDbMcq = createMockDbMcq({ id: mcqId });
      const mockDbChoices = [
        createMockDbMcqChoice({ id: choiceId1, mcq_id: mcqId }),
        createMockDbMcqChoice({ id: choiceId2, mcq_id: mcqId }),
      ];

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(mockDbMcq);
      vi.mocked(executeQuery).mockResolvedValueOnce(mockDbChoices);

      // Act
      await createMcq(mockDb, mockUserId, mcqData);

      // Assert
      // Verify getMcqById is called after executeBatch
      expect(executeBatch).toHaveBeenCalledBefore(executeQueryFirst as any);
      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('SELECT * FROM mcqs WHERE id = ?'),
        [mcqId]
      );
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('SELECT * FROM mcq_choices WHERE mcq_id = ?'),
        [mcqId]
      );
    });

    it('should throw error if MCQ retrieval fails after creation', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput();
      const mcqId = 'mcq-id';
      const choiceId1 = 'choice-1';
      const choiceId2 = 'choice-2';

      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      // Mock getMcqById to return null (MCQ not found after creation)
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      // Act & Assert
      await expect(createMcq(mockDb, mockUserId, mcqData)).rejects.toThrow(
        'Failed to retrieve created MCQ'
      );
    });

    it('should verify executeBatch is called with correct statements', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput({
        choices: [
          { choiceText: 'A', isCorrect: false, displayOrder: 0 },
          { choiceText: 'B', isCorrect: true, displayOrder: 1 },
        ],
      });
      const mcqId = 'mcq-id';
      const choiceId1 = 'choice-1';
      const choiceId2 = 'choice-2';

      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await createMcq(mockDb, mockUserId, mcqData);

      // Assert
      expect(executeBatch).toHaveBeenCalledTimes(1);
      const batchCall = vi.mocked(executeBatch).mock.calls[0];
      expect(batchCall[0]).toBe(mockDb);
      expect(batchCall[1]).toHaveLength(3); // 1 MCQ INSERT + 2 choice INSERTs
      
      // Verify first statement is MCQ INSERT
      expect(batchCall[1][0].sql).toContain('INSERT INTO mcqs');
      // Verify remaining statements are choice INSERTs
      expect(batchCall[1][1].sql).toContain('INSERT INTO mcq_choices');
      expect(batchCall[1][2].sql).toContain('INSERT INTO mcq_choices');
    });

    it('should verify generateId is called correct number of times', async () => {
      // Arrange - Test with different numbers of choices
      const testCases = [
        { choiceCount: 2, expectedCalls: 3 }, // 1 MCQ + 2 choices
        { choiceCount: 3, expectedCalls: 4 }, // 1 MCQ + 3 choices
        { choiceCount: 4, expectedCalls: 5 }, // 1 MCQ + 4 choices
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        
        const choices = Array.from({ length: testCase.choiceCount }, (_, i) => ({
          choiceText: `Choice ${i + 1}`,
          isCorrect: i === 0, // First choice is correct
          displayOrder: i,
        }));

        const mcqData = createMockMcqCreateInput({ choices });
        const mcqId = 'mcq-id';
        const choiceIds = Array.from({ length: testCase.choiceCount }, (_, i) => `choice-${i}`);

        vi.mocked(generateId)
          .mockReturnValueOnce(mcqId)
          .mockImplementationOnce(() => choiceIds.shift()!);

        vi.mocked(executeBatch).mockResolvedValueOnce([]);
        vi.mocked(executeQueryFirst).mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));
        vi.mocked(executeQuery).mockResolvedValueOnce([]);

        // Act
        await createMcq(mockDb, mockUserId, mcqData);

        // Assert
        expect(generateId).toHaveBeenCalledTimes(testCase.expectedCalls);
      }
    });

    it('should verify transaction includes INSERT for MCQ and all choices', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput({
        choices: [
          { choiceText: 'A', isCorrect: false, displayOrder: 0 },
          { choiceText: 'B', isCorrect: true, displayOrder: 1 },
          { choiceText: 'C', isCorrect: false, displayOrder: 2 },
        ],
      });
      const mcqId = 'mcq-id';
      const choiceIds = ['choice-1', 'choice-2', 'choice-3'];

      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceIds[0])
        .mockReturnValueOnce(choiceIds[1])
        .mockReturnValueOnce(choiceIds[2]);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await createMcq(mockDb, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      
      // Should have 1 MCQ INSERT + 3 choice INSERTs = 4 statements total
      expect(batchCall).toHaveLength(4);
      
      // First statement should be MCQ INSERT
      expect(batchCall[0].sql).toContain('INSERT INTO mcqs');
      expect(batchCall[0].params).toContain(mcqId);
      
      // Remaining statements should be choice INSERTs
      for (let i = 0; i < 3; i++) {
        expect(batchCall[i + 1].sql).toContain('INSERT INTO mcq_choices');
        expect(batchCall[i + 1].params).toContain(choiceIds[i]);
        expect(batchCall[i + 1].params).toContain(mcqId);
      }
    });

    it('should verify SQL uses anonymous ? placeholders', async () => {
      // Arrange
      const mcqData = createMockMcqCreateInput();
      const mcqId = 'mcq-id';
      const choiceId1 = 'choice-1';
      const choiceId2 = 'choice-2';

      vi.mocked(generateId)
        .mockReturnValueOnce(mcqId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await createMcq(mockDb, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      
      // MCQ INSERT SQL should use anonymous ? placeholders
      expect(batchCall[0].sql).toMatch(/\?/); // Contains ?
      expect(batchCall[0].sql).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.
      
      // Choice INSERT SQL should use anonymous ? placeholders
      for (let i = 1; i < batchCall.length; i++) {
        expect(batchCall[i].sql).toMatch(/\?/); // Contains ?
        expect(batchCall[i].sql).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.
      }
    });
  });

  describe('getMcqById', () => {
    it('should return MCQ with choices when found', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mockDbMcq = createMockDbMcq({ id: mcqId });
      const mockDbChoices = [
        createMockDbMcqChoice({
          id: 'choice-1',
          mcq_id: mcqId,
          choice_text: 'Choice A',
          is_correct: 0,
          display_order: 0,
        }),
        createMockDbMcqChoice({
          id: 'choice-2',
          mcq_id: mcqId,
          choice_text: 'Choice B',
          is_correct: 1,
          display_order: 1,
        }),
      ];

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(mockDbMcq);
      vi.mocked(executeQuery).mockResolvedValueOnce(mockDbChoices);

      // Act
      const result = await getMcqById(mockDb, mcqId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mcqId);
      expect(result?.choices).toHaveLength(2);
      expect(result?.choices[0].choiceText).toBe('Choice A');
      expect(result?.choices[0].isCorrect).toBe(false);
      expect(result?.choices[1].choiceText).toBe('Choice B');
      expect(result?.choices[1].isCorrect).toBe(true);
    });

    it('should return null when MCQ not found', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      // Act
      const result = await getMcqById(mockDb, 'non-existent-id');

      // Assert
      expect(result).toBeNull();
      expect(executeQuery).not.toHaveBeenCalled(); // Should not fetch choices if MCQ not found
    });

    it('should fetch choices ordered by display_order', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mockDbMcq = createMockDbMcq({ id: mcqId });
      const mockDbChoices = [
        createMockDbMcqChoice({
          id: 'choice-3',
          mcq_id: mcqId,
          display_order: 2,
        }),
        createMockDbMcqChoice({
          id: 'choice-1',
          mcq_id: mcqId,
          display_order: 0,
        }),
        createMockDbMcqChoice({
          id: 'choice-2',
          mcq_id: mcqId,
          display_order: 1,
        }),
      ];

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(mockDbMcq);
      vi.mocked(executeQuery).mockResolvedValueOnce(mockDbChoices);

      // Act
      const result = await getMcqById(mockDb, mcqId);

      // Assert
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('ORDER BY display_order ASC'),
        [mcqId]
      );
      expect(result?.choices).toHaveLength(3);
    });

    it('should transform database structure (snake_case) to API structure (camelCase)', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mockDbMcq = createMockDbMcq({
        id: mcqId,
        question_text: 'Test question',
        created_by_user_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      });
      const mockDbChoices = [
        createMockDbMcqChoice({
          mcq_id: mcqId,
          choice_text: 'Test choice',
          is_correct: 1,
          display_order: 0,
        }),
      ];

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(mockDbMcq);
      vi.mocked(executeQuery).mockResolvedValueOnce(mockDbChoices);

      // Act
      const result = await getMcqById(mockDb, mcqId);

      // Assert
      expect(result).toMatchObject({
        questionText: 'Test question', // camelCase
        createdByUserId: 'user-123', // camelCase
        createdAt: '2025-01-01T00:00:00Z', // camelCase
        updatedAt: '2025-01-02T00:00:00Z', // camelCase
        choices: [
          {
            mcqId: mcqId, // camelCase
            choiceText: 'Test choice', // camelCase
            displayOrder: 0, // camelCase
          },
        ],
      });
    });

    it('should convert is_correct (0/1) to isCorrect (boolean)', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mockDbMcq = createMockDbMcq({ id: mcqId });
      const mockDbChoices = [
        createMockDbMcqChoice({
          mcq_id: mcqId,
          is_correct: 0,
        }),
        createMockDbMcqChoice({
          mcq_id: mcqId,
          is_correct: 1,
        }),
      ];

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(mockDbMcq);
      vi.mocked(executeQuery).mockResolvedValueOnce(mockDbChoices);

      // Act
      const result = await getMcqById(mockDb, mcqId);

      // Assert
      expect(result?.choices[0].isCorrect).toBe(false);
      expect(result?.choices[1].isCorrect).toBe(true);
    });

    it('should handle MCQ with no choices (empty array)', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mockDbMcq = createMockDbMcq({ id: mcqId });

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(mockDbMcq);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      const result = await getMcqById(mockDb, mcqId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.choices).toEqual([]);
    });

    it('should verify SQL uses anonymous ? placeholders', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mockDbMcq = createMockDbMcq({ id: mcqId });

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(mockDbMcq);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqById(mockDb, mcqId);

      // Assert
      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringMatching(/\?/), // Contains ?
        expect.any(Array)
      );
      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.not.stringMatching(/\?[0-9]/), // Does not contain ?1, ?2, etc.
        expect.any(Array)
      );
    });
  });

  describe('getMcqs', () => {
    it('should return paginated results with default pagination (page 1, limit 10)', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 25 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      const result = await getMcqs(mockDb);

      // Assert
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3); // Math.ceil(25/10) = 3
    });

    it('should respect custom page and limit parameters', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 50 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      const result = await getMcqs(mockDb, { page: 2, limit: 20 });

      // Assert
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBe(3); // Math.ceil(50/20) = 3
      
      // Verify LIMIT and OFFSET are correct (offset = (2-1) * 20 = 20)
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([20, 20])
      );
    });

    it('should enforce maximum limit of 100 per page', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 200 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      const result = await getMcqs(mockDb, { limit: 150 }); // Request 150, should cap at 100

      // Assert
      expect(result.pagination.limit).toBe(100);
      
      // Verify LIMIT is capped at 100
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([100, expect.any(Number)])
      );
    });

    it('should filter by userId when provided', async () => {
      // Arrange
      const userId = 'user-123';
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 5 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqs(mockDb, { userId });

      // Assert
      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('WHERE created_by_user_id = ?'),
        [userId]
      );
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('WHERE created_by_user_id = ?'),
        expect.arrayContaining([userId])
      );
    });

    it('should search across title, description, and question_text (case-insensitive)', async () => {
      // Arrange
      const searchTerm = 'Test';
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 3 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqs(mockDb, { search: searchTerm });

      // Assert
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(question_text) LIKE ?'),
        expect.arrayContaining([searchPattern, searchPattern, searchPattern])
      );
    });

    it('should sort by title ascending', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 10 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqs(mockDb, { sort: 'title', order: 'asc' });

      // Assert
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('ORDER BY title ASC'),
        expect.any(Array)
      );
    });

    it('should sort by title descending', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 10 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqs(mockDb, { sort: 'title', order: 'desc' });

      // Assert
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('ORDER BY title DESC'),
        expect.any(Array)
      );
    });

    it('should sort by createdAt ascending', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 10 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqs(mockDb, { sort: 'createdAt', order: 'asc' });

      // Assert
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('ORDER BY created_at ASC'),
        expect.any(Array)
      );
    });

    it('should sort by createdAt descending', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 10 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqs(mockDb, { sort: 'createdAt', order: 'desc' });

      // Assert
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });

    it('should default to createdAt DESC when invalid sort provided', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 10 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqs(mockDb, { sort: 'invalidSort' });

      // Assert
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });

    it('should fetch choices for all MCQs in batch', async () => {
      // Arrange
      const mockMcqs = [
        createMockDbMcq({ id: 'mcq-1' }),
        createMockDbMcq({ id: 'mcq-2' }),
      ];
      const mockChoices = [
        createMockDbMcqChoice({ mcq_id: 'mcq-1' }),
        createMockDbMcqChoice({ mcq_id: 'mcq-2' }),
      ];

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 2 });
      // Setup executeQuery to return MCQs first, then choices
      vi.mocked(executeQuery)
        .mockResolvedValueOnce(mockMcqs) // First call: fetch MCQs
        .mockResolvedValueOnce(mockChoices); // Second call: fetch choices

      // Act
      const result = await getMcqs(mockDb);

      // Assert
      // Should fetch choices with IN clause for all MCQ IDs (second call to executeQuery)
      // Note: executeQuery is called twice - once for MCQs, once for choices
      expect(executeQuery).toHaveBeenCalledTimes(2);
      // Check second call (for choices) - it should have WHERE mcq_id IN clause
      const calls = vi.mocked(executeQuery).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
      const choicesCall = calls[1];
      expect(choicesCall[1]).toContain('WHERE mcq_id IN');
      expect(choicesCall[2]).toEqual(['mcq-1', 'mcq-2']);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.choices).toHaveLength(1);
      expect(result.data[1]?.choices).toHaveLength(1);
    });

    it('should group choices by MCQ ID correctly', async () => {
      // Arrange
      const mockMcqs = [
        createMockDbMcq({ id: 'mcq-1' }),
        createMockDbMcq({ id: 'mcq-2' }),
      ];
      const mockChoices = [
        createMockDbMcqChoice({ mcq_id: 'mcq-1', choice_text: 'Choice 1A' }),
        createMockDbMcqChoice({ mcq_id: 'mcq-1', choice_text: 'Choice 1B' }),
        createMockDbMcqChoice({ mcq_id: 'mcq-2', choice_text: 'Choice 2A' }),
      ];

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 2 });
      // Setup executeQuery to return MCQs first, then choices
      vi.mocked(executeQuery)
        .mockResolvedValueOnce(mockMcqs) // First call: fetch MCQs
        .mockResolvedValueOnce(mockChoices); // Second call: fetch choices

      // Act
      const result = await getMcqs(mockDb);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toBeDefined();
      expect(result.data[0]!.choices).toHaveLength(2);
      expect(result.data[0]!.choices[0]!.choiceText).toBe('Choice 1A');
      expect(result.data[0]!.choices[1]!.choiceText).toBe('Choice 1B');
      expect(result.data[1]).toBeDefined();
      expect(result.data[1]!.choices).toHaveLength(1);
      expect(result.data[1]!.choices[0]!.choiceText).toBe('Choice 2A');
    });

    it('should calculate totalPages correctly', async () => {
      // Arrange
      const testCases = [
        { total: 0, limit: 10, expectedPages: 0 },
        { total: 10, limit: 10, expectedPages: 1 },
        { total: 11, limit: 10, expectedPages: 2 },
        { total: 25, limit: 10, expectedPages: 3 },
        { total: 100, limit: 10, expectedPages: 10 },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: testCase.total });
        vi.mocked(executeQuery).mockResolvedValueOnce([]);
        vi.mocked(executeQuery).mockResolvedValueOnce([]);

        // Act
        const result = await getMcqs(mockDb, { limit: testCase.limit });

        // Assert
        expect(result.pagination.totalPages).toBe(testCase.expectedPages);
      }
    });

    it('should return empty array when no MCQs found', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 0 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      const result = await getMcqs(mockDb);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should verify correct SQL placeholders are used (anonymous ?)', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 10 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqs(mockDb, { search: 'test', userId: 'user-123' });

      // Assert
      const countCall = vi.mocked(executeQueryFirst).mock.calls[0];
      expect(countCall[1]).toMatch(/\?/); // Contains ?
      expect(countCall[1]).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.
    });

    it('should verify WHERE clause construction with multiple conditions', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 5 });
      vi.mocked(executeQuery).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getMcqs(mockDb, { search: 'test', userId: 'user-123' });

      // Assert
      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('WHERE'),
        expect.arrayContaining([
          expect.stringContaining('%test%'),
          expect.stringContaining('%test%'),
          expect.stringContaining('%test%'),
          'user-123',
        ])
      );
    });
  });

  describe('updateMcq', () => {
    it('should update MCQ successfully when user owns it', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput({
        title: 'Updated Title',
        questionText: 'Updated Question',
      });
      const choiceId1 = 'new-choice-1';
      const choiceId2 = 'new-choice-2';

      // Mock ownership verification
      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 }) // verifyMcqOwnership returns true
        .mockResolvedValueOnce(createMockDbMcq({ id: mcqId, title: 'Updated Title' })); // getMcqById

      vi.mocked(generateId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      const result = await updateMcq(mockDb, mcqId, mockUserId, mcqData);

      // Assert
      expect(result).not.toBeNull();
      expect(executeBatch).toHaveBeenCalledTimes(1);
    });

    it('should verify ownership before updating', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput();

      // Mock ownership verification returns false
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 0 });

      // Act & Assert
      await expect(updateMcq(mockDb, mcqId, mockUserId, mcqData)).rejects.toThrow(
        'You do not have permission to update this MCQ'
      );
      expect(executeBatch).not.toHaveBeenCalled();
    });

    it('should throw error when user does not own MCQ', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const differentUserId = 'different-user';
      const mcqData = createMockMcqCreateInput();

      // Mock ownership verification returns false
      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 0 });

      // Act & Assert
      await expect(updateMcq(mockDb, mcqId, differentUserId, mcqData)).rejects.toThrow(
        'You do not have permission to update this MCQ'
      );
    });

    it('should delete old choices and insert new ones in transaction', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput({
        choices: [
          { choiceText: 'New A', isCorrect: false, displayOrder: 0 },
          { choiceText: 'New B', isCorrect: true, displayOrder: 1 },
        ],
      });
      const choiceId1 = 'new-choice-1';
      const choiceId2 = 'new-choice-2';

      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 }) // Ownership check
        .mockResolvedValueOnce(createMockDbMcq({ id: mcqId })); // getMcqById

      vi.mocked(generateId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await updateMcq(mockDb, mcqId, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      expect(batchCall[0].sql).toContain('UPDATE mcqs'); // UPDATE statement
      expect(batchCall[1].sql).toContain('DELETE FROM mcq_choices'); // DELETE statement
      expect(batchCall[2].sql).toContain('INSERT INTO mcq_choices'); // First INSERT
      expect(batchCall[3].sql).toContain('INSERT INTO mcq_choices'); // Second INSERT
    });

    it('should generate new IDs for updated choices', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput({
        choices: [
          { choiceText: 'A', isCorrect: false, displayOrder: 0 },
          { choiceText: 'B', isCorrect: true, displayOrder: 1 },
        ],
      });
      const choiceId1 = 'new-id-1';
      const choiceId2 = 'new-id-2';

      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));

      vi.mocked(generateId)
        .mockReturnValueOnce(choiceId1)
        .mockReturnValueOnce(choiceId2);

      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await updateMcq(mockDb, mcqId, mockUserId, mcqData);

      // Assert
      expect(generateId).toHaveBeenCalledTimes(2);
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      expect(batchCall[2]!.params[0]).toBe(choiceId1);
      expect(batchCall[3]!.params[0]).toBe(choiceId2);
    });

    it('should update MCQ fields (title, description, question_text)', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput({
        title: 'New Title',
        description: 'New Description',
        questionText: 'New Question',
      });

      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));

      vi.mocked(generateId).mockReturnValue('choice-id');
      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await updateMcq(mockDb, mcqId, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      expect(batchCall[0].params).toContain('New Title');
      expect(batchCall[0].params).toContain('New Description');
      expect(batchCall[0].params).toContain('New Question');
    });

    it('should handle null description', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput({
        description: null,
      });

      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce(createMockDbMcq({ id: mcqId, description: null }));

      vi.mocked(generateId).mockReturnValue('choice-id');
      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await updateMcq(mockDb, mcqId, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      expect(batchCall[0]!.params[1]).toBeNull();
    });

    it('should fetch updated MCQ after transaction', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput();

      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 }) // Ownership check
        .mockResolvedValueOnce(createMockDbMcq({ id: mcqId })); // getMcqById after update

      vi.mocked(generateId).mockReturnValue('choice-id');
      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await updateMcq(mockDb, mcqId, mockUserId, mcqData);

      // Assert
      // Verify executeBatch was called (for UPDATE/DELETE/INSERT)
      expect(executeBatch).toHaveBeenCalledTimes(1);
      // Verify getMcqById was called after executeBatch (check call order)
      const batchCallOrder = vi.mocked(executeBatch).mock.invocationCallOrder[0];
      const getMcqCallOrder = vi.mocked(executeQueryFirst).mock.invocationCallOrder[1];
      expect(getMcqCallOrder).toBeGreaterThan(batchCallOrder);
      expect(executeQueryFirst).toHaveBeenCalledTimes(2); // Ownership + getMcqById
    });

    it('should throw error if MCQ retrieval fails after update', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput();

      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 }) // Ownership check
        .mockResolvedValueOnce(null); // getMcqById returns null

      vi.mocked(generateId).mockReturnValue('choice-id');
      vi.mocked(executeBatch).mockResolvedValueOnce([]);

      // Act & Assert
      await expect(updateMcq(mockDb, mcqId, mockUserId, mcqData)).rejects.toThrow(
        'Failed to retrieve updated MCQ'
      );
    });

    it('should verify executeBatch includes UPDATE, DELETE, and INSERT statements', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput({
        choices: [
          { choiceText: 'A', isCorrect: false, displayOrder: 0 },
          { choiceText: 'B', isCorrect: true, displayOrder: 1 },
        ],
      });

      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));

      vi.mocked(generateId).mockReturnValue('choice-id');
      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await updateMcq(mockDb, mcqId, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      expect(batchCall).toHaveLength(4); // UPDATE + DELETE + 2 INSERTs
      expect(batchCall[0].sql).toContain('UPDATE mcqs');
      expect(batchCall[1].sql).toContain('DELETE FROM mcq_choices');
      expect(batchCall[2].sql).toContain('INSERT INTO mcq_choices');
      expect(batchCall[3].sql).toContain('INSERT INTO mcq_choices');
    });

    it('should verify statements are in correct order (UPDATE → DELETE → INSERT)', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput({
        choices: [
          { choiceText: 'A', isCorrect: false, displayOrder: 0 },
        ],
      });

      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));

      vi.mocked(generateId).mockReturnValue('choice-id');
      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await updateMcq(mockDb, mcqId, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      expect(batchCall[0].sql).toContain('UPDATE');
      expect(batchCall[1].sql).toContain('DELETE');
      expect(batchCall[2].sql).toContain('INSERT');
    });

    it('should verify SQL uses anonymous ? placeholders', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const mcqData = createMockMcqCreateInput();

      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce(createMockDbMcq({ id: mcqId }));

      vi.mocked(generateId).mockReturnValue('choice-id');
      vi.mocked(executeBatch).mockResolvedValueOnce([]);
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await updateMcq(mockDb, mcqId, mockUserId, mcqData);

      // Assert
      const batchCall = vi.mocked(executeBatch).mock.calls[0][1];
      for (const statement of batchCall) {
        expect(statement.sql).toMatch(/\?/); // Contains ?
        expect(statement.sql).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.
      }
    });
  });

  describe('deleteMcq', () => {
    it('should delete MCQ successfully when user owns it', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 1 }); // Ownership check
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      await deleteMcq(mockDb, mcqId, mockUserId);

      // Assert
      expect(executeMutation).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('DELETE FROM mcqs WHERE id = ?'),
        [mcqId]
      );
    });

    it('should verify ownership before deleting', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 0 }); // Ownership check fails

      // Act & Assert
      await expect(deleteMcq(mockDb, mcqId, mockUserId)).rejects.toThrow(
        'You do not have permission to delete this MCQ'
      );
      expect(executeMutation).not.toHaveBeenCalled();
    });

    it('should throw error when user does not own MCQ', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';
      const differentUserId = 'different-user';

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 0 });

      // Act & Assert
      await expect(deleteMcq(mockDb, mcqId, differentUserId)).rejects.toThrow(
        'You do not have permission to delete this MCQ'
      );
    });

    it('should call executeMutation with correct SQL and params', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 1 });
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      await deleteMcq(mockDb, mcqId, mockUserId);

      // Assert
      expect(executeMutation).toHaveBeenCalledTimes(1);
      expect(executeMutation).toHaveBeenCalledWith(
        mockDb,
        'DELETE FROM mcqs WHERE id = ?',
        [mcqId]
      );
    });

    it('should verify SQL uses anonymous ? placeholders', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 1 });
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      await deleteMcq(mockDb, mcqId, mockUserId);

      // Assert
      const mutationCall = vi.mocked(executeMutation).mock.calls[0];
      expect(mutationCall[1]).toMatch(/\?/); // Contains ?
      expect(mutationCall[1]).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.
    });
  });

  describe('verifyMcqOwnership', () => {
    it('should return true when user owns MCQ', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 1 });

      // Act
      const result = await verifyMcqOwnership(mockDb, mcqId, mockUserId);

      // Assert
      expect(result).toBe(true);
      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('SELECT COUNT(*)'),
        [mcqId, mockUserId]
      );
    });

    it('should return false when user does not own MCQ', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 0 });

      // Act
      const result = await verifyMcqOwnership(mockDb, mcqId, mockUserId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when MCQ does not exist', async () => {
      // Arrange
      const mcqId = 'non-existent-id';

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 0 });

      // Act
      const result = await verifyMcqOwnership(mockDb, mcqId, mockUserId);

      // Assert
      expect(result).toBe(false);
    });

    it('should use COUNT query for efficient check', async () => {
      // Arrange
      const mcqId = 'mcq-id-123';

      vi.mocked(executeQueryFirst).mockResolvedValueOnce({ count: 1 });

      // Act
      await verifyMcqOwnership(mockDb, mcqId, mockUserId);

      // Assert
      expect(executeQueryFirst).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('COUNT(*)'),
        [mcqId, mockUserId]
      );
    });
  });
});
