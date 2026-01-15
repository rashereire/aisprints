import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated, isPublicRoute, isApiRoute, getLoginUrl } from '@/lib/middleware/auth';

/**
 * Next.js middleware for authentication and route protection.
 * 
 * This middleware:
 * - Checks authentication for protected routes
 * - Redirects unauthenticated users to login
 * - Skips middleware for public routes
 * - Handles API routes appropriately (returns 401 instead of redirect)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const authenticated = await isAuthenticated(request);

  // If not authenticated, handle based on route type
  if (!authenticated) {
    // For API routes, return 401 Unauthorized
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For page routes, redirect to login
    const loginUrl = getLoginUrl();
    const redirectUrl = new URL(loginUrl, request.url);
    // Add the original URL as a redirect parameter so we can redirect back after login
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // User is authenticated, allow request to proceed
  return NextResponse.next();
}

/**
 * Configures which routes the middleware should run on.
 * By default, middleware runs on all routes except:
 * - Static files (images, fonts, etc.)
 * - Next.js internal files (_next)
 * - API routes that are public
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
