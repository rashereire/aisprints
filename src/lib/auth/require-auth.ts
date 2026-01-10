import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { User } from '@/lib/schemas/auth-schema';

/**
 * Requires authentication and returns the current user.
 * Throws an error if the user is not authenticated.
 * This is a helper function for protected API routes.
 * 
 * @param request - NextRequest object containing cookies
 * @returns Promise resolving to User (never null)
 * @throws Error if user is not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<User> {
  const user = await getCurrentUser(request);

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}
