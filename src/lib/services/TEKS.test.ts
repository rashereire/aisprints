import { describe, it, expect } from 'vitest';
import { teksData } from './TEKS';
import {
  teksDataSchema,
  teksSubjectSchema,
  teksGradeSchema,
  teksStrandSchema,
  teksStandardSchema,
} from '@/lib/schemas/teks-schema';

describe('TEKS service', () => {
  describe('teksData', () => {
    it('should export valid TEKS data', () => {
      expect(teksData).toBeDefined();
      expect(Array.isArray(teksData)).toBe(true);
      expect(teksData.length).toBeGreaterThan(0);
    });

    it('should validate against teksDataSchema', () => {
      // The data is already validated at module load time via teksDataSchema.parse()
      // This test verifies the data structure is correct
      const result = teksDataSchema.safeParse(teksData);
      expect(result.success).toBe(true);
    });

    it('should have subjects with grades', () => {
      expect(teksData.length).toBeGreaterThan(0);
      teksData.forEach((subject) => {
        expect(subject.grades).toBeDefined();
        expect(Array.isArray(subject.grades)).toBe(true);
        expect(subject.grades.length).toBeGreaterThan(0);
      });
    });

    it('should have grades with strands', () => {
      teksData.forEach((subject) => {
        subject.grades.forEach((grade) => {
          expect(grade.strands).toBeDefined();
          expect(Array.isArray(grade.strands)).toBe(true);
          expect(grade.strands.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have strands with standards', () => {
      teksData.forEach((subject) => {
        subject.grades.forEach((grade) => {
          grade.strands.forEach((strand) => {
            expect(strand.standards).toBeDefined();
            expect(Array.isArray(strand.standards)).toBe(true);
            expect(strand.standards.length).toBeGreaterThan(0);
          });
        });
      });
    });

    it('should have standards with code and description', () => {
      teksData.forEach((subject) => {
        subject.grades.forEach((grade) => {
          grade.strands.forEach((strand) => {
            strand.standards.forEach((standard) => {
              expect(standard.code).toBeDefined();
              expect(typeof standard.code).toBe('string');
              expect(standard.code.length).toBeGreaterThan(0);
              expect(standard.description).toBeDefined();
              expect(typeof standard.description).toBe('string');
              expect(standard.description.length).toBeGreaterThan(0);
            });
          });
        });
      });
    });

    it('should have valid subject names', () => {
      teksData.forEach((subject) => {
        expect(subject.subject).toBeDefined();
        expect(typeof subject.subject).toBe('string');
        expect(subject.subject.length).toBeGreaterThan(0);
      });
    });

    it('should have valid grade levels', () => {
      teksData.forEach((subject) => {
        subject.grades.forEach((grade) => {
          expect(grade.level).toBeDefined();
          expect(typeof grade.level).toBe('string');
          expect(grade.level.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have valid strand names', () => {
      teksData.forEach((subject) => {
        subject.grades.forEach((grade) => {
          grade.strands.forEach((strand) => {
            expect(strand.name).toBeDefined();
            expect(typeof strand.name).toBe('string');
            expect(strand.name.length).toBeGreaterThan(0);
          });
        });
      });
    });

    it('should have valid chordPrefix for strands', () => {
      teksData.forEach((subject) => {
        subject.grades.forEach((grade) => {
          grade.strands.forEach((strand) => {
            expect(strand.chordPrefix).toBeDefined();
            expect(typeof strand.chordPrefix).toBe('string');
            expect(strand.chordPrefix.length).toBeGreaterThan(0);
          });
        });
      });
    });

    it('should validate each subject against teksSubjectSchema', () => {
      teksData.forEach((subject) => {
        const result = teksSubjectSchema.safeParse(subject);
        expect(result.success).toBe(true);
      });
    });

    it('should validate each grade against teksGradeSchema', () => {
      teksData.forEach((subject) => {
        subject.grades.forEach((grade) => {
          const result = teksGradeSchema.safeParse(grade);
          expect(result.success).toBe(true);
        });
      });
    });

    it('should validate each strand against teksStrandSchema', () => {
      teksData.forEach((subject) => {
        subject.grades.forEach((grade) => {
          grade.strands.forEach((strand) => {
            const result = teksStrandSchema.safeParse(strand);
            expect(result.success).toBe(true);
          });
        });
      });
    });

    it('should validate each standard against teksStandardSchema', () => {
      teksData.forEach((subject) => {
        subject.grades.forEach((grade) => {
          grade.strands.forEach((strand) => {
            strand.standards.forEach((standard) => {
              const result = teksStandardSchema.safeParse(standard);
              expect(result.success).toBe(true);
            });
          });
        });
      });
    });

    it('should have Science subject with Grade 3', () => {
      const scienceSubject = teksData.find((s) => s.subject === 'Science');
      expect(scienceSubject).toBeDefined();
      const grade3 = scienceSubject?.grades.find((g) => g.level === 'Grade 3');
      expect(grade3).toBeDefined();
    });

    it('should have Technology Applications subject with Grade 7', () => {
      const techSubject = teksData.find((s) => s.subject === 'Technology Applications');
      expect(techSubject).toBeDefined();
      const grade7 = techSubject?.grades.find((g) => g.level === 'Grade 7');
      expect(grade7).toBeDefined();
    });
  });
});
