import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeQuery,
  executeQueryFirst,
  executeMutation,
  generateId,
} from '@/lib/d1-client';
import {
  recordAttempt,
  getAttemptsByMcq,
  getAttemptsByUser,
} from './mcq-attempt-service';
import type { McqAttempt } from '@/lib/schemas/mcq-schema';

// Mock the d1-client module
vi.mock('@/lib/d1-client', () => ({
  executeQuery: vi.fn(),
  executeQueryFirst: vi.fn(),
  executeMutation: vi.fn(),
  generateId: vi.fn(() => 'mock-id-123'),
  getDatabase: vi.fn(),
}));

/**
 * Helper function to create mock database MCQ choice structure (snake_case)
 */
function createMockDbMcqChoice(overrides?: Partial<{
  id: string;
  mcq_id: string;
  is_correct: number;
}>): {
  id: string;
  mcq_id: string;
  is_correct: number;
} {
  return {
    id: 'choice-id-123',
    mcq_id: 'mcq-id-123',
    is_correct: 1,
    ...overrides,
  };
}

/**
 * Helper function to create mock database MCQ attempt structure (snake_case)
 */
function createMockDbMcqAttempt(overrides?: Partial<{
  id: string;
  mcq_id: string;
  user_id: string;
  selected_choice_id: string;
  is_correct: number;
  attempted_at: string;
}>): {
  id: string;
  mcq_id: string;
  user_id: string;
  selected_choice_id: string;
  is_correct: number;
  attempted_at: string;
} {
  return {
    id: 'attempt-id-123',
    mcq_id: 'mcq-id-123',
    user_id: 'user-id-123',
    selected_choice_id: 'choice-id-123',
    is_correct: 1,
    attempted_at: '2025-01-01T10:00:00Z',
    ...overrides,
  };
}

