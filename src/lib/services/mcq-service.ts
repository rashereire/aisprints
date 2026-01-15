import {
  executeQuery,
  executeQueryFirst,
  executeMutation,
  executeBatch,
  generateId,
} from '@/lib/d1-client';
import type {
  McqCreateInput,
  McqUpdateInput,
  McqWithChoices,
  McqChoice,
  PaginatedMcqs,
} from '@/lib/schemas/mcq-schema';

/**
 * Database MCQ structure (snake_case from database)
 */
interface DbMcq {
  id: string;
  title: string;
  description: string | null;
  question_text: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database MCQ choice structure (snake_case from database)
 */
interface DbMcqChoice {
  id: string;
  mcq_id: string;
  choice_text: string;
  is_correct: number; // 0 or 1 in database
  display_order: number;
  created_at: string;
}

/**
 * Transforms a database MCQ object to the McqWithChoices type (camelCase).
 */
function transformDbMcqToMcq(dbMcq: DbMcq, choices: DbMcqChoice[]): McqWithChoices {
  return {
    id: dbMcq.id,
    title: dbMcq.title,
    description: dbMcq.description,
    questionText: dbMcq.question_text,
    createdByUserId: dbMcq.created_by_user_id,
    createdAt: dbMcq.created_at,
    updatedAt: dbMcq.updated_at,
    choices: choices.map((choice) => ({
      id: choice.id,
      mcqId: choice.mcq_id,
      choiceText: choice.choice_text,
      isCorrect: choice.is_correct === 1,
      displayOrder: choice.display_order,
      createdAt: choice.created_at,
    })),
  };
}

/**
 * Creates a new MCQ with its choices in a single transaction.
 * Generates IDs for the MCQ and all choices, then inserts them atomically.
 * 
 * @param db - D1Database instance
 * @param userId - ID of the user creating the MCQ
 * @param mcqData - MCQ creation data including choices
 * @returns Promise resolving to the created MCQ with choices
 * @throws Error if transaction fails
 */
export async function createMcq(
  db: D1Database,
  userId: string,
  mcqData: McqCreateInput
): Promise<McqWithChoices> {
  // Generate IDs
  const mcqId = generateId();
  const choiceIds = mcqData.choices.map(() => generateId());

  // Prepare batch statements for transaction
  const statements = [
    // Insert MCQ
    {
      sql: `INSERT INTO mcqs (id, title, description, question_text, created_by_user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      params: [
        mcqId,
        mcqData.title,
        mcqData.description || null,
        mcqData.questionText,
        userId,
      ],
    },
    // Insert choices
    ...mcqData.choices.map((choice, index) => ({
      sql: `INSERT INTO mcq_choices (id, mcq_id, choice_text, is_correct, display_order, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      params: [
        choiceIds[index],
        mcqId,
        choice.choiceText,
        choice.isCorrect ? 1 : 0,
        choice.displayOrder,
      ],
    })),
  ];

  // Execute all inserts in a single transaction
  await executeBatch(db, statements);

  // Fetch and return the created MCQ with choices
  const createdMcq = await getMcqById(db, mcqId);
  if (!createdMcq) {
    throw new Error('Failed to retrieve created MCQ');
  }
  return createdMcq;
}

/**
 * Gets a single MCQ by ID with all its choices.
 * Returns null if the MCQ is not found.
 * 
 * @param db - D1Database instance
 * @param id - MCQ ID
 * @returns Promise resolving to MCQ with choices or null if not found
 */
export async function getMcqById(
  db: D1Database,
  id: string
): Promise<McqWithChoices | null> {
  // Fetch MCQ
  const dbMcq = await executeQueryFirst<DbMcq>(
    db,
    `SELECT * FROM mcqs WHERE id = ?`,
    [id]
  );

  if (!dbMcq) {
    return null;
  }

  // Fetch choices ordered by display_order
  const dbChoices = await executeQuery<DbMcqChoice>(
    db,
    `SELECT * FROM mcq_choices WHERE mcq_id = ? ORDER BY display_order ASC`,
    [id]
  );

  return transformDbMcqToMcq(dbMcq, dbChoices);
}

/**
 * Gets paginated MCQs with optional search and filtering.
 * Supports sorting by title, createdAt, or choiceCount.
 * 
 * @param db - D1Database instance
 * @param filters - Filter options (page, limit, search, userId, sort, order)
 * @returns Promise resolving to paginated MCQs
 */
