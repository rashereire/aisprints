import { NextResponse } from 'next/server';

/**
 * Cookie name for session token
 */
export const SESSION_COOKIE_NAME = 'session_token';

/**
 * Sets an HTTP-only cookie with the session token.
 * Cookie expires in 1 day (24 hours).
 * 
 * @param response - NextResponse object to set cookie on
 * @param sessionToken - Session token to set
 * @returns NextResponse with cookie set
 */
export function setSessionCookie(response: NextResponse, sessionToken: string): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day in seconds
    path: '/',
  });
  return response;
}

/**
 * Gets the session token from request cookies.
 * 
 * @param cookies - Cookies object from request
 * @returns Session token if present, null otherwise
 */
export function getSessionToken(cookies: { get: (name: string) => { value: string } | undefined }): string | null {
  const sessionCookie = cookies.get(SESSION_COOKIE_NAME);
  return sessionCookie?.value || null;
}

/**
 * Clears the session cookie.
 * 
 * @param response - NextResponse object to clear cookie on
 * @returns NextResponse with cookie cleared
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
