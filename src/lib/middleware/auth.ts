import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/services/auth-service';
import { getDatabaseFromEnv } from '@/lib/auth/get-database';
import { getSessionToken } from '@/lib/auth/cookies';

/**
 * Checks if a request is authenticated by validating the session token.
 * Used by middleware to determine if a user is logged in.
 * 
 * @param request - NextRequest object containing cookies
 * @returns Promise resolving to true if authenticated, false otherwise
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    // Get session token from cookies
    const sessionToken = getSessionToken(request.cookies);

    if (!sessionToken) {
      return false;
    }

    // Get database instance
    const db = getDatabaseFromEnv();

    // Verify session
    const isValid = await verifySession(db, sessionToken);

    return isValid;
  } catch (error) {
    // Log error but return false to allow graceful handling
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Checks if a path is a public route that doesn't require authentication.
 * 
 * @param pathname - The pathname to check
 * @returns true if the path is public, false otherwise
 */
export function isPublicRoute(pathname: string): boolean {
  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/verify-session',
  ];

  // Check if pathname matches any public route
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

/**
 * Checks if a path is an API route.
 * 
 * @param pathname - The pathname to check
 * @returns true if the path is an API route, false otherwise
 */
export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

/**
 * Gets the login URL for redirecting unauthenticated users.
 * 
 * @returns The login URL
 */
export function getLoginUrl(): string {
  return '/login';
}
