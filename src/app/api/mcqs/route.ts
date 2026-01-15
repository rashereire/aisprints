import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mcqCreateSchema } from '@/lib/schemas/mcq-schema';
import { createMcq, getMcqs } from '@/lib/services/mcq-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * GET /api/mcqs
 * Retrieves paginated MCQs with optional search and filtering.
 */
export async function GET(request: NextRequest) {
  try {
    // Get database instance
    let db: D1Database;
    try {
      db = getDatabaseFromEnv();
    } catch (dbError) {
      console.error('Database error in GET /api/mcqs:', dbError);
      return NextResponse.json(
        { error: 'Database not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const search = searchParams.get('search') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const sort = searchParams.get('sort') || undefined;
    const order = (searchParams.get('order') as 'asc' | 'desc') || undefined;

    // Validate pagination params
    if (page !== undefined && (isNaN(page) || page < 1)) {
      return NextResponse.json(
        { error: 'Page must be a positive integer' },
        { status: 400 }
      );
    }

    if (limit !== undefined) {
      if (isNaN(limit) || limit < 1) {
        return NextResponse.json(
          { error: 'Limit must be a positive integer' },
          { status: 400 }
        );
      }
      if (limit > 100) {
        return NextResponse.json(
          { error: 'Limit cannot exceed 100' },
          { status: 400 }
        );
      }
    }

    // Call service method
    const result = await getMcqs(db, {
      page,
      limit,
      search,
      userId,
      sort,
      order,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('GET /api/mcqs error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve MCQs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcqs
 * Creates a new MCQ with choices.
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
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

    const validatedData = mcqCreateSchema.parse(body);

    // Get database instance
    let db: D1Database;
    try {
      db = getDatabaseFromEnv();
    } catch (dbError) {
      console.error('Database error in POST /api/mcqs:', dbError);
      return NextResponse.json(
        { error: 'Database not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    // Create MCQ
    const mcq = await createMcq(db, user.id, validatedData);

    return NextResponse.json(mcq, { status: 201 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    // Handle other errors
    console.error('POST /api/mcqs error:', error);
    return NextResponse.json(
      { error: 'Failed to create MCQ' },
      { status: 500 }
    );
  }
}
