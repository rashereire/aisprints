import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { getSessionToken } from '@/lib/auth/cookies';

/**
 * GET /api/auth/me
 * Gets the current authenticated user information.
 */
export async function GET(request: NextRequest) {
  try {
    // Get session token from cookies
    const sessionToken = getSessionToken(request.cookies);

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get database instance
    const db = getDatabaseFromEnv();

    // Get current user from session
    const user = await getCurrentUser(db, sessionToken);

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Return user data (without password hash)
    return NextResponse.json(
      {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 500 }
    );
  }
}
