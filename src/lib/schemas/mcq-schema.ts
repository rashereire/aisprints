import { z } from 'zod';

/**
 * Schema for a single MCQ choice.
 * Validates choice text and correctness flag.
 */
export const mcqChoiceSchema = z.object({
  id: z.string().optional(), // Optional for create, required for existing choices
  mcqId: z.string().optional(), // Optional for create, required for existing choices
  choiceText: z.string().min(1, 'Choice text is required'),
  isCorrect: z.boolean(),
  displayOrder: z.number().int().min(0),
  createdAt: z.string().optional(), // Optional, set by database
});

/**
 * Schema for creating a new MCQ.
 * Validates title, description, question text, and choices array.
 * Ensures exactly one choice is marked as correct.
 */
export const mcqCreateSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or less'),
    description: z
      .string()
      .max(500, 'Description must be 500 characters or less')
      .optional()
      .nullable(),
    questionText: z
      .string()
      .min(1, 'Question text is required')
      .max(1000, 'Question text must be 1000 characters or less'),
    choices: z
      .array(
        z.object({
          choiceText: z.string().min(1, 'Choice text is required'),
          isCorrect: z.boolean(),
          displayOrder: z.number().int().min(0),
        })
      )
      .min(2, 'At least 2 choices are required')
      .max(4, 'Maximum 4 choices allowed'),
  })
  .refine(
    (data) => {
      // Ensure exactly one choice is marked as correct
      const correctCount = data.choices.filter((c) => c.isCorrect).length;
      return correctCount === 1;
    },
    {
      message: 'Exactly one choice must be marked as correct',
      path: ['choices'],
    }
  );

/**
 * Schema for updating an existing MCQ.
 * Same validation rules as create.
 */
export const mcqUpdateSchema = mcqCreateSchema;

/**
 * Schema for recording an MCQ attempt.
 * Validates the selected choice ID.
 */
export const mcqAttemptSchema = z.object({
  selectedChoiceId: z.string().min(1, 'Selected choice ID is required'),
});

/**
 * Schema for MCQ data structure with nested choices.
 * Represents a complete MCQ object as returned from the database.
 */
export const mcqSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  questionText: z.string(),
  createdByUserId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  choices: z.array(mcqChoiceSchema),
});

/**
 * Schema for MCQ attempt data structure.
 * Represents an attempt record as returned from the database.
 */
export const mcqAttemptRecordSchema = z.object({
  id: z.string(),
  mcqId: z.string(),
  userId: z.string(),
  selectedChoiceId: z.string(),
  isCorrect: z.boolean(),
  attemptedAt: z.string(),
});

/**
 * Type inference from schemas for TypeScript usage
 */
export type McqChoice = z.infer<typeof mcqChoiceSchema>;
export type McqCreateInput = z.infer<typeof mcqCreateSchema>;
export type McqUpdateInput = z.infer<typeof mcqUpdateSchema>;
export type McqAttemptInput = z.infer<typeof mcqAttemptSchema>;
export type McqWithChoices = z.infer<typeof mcqSchema>;
export type McqAttempt = z.infer<typeof mcqAttemptRecordSchema>;

/**
 * Paginated response structure for MCQ listings
 */
export interface PaginatedMcqs {
  data: McqWithChoices[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
