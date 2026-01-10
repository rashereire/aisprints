import {
  executeQuery,
  executeQueryFirst,
  executeMutation,
  generateId,
} from '@/lib/d1-client';
import type { McqAttempt } from '@/lib/schemas/mcq-schema';

/**
 * Database MCQ attempt structure (snake_case from database)
 */
interface DbMcqAttempt {
  id: string;
  mcq_id: string;
  user_id: string;
  selected_choice_id: string;
  is_correct: number; // 0 or 1 in database
  attempted_at: string;
}

/**
 * Database MCQ choice structure (for validation)
 */
interface DbMcqChoice {
  id: string;
  mcq_id: string;
  is_correct: number; // 0 or 1 in database
}

/**
 * Transforms a database attempt object to the McqAttempt type (camelCase).
 */
function transformDbAttemptToAttempt(dbAttempt: DbMcqAttempt): McqAttempt {
  return {
    id: dbAttempt.id,
    mcqId: dbAttempt.mcq_id,
    userId: dbAttempt.user_id,
    selectedChoiceId: dbAttempt.selected_choice_id,
    isCorrect: dbAttempt.is_correct === 1,
    attemptedAt: dbAttempt.attempted_at,
  };
}

/**
 * Records a student's attempt at answering an MCQ.
 * Validates that the choice belongs to the MCQ, checks if it's correct,
 * and inserts the attempt record.
 * 
 * @param db - D1Database instance
 * @param userId - ID of the user making the attempt
 * @param mcqId - ID of the MCQ being attempted
 * @param choiceId - ID of the selected choice
 * @returns Promise resolving to the attempt record with result
 * @throws Error if MCQ or choice not found, or choice doesn't belong to MCQ
 */
export async function recordAttempt(
  db: D1Database,
  userId: string,
  mcqId: string,
  choiceId: string
): Promise<McqAttempt> {
  // Validate that the choice belongs to the MCQ
  const choice = await executeQueryFirst<DbMcqChoice>(
    db,
    `SELECT id, mcq_id, is_correct FROM mcq_choices WHERE id = ?`,
    [choiceId]
  );

  if (!choice) {
    throw new Error('Choice not found');
  }

  if (choice.mcq_id !== mcqId) {
    throw new Error('Choice does not belong to this MCQ');
  }

  // Check if the choice is correct
  const isCorrect = choice.is_correct === 1;

  // Generate attempt ID
  const attemptId = generateId();

  // Insert attempt record
  await executeMutation(
    db,
    `INSERT INTO mcq_attempts (id, mcq_id, user_id, selected_choice_id, is_correct, attempted_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [attemptId, mcqId, userId, choiceId, isCorrect ? 1 : 0]
  );

  // Fetch and return the attempt record
  const dbAttempt = await executeQueryFirst<DbMcqAttempt>(
    db,
    `SELECT * FROM mcq_attempts WHERE id = ?`,
    [attemptId]
  );

  if (!dbAttempt) {
    throw new Error('Failed to retrieve attempt record');
  }

  return transformDbAttemptToAttempt(dbAttempt);
}

/**
 * Gets all attempts for a specific MCQ.
 * Optionally filters by user ID.
 * Results are ordered by attempted_at descending (newest first).
 * 
 * @param db - D1Database instance
 * @param mcqId - MCQ ID
 * @param userId - Optional user ID to filter attempts
 * @returns Promise resolving to array of attempts
 */
export async function getAttemptsByMcq(
  db: D1Database,
  mcqId: string,
  userId?: string
): Promise<McqAttempt[]> {
  let sql = `SELECT * FROM mcq_attempts WHERE mcq_id = ?`;
  const params: unknown[] = [mcqId];

  if (userId) {
    sql += ` AND user_id = ?`;
    params.push(userId);
  }

  sql += ` ORDER BY attempted_at DESC`;

  const dbAttempts = await executeQuery<DbMcqAttempt>(db, sql, params);

  return dbAttempts.map(transformDbAttemptToAttempt);
}

/**
 * Gets all attempts made by a specific user.
 * Results are ordered by attempted_at descending (newest first).
 * 
 * @param db - D1Database instance
 * @param userId - User ID
 * @returns Promise resolving to array of attempts
 */
export async function getAttemptsByUser(
  db: D1Database,
  userId: string
): Promise<McqAttempt[]> {
  const dbAttempts = await executeQuery<DbMcqAttempt>(
    db,
    `SELECT * FROM mcq_attempts WHERE user_id = ? ORDER BY attempted_at DESC`,
    [userId]
  );

  return dbAttempts.map(transformDbAttemptToAttempt);
}
