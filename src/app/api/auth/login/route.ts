import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginSchema } from '@/lib/schemas/auth-schema';
import { login } from '@/lib/services/auth-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { setSessionCookie } from '@/lib/auth/cookies';

/**
 * POST /api/auth/login
 * Authenticates a user and creates a session.
 * Users can log in with either username or email (case-insensitive).
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
    
    const validatedData = loginSchema.parse(body);

    // Get database instance
    let db: D1Database;
    try {
      db = getDatabaseFromEnv();
    } catch (dbError) {
      console.error('Database error in login:', dbError);
      return NextResponse.json(
        { error: 'Database not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    // Authenticate user and create session
    const { user, sessionToken } = await login(
      db,
      validatedData.usernameOrEmail,
      validatedData.password
    );

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
      { status: 200 }
    );

    // Set HTTP-only cookie with session token (1 day expiration)
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

    // Handle invalid credentials
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Handle other errors
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate user' },
      { status: 500 }
    );
  }
}
