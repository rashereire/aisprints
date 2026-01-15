import { z } from 'zod';

/**
 * Schema for a single TEKS standard entry.
 * Defines the structure for individual learning standards.
 */
export const teksStandardSchema = z.object({
  code: z
    .string()
    .min(1, 'TEKS code is required')
    .describe('Unique TEKS code identifier, e.g., "S.3.5.A" or "TA.7.3.B"'),
  description: z
    .string()
    .min(1, 'Description is required')
    .describe('Full student expectation text describing the learning standard'),
});

/**
 * Schema for a strand within a grade level.
 * A strand represents a domain or topic area within a subject.
 */
export const teksStrandSchema = z.object({
  name: z
    .string()
    .min(1, 'Strand name is required')
    .describe('Strand name (domain), e.g., "Recurring themes and concepts"'),
  chordPrefix: z
    .string()
    .min(1, 'Chord prefix is required')
    .describe('Prefix used for grouping related standards, e.g., "S.3.5", "TA.7.3"'),
  standards: z
    .array(teksStandardSchema)
    .min(1, 'At least one standard is required')
    .describe('Array of TEKS standards within this strand'),
});

/**
 * Schema for a grade level within a subject.
 * Contains multiple strands for that grade.
 */
export const teksGradeSchema = z.object({
  level: z
    .string()
    .min(1, 'Grade level is required')
    .describe('Grade level identifier, e.g., "Grade 3", "Grade 7"'),
  strands: z
    .array(teksStrandSchema)
    .min(1, 'At least one strand is required')
    .describe('Array of strands for this grade level'),
});

/**
 * Schema for a subject with multiple grade levels.
 * Represents a complete subject area (e.g., Science, Technology Applications).
 */
export const teksSubjectSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject name is required')
    .describe('Subject name, e.g., "Science", "Technology Applications"'),
  grades: z
    .array(teksGradeSchema)
    .min(1, 'At least one grade level is required')
    .describe('Array of grade levels for this subject'),
});

/**
 * Schema for the complete TEKS dataset.
 * Contains multiple subjects, each with their grade levels and standards.
 */
export const teksDataSchema = z.array(teksSubjectSchema);

/**
 * Type inference from schemas for TypeScript usage.
 * These types are automatically inferred from the Zod schemas above.
 */
export type TeksStandard = z.infer<typeof teksStandardSchema>;
export type TeksStrand = z.infer<typeof teksStrandSchema>;
export type TeksGrade = z.infer<typeof teksGradeSchema>;
export type TeksSubject = z.infer<typeof teksSubjectSchema>;
