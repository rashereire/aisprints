import { z } from 'zod';

/**
 * Schema for AI-generated MCQ output aligned with TEKS standards.
 * This schema is used with the AI SDK's generateObject to ensure
 * structured output that matches our MCQ creation requirements.
 */
export const teksMcqGenerationSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or less')
      .describe(
        'A concise, descriptive title for the MCQ that reflects the topic and TEKS standard. ' +
        'Examples: "Photosynthesis Process", "Pattern Recognition in Science", "Flowchart Decomposition". ' +
        'The title should be clear and help teachers identify the question topic at a glance.'
      ),
    description: z
      .string()
      .max(500, 'Description must be 500 characters or less')
      .describe(
        'Optional context or additional information about the question. ' +
        'This can include the specific aspect of the TEKS standard being assessed, ' +
        'prerequisite knowledge, or instructional context. ' +
        'Keep this brief and focused on helping teachers understand the question\'s purpose. ' +
        'If not needed, this field should be an empty string.'
      ),
    questionText: z
      .string()
      .min(1, 'Question text is required')
      .max(1000, 'Question text must be 1000 characters or less')
      .describe(
        'The complete question text that directly assesses the selected TEKS standard. ' +
        'The question should be clear, age-appropriate for the grade level, and specifically ' +
        'target the knowledge or skill described in the standard. ' +
        'Use clear language appropriate for the grade level and avoid ambiguity. ' +
        'The question should be a complete sentence ending with a question mark.'
      ),
    choices: z
      .array(
        z.object({
          choiceText: z
            .string()
            .min(1, 'Choice text is required')
            .describe(
              'The text of one answer choice. Each choice should be a complete, clear statement ' +
              'that students can evaluate. Incorrect choices (distractors) should be plausible ' +
              'but clearly wrong, while the correct answer should be unambiguous and directly ' +
              'address the question. Keep choice text concise but complete.'
            ),
          isCorrect: z
            .boolean()
            .describe(
              'Whether this choice is the correct answer. Exactly one choice must be marked as correct. ' +
              'The correct answer should directly align with the TEKS standard being assessed.'
            ),
          displayOrder: z
            .number()
            .int()
            .min(0)
            .describe(
              'The order in which this choice should be displayed (0-based index). ' +
              'Choices should be ordered logically, typically with the correct answer not always ' +
              'in the same position. Use 0, 1, 2, 3 for four choices.'
            ),
        })
      )
      .min(2, 'At least 2 choices are required')
      .max(4, 'Maximum 4 choices allowed')
      .describe(
        'Array of answer choices for the question. Must include exactly 4 choices for consistency. ' +
        'Exactly one choice must be marked as correct (isCorrect: true). ' +
        'The other three choices should be plausible distractors that test understanding, not just ' +
        'obviously wrong answers. Each choice should be distinct and address the question meaningfully.'
      ),
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
  )
  .refine(
    (data) => {
      // Ensure we have exactly 4 choices for consistency
      return data.choices.length === 4;
    },
    {
      message: 'Must have exactly 4 choices',
      path: ['choices'],
    }
  );

/**
 * Schema for validating TEKS selection input when generating an MCQ.
 * This schema validates the data sent from the frontend dialog to the API route.
 */
export const teksSelectionSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .describe('The subject area (e.g., "Science", "Technology Applications")'),
  gradeLevel: z
    .string()
    .min(1, 'Grade level is required')
    .describe('The grade level (e.g., "Grade 3", "Grade 7")'),
  strandName: z
    .string()
    .min(1, 'Strand name is required')
    .describe(
      'The strand or domain name within the grade level ' +
      '(e.g., "Recurring themes and concepts", "Computational thinking — foundations")'
    ),
  standardCode: z
    .string()
    .min(1, 'Standard code is required')
    .describe('The TEKS standard code (e.g., "S.3.5.A", "TA.7.1.B")'),
  standardDescription: z
    .string()
    .min(1, 'Standard description is required')
    .describe('The full text description of the TEKS standard'),
  topicDescription: z
    .string()
    .min(10, 'Topic description must be at least 10 characters')
    .max(500, 'Topic description must be 500 characters or less')
    .describe(
      'A brief description of the specific topic or subject matter for the question. ' +
      'This helps the AI generate a question that is both aligned with the TEKS standard ' +
      'and focused on the specific content area. ' +
      'Examples: "photosynthesis in plants", "decomposing problems using flowcharts", ' +
      '"identifying patterns in scientific data".'
    ),
});

/**
 * Type inference from schemas for TypeScript usage.
 * These types are automatically inferred from the Zod schemas above.
 */
export type TeksMcqGeneration = z.infer<typeof teksMcqGenerationSchema>;
export type TeksSelection = z.infer<typeof teksSelectionSchema>;
