import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mcqUpdateSchema } from '@/lib/schemas/mcq-schema';
import { getMcqById, updateMcq, deleteMcq, verifyMcqOwnership } from '@/lib/services/mcq-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { getCurrentUser } from '@/lib/auth/get-current-user';

/**
 * GET /api/mcqs/[id]
 * Retrieves a single MCQ by ID with its choices.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get database instance
    let db: D1Database;
    try {
      db = getDatabaseFromEnv();
    } catch (dbError) {
      console.error('Database error in GET /api/mcqs/[id]:', dbError);
      return NextResponse.json(
        { error: 'Database not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    // Get MCQ
    const mcq = await getMcqById(db, id);

    if (!mcq) {
      return NextResponse.json(
        { error: 'MCQ not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(mcq, { status: 200 });
  } catch (error) {
    console.error('GET /api/mcqs/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve MCQ' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mcqs/[id]
 * Updates an existing MCQ.
 * Requires authentication and ownership.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Require authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify ownership
    let db: D1Database;
    try {
      db = getDatabaseFromEnv();
    } catch (dbError) {
      console.error('Database error in PUT /api/mcqs/[id]:', dbError);
      return NextResponse.json(
        { error: 'Database not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    const ownsMcq = await verifyMcqOwnership(db, id, user.id);
    if (!ownsMcq) {
      return NextResponse.json(
        { error: 'You do not have permission to update this MCQ' },
        { status: 403 }
      );
    }

    // Check if MCQ exists
    const existingMcq = await getMcqById(db, id);
    if (!existingMcq) {
      return NextResponse.json(
        { error: 'MCQ not found' },
        { status: 404 }
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

    const validatedData = mcqUpdateSchema.parse(body);

    // Update MCQ
    const updatedMcq = await updateMcq(db, id, user.id, validatedData);

    return NextResponse.json(updatedMcq, { status: 200 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    // Handle ownership/permission errors
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    // Handle other errors
    console.error('PUT /api/mcqs/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update MCQ' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcqs/[id]
 * Deletes an MCQ and all associated choices and attempts.
 * Requires authentication and ownership.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Require authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get database instance
    let db: D1Database;
    try {
      db = getDatabaseFromEnv();
    } catch (dbError) {
      console.error('Database error in DELETE /api/mcqs/[id]:', dbError);
      return NextResponse.json(
        { error: 'Database not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    // Check if MCQ exists
    const existingMcq = await getMcqById(db, id);
    if (!existingMcq) {
      return NextResponse.json(
        { error: 'MCQ not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const ownsMcq = await verifyMcqOwnership(db, id, user.id);
    if (!ownsMcq) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this MCQ' },
        { status: 403 }
      );
    }

    // Delete MCQ
    await deleteMcq(db, id, user.id);

    return NextResponse.json(
      { message: 'MCQ deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    // Handle ownership/permission errors
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    // Handle other errors
    console.error('DELETE /api/mcqs/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCQ' },
      { status: 500 }
    );
  }
}
