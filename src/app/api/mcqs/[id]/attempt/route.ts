import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mcqAttemptSchema } from '@/lib/schemas/mcq-schema';
import { recordAttempt } from '@/lib/services/mcq-attempt-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * POST /api/mcqs/[id]/attempt
 * Records a student's attempt at answering an MCQ.
 * Requires authentication.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mcqId } = await params;

    // Require authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validatedData = mcqAttemptSchema.parse(body);

    // Get database instance
    let db: D1Database;
    try {
      db = getDatabaseFromEnv();
    } catch (dbError) {
      console.error('Database error in POST /api/mcqs/[id]/attempt:', dbError);
      return NextResponse.json(
        { error: 'Database not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    // Record attempt
    const attempt = await recordAttempt(
      db,
      user.id,
      mcqId,
      validatedData.selectedChoiceId
    );

    return NextResponse.json(attempt, { status: 201 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message === 'Choice not found') {
        return NextResponse.json(
          { error: 'Selected choice not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Choice does not belong to this MCQ') {
        return NextResponse.json(
          { error: 'Selected choice does not belong to this MCQ' },
          { status: 400 }
        );
      }
    }

    // Handle other errors
    console.error('POST /api/mcqs/[id]/attempt error:', error);
    return NextResponse.json(
      { error: 'Failed to record attempt' },
      { status: 500 }
    );
  }
}
