import { NextRequest } from 'next/server';
import { getCurrentUser as getCurrentUserFromService } from '@/lib/services/auth-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { getSessionToken } from '@/lib/auth/cookies';
import type { User } from '@/lib/schemas/auth-schema';

/**
 * Gets the current authenticated user from the request cookies.
 * This is a helper function for server components and API routes.
 * 
 * @param request - NextRequest object containing cookies
 * @returns Promise resolving to User if authenticated, null otherwise
 */
export async function getCurrentUser(request: NextRequest): Promise<User | null> {
  try {
    // Get session token from cookies
    const sessionToken = getSessionToken(request.cookies);

    if (!sessionToken) {
      return null;
    }

    // Get database instance
    const db = getDatabaseFromEnv();

    // Get current user from session
    const user = await getCurrentUserFromService(db, sessionToken);

    return user;
  } catch (error) {
    // Log error but return null to allow graceful handling
    console.error('Error getting current user:', error);
    return null;
  }
}
