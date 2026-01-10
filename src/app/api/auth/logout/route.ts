import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/lib/services/auth-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { getSessionToken, clearSessionCookie } from '@/lib/auth/cookies';

/**
 * POST /api/auth/logout
 * Ends the user session by invalidating the session token.
 */
export async function POST(request: NextRequest) {
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

    // Invalidate session in database
    await logout(db, sessionToken);

    // Create response
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear session cookie
    clearSessionCookie(response);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
