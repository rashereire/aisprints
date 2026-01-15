import { executeQueryFirst, executeMutation } from '@/lib/d1-client';
// D1Database type is available globally from cloudflare-env.d.ts

/**
 * User session data structure
 */
export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
}

/**
 * Generates a cryptographically random session token.
 * Uses 32 random bytes (64 hex characters) for sufficient entropy.
 * 
 * @returns A unique session token string
 */
export function generateSessionToken(): string {
  // Generate 32 random bytes and convert to hex (64 characters)
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Creates a new user session in the database.
 * 
 * @param db - D1Database instance
 * @param userId - User ID to create session for
 * @param expiresInDays - Number of days until session expires (default: 1)
 * @returns Promise resolving to the session token
 */
export async function createSession(
  db: D1Database,
  userId: string,
  expiresInDays: number = 1
): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Insert session into database
  await executeMutation(
    db,
    `INSERT INTO user_sessions (user_id, session_token, expires_at)
     VALUES (?, ?, datetime(?))`,
    [userId, sessionToken, expiresAt.toISOString()]
  );

  return sessionToken;
}

/**
 * Validates a session token and returns the session data if valid.
 * Checks that the session exists, is not expired, and returns the session.
 * 
 * @param db - D1Database instance
 * @param token - Session token to validate
 * @returns Promise resolving to UserSession if valid, null otherwise
 */
export async function validateSessionToken(
  db: D1Database,
  token: string
): Promise<UserSession | null> {
  const session = await executeQueryFirst<UserSession>(
    db,
    `SELECT id, user_id, session_token, expires_at, created_at
     FROM user_sessions
     WHERE session_token = ? AND expires_at > datetime('now')`,
    [token]
  );

  return session;
}
