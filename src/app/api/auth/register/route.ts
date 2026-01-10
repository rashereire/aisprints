import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerSchema } from '@/lib/schemas/auth-schema';
import { register } from '@/lib/services/auth-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { setSessionCookie } from '@/lib/auth/cookies';

/**
 * POST /api/auth/register
 * Creates a new user account and automatically logs them in.
 */
export async function POST(request: NextRequest) {
  try {
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
    
    const validatedData = registerSchema.parse(body);

    // Get database instance
    let db: D1Database;
    try {
      db = getDatabaseFromEnv();
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Database not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    // Register user and create session
    const { user, sessionToken } = await register(db, validatedData);

    // Create response with user data
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 201 }
    );

    // Set HTTP-only cookie with session token
    setSessionCookie(response, sessionToken);

    return response;
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    // Handle duplicate username/email
    if (error instanceof Error && (error.message === 'Username already exists' || error.message === 'Email already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    // Handle other errors - ensure we always return JSON
    console.error('Registration error:', error);
    
    // If error is not an Error instance, stringify it
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to create user account';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
