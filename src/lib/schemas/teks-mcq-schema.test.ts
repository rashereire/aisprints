import { describe, it, expect } from 'vitest';
import {
  teksMcqGenerationSchema,
  teksSelectionSchema,
} from './teks-mcq-schema';

describe('teks-mcq-schema', () => {
  describe('teksSelectionSchema', () => {
    it('should validate valid TEKS selection data', () => {
      const validData = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes and concepts',
        standardCode: 'S.3.5.A',
        standardDescription: 'identify and use patterns to explain scientific phenomena',
        topicDescription: 'photosynthesis in plants',
      };

      const result = teksSelectionSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject missing subject', () => {
      const invalidData = {
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes and concepts',
        standardCode: 'S.3.5.A',
        standardDescription: 'identify and use patterns',
        topicDescription: 'photosynthesis in plants',
      };

      const result = teksSelectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('subject');
      }
    });

    it('should reject empty subject', () => {
      const invalidData = {
        subject: '',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes and concepts',
        standardCode: 'S.3.5.A',
        standardDescription: 'identify and use patterns',
        topicDescription: 'photosynthesis in plants',
      };

      const result = teksSelectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing gradeLevel', () => {
      const invalidData = {
        subject: 'Science',
        strandName: 'Recurring themes and concepts',
        standardCode: 'S.3.5.A',
        standardDescription: 'identify and use patterns',
        topicDescription: 'photosynthesis in plants',
      };

      const result = teksSelectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing strandName', () => {
      const invalidData = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        standardCode: 'S.3.5.A',
        standardDescription: 'identify and use patterns',
        topicDescription: 'photosynthesis in plants',
      };

      const result = teksSelectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing standardCode', () => {
      const invalidData = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes and concepts',
        standardDescription: 'identify and use patterns',
        topicDescription: 'photosynthesis in plants',
      };

      const result = teksSelectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing standardDescription', () => {
      const invalidData = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes and concepts',
        standardCode: 'S.3.5.A',
        topicDescription: 'photosynthesis in plants',
      };

      const result = teksSelectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject topicDescription shorter than 10 characters', () => {
      const invalidData = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes and concepts',
        standardCode: 'S.3.5.A',
        standardDescription: 'identify and use patterns',
        topicDescription: 'short', // Only 5 characters
      };

      const result = teksSelectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('topicDescription');
      }
    });

    it('should reject topicDescription longer than 500 characters', () => {
      const invalidData = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes and concepts',
        standardCode: 'S.3.5.A',
        standardDescription: 'identify and use patterns',
        topicDescription: 'a'.repeat(501), // 501 characters
      };

      const result = teksSelectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept topicDescription with exactly 10 characters', () => {
      const validData = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes and concepts',
        standardCode: 'S.3.5.A',
        standardDescription: 'identify and use patterns',
        topicDescription: '1234567890', // Exactly 10 characters
      };

      const result = teksSelectionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept topicDescription with exactly 500 characters', () => {
      const validData = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes and concepts',
        standardCode: 'S.3.5.A',
        standardDescription: 'identify and use patterns',
        topicDescription: 'a'.repeat(500), // Exactly 500 characters
      };

      const result = teksSelectionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    // 🔒 OWASP INPVAL-009: Verify input length limits enforced
    it('🔒 OWASP INPVAL-009: should enforce topicDescription length limits', () => {
      const tooShort = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes',
        standardCode: 'S.3.5.A',
        standardDescription: 'test',
        topicDescription: 'short', // Too short
      };

      const tooLong = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes',
        standardCode: 'S.3.5.A',
        standardDescription: 'test',
        topicDescription: 'a'.repeat(501), // Too long
      };

      expect(teksSelectionSchema.safeParse(tooShort).success).toBe(false);
      expect(teksSelectionSchema.safeParse(tooLong).success).toBe(false);
    });

    // 🔒 OWASP INPVAL-010: Verify special characters sanitized correctly
    it('🔒 OWASP INPVAL-010: should accept special characters in topicDescription (no sanitization needed - handled by AI)', () => {
      const validData = {
        subject: 'Science',
        gradeLevel: 'Grade 3',
        strandName: 'Recurring themes',
        standardCode: 'S.3.5.A',
        standardDescription: 'test',
        topicDescription: 'photosynthesis & cellular respiration (plants)',
      };

      const result = teksSelectionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('teksMcqGenerationSchema', () => {
    const validMcq = {
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

    it('should validate valid AI-generated MCQ', () => {
      const result = teksMcqGenerationSchema.safeParse(validMcq);
      expect(result.success).toBe(true);
    });

    it('should reject MCQ with missing title', () => {
      const invalidMcq = { ...validMcq };
      delete (invalidMcq as any).title;

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should reject MCQ with empty title', () => {
      const invalidMcq = { ...validMcq, title: '' };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should reject title longer than 200 characters', () => {
      const invalidMcq = { ...validMcq, title: 'a'.repeat(201) };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should accept title with exactly 200 characters', () => {
      const validMcqWithLongTitle = { ...validMcq, title: 'a'.repeat(200) };

      const result = teksMcqGenerationSchema.safeParse(validMcqWithLongTitle);
      expect(result.success).toBe(true);
    });

    it('should reject description longer than 500 characters', () => {
      const invalidMcq = { ...validMcq, description: 'a'.repeat(501) };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should accept empty string description', () => {
      const validMcqWithEmptyDesc = { ...validMcq, description: '' };

      const result = teksMcqGenerationSchema.safeParse(validMcqWithEmptyDesc);
      expect(result.success).toBe(true);
    });

    it('should reject questionText longer than 1000 characters', () => {
      const invalidMcq = { ...validMcq, questionText: 'a'.repeat(1001) };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should reject MCQ with fewer than 2 choices', () => {
      const invalidMcq = {
        ...validMcq,
        choices: [{ choiceText: 'Only one choice', isCorrect: true, displayOrder: 0 }],
      };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should reject MCQ with more than 4 choices', () => {
      const invalidMcq = {
        ...validMcq,
        choices: [
          { choiceText: 'A', isCorrect: true, displayOrder: 0 },
          { choiceText: 'B', isCorrect: false, displayOrder: 1 },
          { choiceText: 'C', isCorrect: false, displayOrder: 2 },
          { choiceText: 'D', isCorrect: false, displayOrder: 3 },
          { choiceText: 'E', isCorrect: false, displayOrder: 4 },
        ],
      };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should reject MCQ with no correct answer', () => {
      const invalidMcq = {
        ...validMcq,
        choices: validMcq.choices.map((c) => ({ ...c, isCorrect: false })),
      };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.message.includes('Exactly one choice'))).toBe(true);
      }
    });

    it('should reject MCQ with multiple correct answers', () => {
      const invalidMcq = {
        ...validMcq,
        choices: validMcq.choices.map((c, i) => ({ ...c, isCorrect: i < 2 })),
      };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should reject MCQ with fewer than 4 choices (must have exactly 4)', () => {
      const invalidMcq = {
        ...validMcq,
        choices: validMcq.choices.slice(0, 3), // Only 3 choices
      };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.message.includes('exactly 4 choices'))).toBe(true);
      }
    });

    it('should reject MCQ with more than 4 choices (must have exactly 4)', () => {
      const invalidMcq = {
        ...validMcq,
        choices: [
          ...validMcq.choices,
          { choiceText: 'Extra choice', isCorrect: false, displayOrder: 4 },
        ],
      };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should reject choice with empty choiceText', () => {
      const invalidMcq = {
        ...validMcq,
        choices: [
          { choiceText: '', isCorrect: true, displayOrder: 0 },
          ...validMcq.choices.slice(1),
        ],
      };

      const result = teksMcqGenerationSchema.safeParse(invalidMcq);
      expect(result.success).toBe(false);
    });

    it('should accept MCQ with exactly 4 choices and one correct answer', () => {
      const result = teksMcqGenerationSchema.safeParse(validMcq);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.choices).toHaveLength(4);
        expect(result.data.choices.filter((c) => c.isCorrect)).toHaveLength(1);
      }
    });

    // 🔒 OWASP INPVAL-009: Verify input length limits enforced
    it('🔒 OWASP INPVAL-009: should enforce field length limits', () => {
      const tooLongTitle = { ...validMcq, title: 'a'.repeat(201) };
      const tooLongDescription = { ...validMcq, description: 'a'.repeat(501) };
      const tooLongQuestion = { ...validMcq, questionText: 'a'.repeat(1001) };

      expect(teksMcqGenerationSchema.safeParse(tooLongTitle).success).toBe(false);
      expect(teksMcqGenerationSchema.safeParse(tooLongDescription).success).toBe(false);
      expect(teksMcqGenerationSchema.safeParse(tooLongQuestion).success).toBe(false);
    });

    // 🔒 OWASP BUSLOGIC-001: Verify business logic data validation enforced
    it('🔒 OWASP BUSLOGIC-001: should enforce exactly one correct answer requirement', () => {
      const noCorrect = {
        ...validMcq,
        choices: validMcq.choices.map((c) => ({ ...c, isCorrect: false })),
      };
      const multipleCorrect = {
        ...validMcq,
        choices: validMcq.choices.map((c, i) => ({ ...c, isCorrect: i < 2 })),
      };

      expect(teksMcqGenerationSchema.safeParse(noCorrect).success).toBe(false);
      expect(teksMcqGenerationSchema.safeParse(multipleCorrect).success).toBe(false);
    });

    // 🔒 OWASP BUSLOGIC-001: Verify business logic constraints (exactly 4 choices)
    it('🔒 OWASP BUSLOGIC-001: should enforce exactly 4 choices requirement', () => {
      const threeChoices = { ...validMcq, choices: validMcq.choices.slice(0, 3) };
      const fiveChoices = {
        ...validMcq,
        choices: [...validMcq.choices, { choiceText: 'E', isCorrect: false, displayOrder: 4 }],
      };

      expect(teksMcqGenerationSchema.safeParse(threeChoices).success).toBe(false);
      expect(teksMcqGenerationSchema.safeParse(fiveChoices).success).toBe(false);
    });
  });
});
