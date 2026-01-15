import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/services/auth-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { getSessionToken } from '@/lib/auth/cookies';

/**
 * POST /api/auth/verify-session
 * Verifies if the current session is valid.
 * Used by middleware to check authentication status.
 */
export async function POST(request: NextRequest) {
  try {
    // Get session token from cookies
    const sessionToken = getSessionToken(request.cookies);

    if (!sessionToken) {
      return NextResponse.json(
        { valid: false, error: 'No session token' },
        { status: 401 }
      );
    }

    // Get database instance
    const db = getDatabaseFromEnv();

    // Verify session
    const isValid = await verifySession(db, sessionToken);

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: 'Session invalid or expired' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { valid: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}