export async function getMcqs(
  db: D1Database,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}
): Promise<PaginatedMcqs> {
  // Set defaults
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 10, 100); // Max 100 per page
  const offset = (page - 1) * limit;
  const sort = filters.sort || 'createdAt';
  const order = filters.order || 'desc';

  // Build WHERE clause using anonymous placeholders (will be normalized by d1-client)
  const whereConditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    whereConditions.push(
      `(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(question_text) LIKE ?)`
    );
    const searchTerm = `%${filters.search.toLowerCase()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (filters.userId) {
    whereConditions.push(`created_by_user_id = ?`);
    params.push(filters.userId);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Build ORDER BY clause
  let orderByClause = 'ORDER BY ';
  switch (sort) {
    case 'title':
      orderByClause += `title ${order.toUpperCase()}`;
      break;
    case 'createdAt':
      orderByClause += `created_at ${order.toUpperCase()}`;
      break;
    default:
      orderByClause += `created_at DESC`;
  }

  // Get total count
  const countResult = await executeQueryFirst<{ count: number }>(
    db,
    `SELECT COUNT(*) as count FROM mcqs ${whereClause}`,
    params
  );
  const total = countResult?.count || 0;
  const totalPages = Math.ceil(total / limit);

  // Fetch MCQs
  const dbMcqs = await executeQuery<DbMcq>(
    db,
    `SELECT * FROM mcqs ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Fetch choices for all MCQs
  const mcqIds = dbMcqs.map((mcq) => mcq.id);
  let choicesMap: Map<string, DbMcqChoice[]> = new Map();

  if (mcqIds.length > 0) {
    // Build IN clause for choices query using anonymous placeholders
    // The executeQuery function will normalize them to positional placeholders
    const placeholders = mcqIds.map(() => '?').join(', ');
    const dbChoices = await executeQuery<DbMcqChoice>(
      db,
      `SELECT * FROM mcq_choices WHERE mcq_id IN (${placeholders}) ORDER BY mcq_id, display_order ASC`,
      mcqIds
    );

    // Group choices by MCQ ID
    for (const choice of dbChoices) {
      if (!choicesMap.has(choice.mcq_id)) {
        choicesMap.set(choice.mcq_id, []);
      }
      choicesMap.get(choice.mcq_id)!.push(choice);
    }
  }

  // Transform and combine MCQs with their choices
  const data = dbMcqs.map((dbMcq) =>
    transformDbMcqToMcq(dbMcq, choicesMap.get(dbMcq.id) || [])
  );

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Updates an existing MCQ and its choices.
 * Verifies ownership before updating.
 * Uses a transaction to delete old choices and insert new ones.
 * 
 * @param db - D1Database instance
 * @param id - MCQ ID
 * @param userId - ID of the user attempting to update
 * @param mcqData - Updated MCQ data including choices
 * @returns Promise resolving to the updated MCQ with choices
 * @throws Error if user doesn't own the MCQ or transaction fails
 */
export async function updateMcq(
  db: D1Database,
  id: string,
  userId: string,
  mcqData: McqUpdateInput
): Promise<McqWithChoices> {
  // Verify ownership
  const ownsMcq = await verifyMcqOwnership(db, id, userId);
  if (!ownsMcq) {
    throw new Error('You do not have permission to update this MCQ');
  }

  // Generate IDs for new choices
  const choiceIds = mcqData.choices.map(() => generateId());

  // Prepare batch statements for transaction
  const statements = [
    // Update MCQ
    {
      sql: `UPDATE mcqs 
            SET title = ?, description = ?, question_text = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      params: [
        mcqData.title,
        mcqData.description || null,
        mcqData.questionText,
        id,
      ],
    },
    // Delete existing choices
    {
      sql: `DELETE FROM mcq_choices WHERE mcq_id = ?`,
      params: [id],
    },
    // Insert new choices
    ...mcqData.choices.map((choice, index) => ({
      sql: `INSERT INTO mcq_choices (id, mcq_id, choice_text, is_correct, display_order, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      params: [
        choiceIds[index],
        id,
        choice.choiceText,
        choice.isCorrect ? 1 : 0,
        choice.displayOrder,
      ],
    })),
  ];

  // Execute all operations in a single transaction
  await executeBatch(db, statements);

  // Fetch and return the updated MCQ with choices
  const updatedMcq = await getMcqById(db, id);
  if (!updatedMcq) {
    throw new Error('Failed to retrieve updated MCQ');
  }
  return updatedMcq;
}

/**
 * Deletes an MCQ and all associated choices and attempts (via CASCADE).
 * Verifies ownership before deleting.
 * 
 * @param db - D1Database instance
 * @param id - MCQ ID
 * @param userId - ID of the user attempting to delete
 * @returns Promise resolving when MCQ is deleted
 * @throws Error if user doesn't own the MCQ
 */
export async function deleteMcq(
  db: D1Database,
  id: string,
  userId: string
): Promise<void> {
  // Verify ownership
  const ownsMcq = await verifyMcqOwnership(db, id, userId);
  if (!ownsMcq) {
    throw new Error('You do not have permission to delete this MCQ');
  }

  // Delete MCQ (CASCADE will handle choices and attempts)
  await executeMutation(db, `DELETE FROM mcqs WHERE id = ?`, [id]);
}

/**
 * Verifies that a user owns a specific MCQ.
 * 
 * @param db - D1Database instance
 * @param mcqId - MCQ ID
 * @param userId - User ID to check
 * @returns Promise resolving to true if user owns the MCQ, false otherwise
 */
export async function verifyMcqOwnership(
  db: D1Database,
  mcqId: string,
  userId: string
): Promise<boolean> {
  const result = await executeQueryFirst<{ count: number }>(
    db,
    `SELECT COUNT(*) as count FROM mcqs WHERE id = ? AND created_by_user_id = ?`,
    [mcqId, userId]
  );

  return (result?.count || 0) > 0;
}