describe('mcq-attempt-service', () => {
  const mockDb = {} as D1Database;
  const mockUserId = 'user-id-123';
  const mockMcqId = 'mcq-id-123';
  const mockChoiceId = 'choice-id-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset generateId to return predictable IDs
    vi.mocked(generateId).mockReturnValue('mock-id-123');
    // Reset mocks
    vi.mocked(executeQuery).mockReset();
    vi.mocked(executeQueryFirst).mockReset();
    vi.mocked(executeMutation).mockReset();
  });

  describe('recordAttempt', () => {
    it('should records attempt successfully with correct choice', async () => {
      // Arrange
      const attemptId = 'attempt-id-123';
      const mockChoice = createMockDbMcqChoice({
        id: mockChoiceId,
        mcq_id: mockMcqId,
        is_correct: 1,
      });
      const mockAttempt = createMockDbMcqAttempt({
        id: attemptId,
        mcq_id: mockMcqId,
        user_id: mockUserId,
        selected_choice_id: mockChoiceId,
        is_correct: 1,
      });

      vi.mocked(generateId).mockReturnValueOnce(attemptId);
      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce(mockChoice) // Choice validation
        .mockResolvedValueOnce(mockAttempt); // Attempt retrieval
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      const result = await recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId);

      // Assert
      expect(executeQueryFirst).toHaveBeenCalledTimes(2);
      expect(executeQueryFirst).toHaveBeenNthCalledWith(
        1,
        mockDb,
        expect.stringContaining('SELECT id, mcq_id, is_correct FROM mcq_choices WHERE id = ?'),
        [mockChoiceId]
      );
      expect(generateId).toHaveBeenCalledTimes(1);
      expect(executeMutation).toHaveBeenCalledTimes(1);
      expect(executeMutation).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('INSERT INTO mcq_attempts'),
        [attemptId, mockMcqId, mockUserId, mockChoiceId, 1]
      );
      expect(executeQueryFirst).toHaveBeenNthCalledWith(
        2,
        mockDb,
        expect.stringContaining('SELECT * FROM mcq_attempts WHERE id = ?'),
        [attemptId]
      );
      expect(result.isCorrect).toBe(true);
      expect(result.mcqId).toBe(mockMcqId);
      expect(result.userId).toBe(mockUserId);
      expect(result.selectedChoiceId).toBe(mockChoiceId);
    });

    it('should records attempt successfully with incorrect choice', async () => {
      // Arrange
      const attemptId = 'attempt-id-123';
      const mockChoice = createMockDbMcqChoice({
        id: mockChoiceId,
        mcq_id: mockMcqId,
        is_correct: 0,
      });
      const mockAttempt = createMockDbMcqAttempt({
        id: attemptId,
        mcq_id: mockMcqId,
        user_id: mockUserId,
        selected_choice_id: mockChoiceId,
        is_correct: 0,
      });

      vi.mocked(generateId).mockReturnValueOnce(attemptId);
      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce(mockChoice) // Choice validation
        .mockResolvedValueOnce(mockAttempt); // Attempt retrieval
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      const result = await recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId);

      // Assert
      expect(executeMutation).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('INSERT INTO mcq_attempts'),
        [attemptId, mockMcqId, mockUserId, mockChoiceId, 0]
      );
      expect(result.isCorrect).toBe(false);
    });

    it('should validates choice belongs to MCQ before recording', async () => {
      // Arrange
      const attemptId = 'attempt-id-123';
      const mockChoice = createMockDbMcqChoice({
        id: mockChoiceId,
        mcq_id: mockMcqId, // Matches provided mcqId
        is_correct: 1,
      });
      const mockAttempt = createMockDbMcqAttempt({
        id: attemptId,
        mcq_id: mockMcqId,
        user_id: mockUserId,
        selected_choice_id: mockChoiceId,
        is_correct: 1,
      });

      vi.mocked(generateId).mockReturnValueOnce(attemptId);
      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce(mockChoice)
        .mockResolvedValueOnce(mockAttempt);
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      await recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId);

      // Assert
      expect(executeQueryFirst).toHaveBeenNthCalledWith(
        1,
        mockDb,
        expect.stringContaining('SELECT id, mcq_id, is_correct FROM mcq_choices WHERE id = ?'),
        [mockChoiceId]
      );
      expect(executeMutation).toHaveBeenCalled();
    });

    it('should throws error if choice does not belong to MCQ', async () => {
      // Arrange
      const differentMcqId = 'different-mcq-id';
      const mockChoice = createMockDbMcqChoice({
        id: mockChoiceId,
        mcq_id: differentMcqId, // Different from provided mcqId
        is_correct: 1,
      });

      vi.mocked(executeQueryFirst).mockResolvedValueOnce(mockChoice);

      // Act & Assert
      await expect(
        recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId)
      ).rejects.toThrow('Choice does not belong to this MCQ');
      expect(executeMutation).not.toHaveBeenCalled();
    });

    it('should throws error if choice not found', async () => {
      // Arrange
      vi.mocked(executeQueryFirst).mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId)
      ).rejects.toThrow('Choice not found');
      expect(executeMutation).not.toHaveBeenCalled();
    });

    it('should converts boolean isCorrect to integer (0/1) for database', async () => {
      // Arrange
      const attemptId = 'attempt-id-123';
      
      // Test correct choice (is_correct: 1)
      const correctChoice = createMockDbMcqChoice({
        id: mockChoiceId,
        mcq_id: mockMcqId,
        is_correct: 1,
      });
      const correctAttempt = createMockDbMcqAttempt({
        id: attemptId,
        is_correct: 1,
      });

      vi.mocked(generateId).mockReturnValueOnce(attemptId);
      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce(correctChoice)
        .mockResolvedValueOnce(correctAttempt);
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      await recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId);

      // Assert - Correct choice should insert 1
      expect(executeMutation).toHaveBeenCalledWith(
        mockDb,
        expect.any(String),
        expect.arrayContaining([expect.any(String), expect.any(String), expect.any(String), expect.any(String), 1])
      );

      // Reset mocks for incorrect choice test
      vi.clearAllMocks();
      const incorrectAttemptId = 'attempt-id-456';
      const incorrectChoice = createMockDbMcqChoice({
        id: mockChoiceId,
        mcq_id: mockMcqId,
        is_correct: 0,
      });
      const incorrectAttempt = createMockDbMcqAttempt({
        id: incorrectAttemptId,
        is_correct: 0,
      });

      vi.mocked(generateId).mockReturnValueOnce(incorrectAttemptId);
      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce(incorrectChoice)
        .mockResolvedValueOnce(incorrectAttempt);
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      await recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId);

      // Assert - Incorrect choice should insert 0
      expect(executeMutation).toHaveBeenCalledWith(
        mockDb,
        expect.any(String),
        expect.arrayContaining([expect.any(String), expect.any(String), expect.any(String), expect.any(String), 0])
      );
    });

    it('should returns attempt record with correct result', async () => {
      // Arrange
      const attemptId = 'attempt-id-123';
      const mockChoice = createMockDbMcqChoice({
        id: mockChoiceId,
        mcq_id: mockMcqId,
        is_correct: 1,
      });
      const mockAttempt = createMockDbMcqAttempt({
        id: attemptId,
        mcq_id: mockMcqId,
        user_id: mockUserId,
        selected_choice_id: mockChoiceId,
        is_correct: 1,
        attempted_at: '2025-01-01T10:00:00Z',
      });

      vi.mocked(generateId).mockReturnValueOnce(attemptId);
      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce(mockChoice)
        .mockResolvedValueOnce(mockAttempt);
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      const result = await recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId);

      // Assert
      expect(result).toEqual({
        id: attemptId,
        mcqId: mockMcqId,
        userId: mockUserId,
        selectedChoiceId: mockChoiceId,
        isCorrect: true,
        attemptedAt: '2025-01-01T10:00:00Z',
      });
      expect(typeof result.isCorrect).toBe('boolean');
    });

    it('should throws error if attempt record retrieval fails', async () => {
      // Arrange
      const attemptId = 'attempt-id-123';
      const mockChoice = createMockDbMcqChoice({
        id: mockChoiceId,
        mcq_id: mockMcqId,
        is_correct: 1,
      });

      vi.mocked(generateId).mockReturnValueOnce(attemptId);
      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce(mockChoice) // Choice validation succeeds
        .mockResolvedValueOnce(null); // Attempt retrieval fails
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act & Assert
      await expect(
        recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId)
      ).rejects.toThrow('Failed to retrieve attempt record');
    });

    it('should verifies SQL uses anonymous ? placeholders', async () => {
      // Arrange
      const attemptId = 'attempt-id-123';
      const mockChoice = createMockDbMcqChoice({
        id: mockChoiceId,
        mcq_id: mockMcqId,
        is_correct: 1,
      });
      const mockAttempt = createMockDbMcqAttempt({
        id: attemptId,
        is_correct: 1,
      });

      vi.mocked(generateId).mockReturnValueOnce(attemptId);
      vi.mocked(executeQueryFirst)
        .mockResolvedValueOnce(mockChoice)
        .mockResolvedValueOnce(mockAttempt);
      vi.mocked(executeMutation).mockResolvedValueOnce({} as any);

      // Act
      await recordAttempt(mockDb, mockUserId, mockMcqId, mockChoiceId);

      // Assert - Check choice validation query
      const choiceQueryCall = vi.mocked(executeQueryFirst).mock.calls[0];
      expect(choiceQueryCall[1]).toMatch(/\?/); // Contains ?
      expect(choiceQueryCall[1]).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.

      // Assert - Check INSERT query
      const insertCall = vi.mocked(executeMutation).mock.calls[0];
      expect(insertCall[1]).toMatch(/\?/); // Contains ?
      expect(insertCall[1]).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.

      // Assert - Check attempt retrieval query
      const attemptQueryCall = vi.mocked(executeQueryFirst).mock.calls[1];
      expect(attemptQueryCall[1]).toMatch(/\?/); // Contains ?
      expect(attemptQueryCall[1]).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.
    });
  });

  describe('getAttemptsByMcq', () => {
    it('should returns all attempts for MCQ when userId not provided', async () => {
      // Arrange
      const mockAttempt1 = createMockDbMcqAttempt({
        id: 'attempt-1',
        user_id: 'user-1',
        is_correct: 1,
      });
      const mockAttempt2 = createMockDbMcqAttempt({
        id: 'attempt-2',
        user_id: 'user-2',
        is_correct: 0,
      });

      vi.mocked(executeQuery).mockResolvedValueOnce([mockAttempt1, mockAttempt2]);

      // Act
      const result = await getAttemptsByMcq(mockDb, mockMcqId);

      // Assert
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('WHERE mcq_id = ?'),
        [mockMcqId]
      );
      expect(result).toHaveLength(2);
      expect(result[0]!.userId).toBe('user-1');
      expect(result[1]!.userId).toBe('user-2');
    });

    it('should returns only user\'s attempts when userId provided', async () => {
      // Arrange
      const filteredUserId = 'user-1';
      const mockAttempt = createMockDbMcqAttempt({
        id: 'attempt-1',
        user_id: filteredUserId,
        is_correct: 1,
      });

      vi.mocked(executeQuery).mockResolvedValueOnce([mockAttempt]);

      // Act
      const result = await getAttemptsByMcq(mockDb, mockMcqId, filteredUserId);

      // Assert
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('WHERE mcq_id = ? AND user_id = ?'),
        [mockMcqId, filteredUserId]
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.userId).toBe(filteredUserId);
    });

    it('should returns empty array when no attempts found', async () => {
      // Arrange
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      const result = await getAttemptsByMcq(mockDb, mockMcqId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should orders attempts by attempted_at DESC', async () => {
      // Arrange
      const mockAttempt1 = createMockDbMcqAttempt({
        id: 'attempt-1',
        attempted_at: '2025-01-01T10:00:00Z',
      });
      const mockAttempt2 = createMockDbMcqAttempt({
        id: 'attempt-2',
        attempted_at: '2025-01-01T11:00:00Z',
      });

      vi.mocked(executeQuery).mockResolvedValueOnce([mockAttempt2, mockAttempt1]);

      // Act
      const result = await getAttemptsByMcq(mockDb, mockMcqId);

      // Assert
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('ORDER BY attempted_at DESC'),
        expect.any(Array)
      );
      // Note: We're testing that SQL includes ORDER BY, not testing actual ordering
      // since that's handled by the database
    });

    it('should transforms database structure to API structure', async () => {
      // Arrange
      const mockAttempt = createMockDbMcqAttempt({
        id: 'attempt-1',
        mcq_id: 'mcq-123',
        user_id: 'user-123',
        selected_choice_id: 'choice-123',
        is_correct: 1,
        attempted_at: '2025-01-01T10:00:00Z',
      });

      vi.mocked(executeQuery).mockResolvedValueOnce([mockAttempt]);

      // Act
      const result = await getAttemptsByMcq(mockDb, mockMcqId);

      // Assert
      expect(result[0]).toEqual({
        id: 'attempt-1',
        mcqId: 'mcq-123',
        userId: 'user-123',
        selectedChoiceId: 'choice-123',
        isCorrect: true,
        attemptedAt: '2025-01-01T10:00:00Z',
      });
      // Verify camelCase structure
      expect(result[0]).not.toHaveProperty('mcq_id');
      expect(result[0]).not.toHaveProperty('user_id');
      expect(result[0]).not.toHaveProperty('selected_choice_id');
      expect(result[0]).not.toHaveProperty('is_correct');
      expect(result[0]).not.toHaveProperty('attempted_at');
    });

    it('should converts is_correct (0/1) to isCorrect (boolean)', async () => {
      // Arrange
      const correctAttempt = createMockDbMcqAttempt({
        id: 'attempt-1',
        is_correct: 1,
      });
      const incorrectAttempt = createMockDbMcqAttempt({
        id: 'attempt-2',
        is_correct: 0,
      });

      vi.mocked(executeQuery).mockResolvedValueOnce([correctAttempt, incorrectAttempt]);

      // Act
      const result = await getAttemptsByMcq(mockDb, mockMcqId);

      // Assert
      expect(result[0]!.isCorrect).toBe(true);
      expect(result[1]!.isCorrect).toBe(false);
      expect(typeof result[0]!.isCorrect).toBe('boolean');
      expect(typeof result[1]!.isCorrect).toBe('boolean');
    });

    it('should verifies SQL uses anonymous ? placeholders', async () => {
      // Arrange
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getAttemptsByMcq(mockDb, mockMcqId);

      // Assert
      const call = vi.mocked(executeQuery).mock.calls[0];
      expect(call[1]).toMatch(/\?/); // Contains ?
      expect(call[1]).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.
    });
  });

  describe('getAttemptsByUser', () => {
    it('should returns all attempts by user', async () => {
      // Arrange
      const mockAttempt1 = createMockDbMcqAttempt({
        id: 'attempt-1',
        mcq_id: 'mcq-1',
        is_correct: 1,
      });
      const mockAttempt2 = createMockDbMcqAttempt({
        id: 'attempt-2',
        mcq_id: 'mcq-2',
        is_correct: 0,
      });

      vi.mocked(executeQuery).mockResolvedValueOnce([mockAttempt1, mockAttempt2]);

      // Act
      const result = await getAttemptsByUser(mockDb, mockUserId);

      // Assert
      expect(executeQuery).toHaveBeenCalledTimes(1);
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('WHERE user_id = ?'),
        [mockUserId]
      );
      expect(result).toHaveLength(2);
      expect(result[0]!.userId).toBe(mockUserId);
      expect(result[1]!.userId).toBe(mockUserId);
    });

    it('should returns empty array when user has no attempts', async () => {
      // Arrange
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      const result = await getAttemptsByUser(mockDb, mockUserId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should orders attempts by attempted_at DESC', async () => {
      // Arrange
      const mockAttempt1 = createMockDbMcqAttempt({
        id: 'attempt-1',
        attempted_at: '2025-01-01T10:00:00Z',
      });
      const mockAttempt2 = createMockDbMcqAttempt({
        id: 'attempt-2',
        attempted_at: '2025-01-01T11:00:00Z',
      });

      vi.mocked(executeQuery).mockResolvedValueOnce([mockAttempt2, mockAttempt1]);

      // Act
      await getAttemptsByUser(mockDb, mockUserId);

      // Assert
      expect(executeQuery).toHaveBeenCalledWith(
        mockDb,
        expect.stringContaining('ORDER BY attempted_at DESC'),
        [mockUserId]
      );
    });

    it('should transforms database structure to API structure', async () => {
      // Arrange
      const mockAttempt = createMockDbMcqAttempt({
        id: 'attempt-1',
        mcq_id: 'mcq-123',
        user_id: 'user-123',
        selected_choice_id: 'choice-123',
        is_correct: 1,
        attempted_at: '2025-01-01T10:00:00Z',
      });

      vi.mocked(executeQuery).mockResolvedValueOnce([mockAttempt]);

      // Act
      const result = await getAttemptsByUser(mockDb, mockUserId);

      // Assert
      expect(result[0]).toEqual({
        id: 'attempt-1',
        mcqId: 'mcq-123',
        userId: 'user-123',
        selectedChoiceId: 'choice-123',
        isCorrect: true,
        attemptedAt: '2025-01-01T10:00:00Z',
      });
      // Verify camelCase structure
      expect(result[0]).not.toHaveProperty('mcq_id');
      expect(result[0]).not.toHaveProperty('user_id');
      expect(result[0]).not.toHaveProperty('selected_choice_id');
      expect(result[0]).not.toHaveProperty('is_correct');
      expect(result[0]).not.toHaveProperty('attempted_at');
    });

    it('should verifies SQL uses anonymous ? placeholders', async () => {
      // Arrange
      vi.mocked(executeQuery).mockResolvedValueOnce([]);

      // Act
      await getAttemptsByUser(mockDb, mockUserId);

      // Assert
      const call = vi.mocked(executeQuery).mock.calls[0];
      expect(call[1]).toMatch(/\?/); // Contains ?
      expect(call[1]).not.toMatch(/\?[0-9]/); // Does not contain ?1, ?2, etc.
    });
  });
});
