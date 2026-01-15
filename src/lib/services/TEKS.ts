/**
 * TEKS (Texas Essential Knowledge and Skills) service.
 * Provides access to TEKS standards data and validation.
 */

import {
  teksDataSchema,
  teksSubjectSchema,
  teksGradeSchema,
  teksStrandSchema,
  teksStandardSchema,
  type TeksStandard,
  type TeksStrand,
  type TeksGrade,
  type TeksSubject,
} from '@/lib/schemas/teks-schema';

/**
 * Sample TEKS dataset.
 * This data is validated against the TEKS schema to ensure type safety.
 */
export const teksData: TeksSubject[] = teksDataSchema.parse([
    {
      subject: "Science",
      grades: [
        {
          level: "Grade 3",
          strands: [
            {
              name: "Recurring themes and concepts",
              chordPrefix: "S.3.5",
              standards: [
                {
                  code: "S.3.5.A",
                  description:
                    "identify and use patterns to explain scientific phenomena or to design solutions;",
                },
                {
                  code: "S.3.5.B",
                  description:
                    "identify and investigate cause-and-effect relationships to explain scientific phenomena or analyze problems;",
                },
                {
                  code: "S.3.5.C",
                  description:
                    "use scale, proportion, and quantity to describe, compare, or model different systems;",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      subject: "Technology Applications",
      grades: [
        {
          level: "Grade 7",
          strands: [
            {
              name: "Computational thinking — foundations",
              chordPrefix: "TA.7.1",
              standards: [
                {
                  code: "TA.7.1.A",
                  description:
                    "decompose real-world problems into structured parts using flowcharts;",
                },
                {
                  code: "TA.7.1.B",
                  description:
                    "analyze patterns and sequences found in flowcharts;",
                },
              ],
            },
            {
              name: "Creativity and innovation — innovative design process",
              chordPrefix: "TA.7.3",
              standards: [
                {
                  code: "TA.7.3.A",
                  description:
                    "resolve challenges in design processes independently using goal setting and personal character traits such as demonstrating responsibility and advocating for self appropriately;",
                },
                {
                  code: "TA.7.3.B",
                  description:
                    "discuss and implement a design process that includes planning and selecting digital tools to develop and refine a prototype or model through trial and error;",
                },
              ],
            },
            {
              name: "Practical technology concepts — skills and tools",
              chordPrefix: "TA.7.12",
              standards: [
                {
                  code: "TA.7.12.C",
                  description:
                    "select and use appropriate platform and tools, including selecting and using software or hardware for a defined task;",
                },
                {
                  code: "TA.7.12.D",
                  description:
                    "demonstrate improvement in speed and accuracy as measured by words per minute when applying correct keyboarding techniques;",
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

// Re-export types for convenience
export type {
  TeksStandard,
  TeksStrand,
  TeksGrade,
  TeksSubject,
};

// Re-export schemas for validation use
export {
  teksDataSchema,
  teksSubjectSchema,
  teksGradeSchema,
  teksStrandSchema,
  teksStandardSchema,
};
  