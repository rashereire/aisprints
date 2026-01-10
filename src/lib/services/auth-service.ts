import { executeQueryFirst, executeMutation } from '@/lib/d1-client';
import { createUser, getUserById } from '@/lib/services/user-service';
import { createSession, validateSessionToken } from '@/lib/utils/session';
import { verifyPassword } from '@/lib/utils/password';
import type { RegisterInput, User } from '@/lib/schemas/auth-schema';

// D1Database type is available globally from cloudflare-env.d.ts

/**
 * Database user structure with password hash (for internal use)
 */
interface DbUserWithPassword {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

/**
 * Transforms a database user object to the User type (camelCase).
 * Excludes the password_hash field for security.
 */
function transformDbUserToUser(dbUser: DbUserWithPassword): User {
  return {
    id: dbUser.id,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    username: dbUser.username,
    email: dbUser.email,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

/**
 * Registers a new user and automatically logs them in.
 * Creates the user account, hashes the password, creates a session, and returns the user and session token.
 * 
 * @param db - D1Database instance
 * @param userData - User registration data
 * @returns Promise resolving to user and session token
 * @throws Error if username or email already exists
 */
export async function register(
  db: D1Database,
  userData: RegisterInput
): Promise<{ user: User; sessionToken: string }> {
  // Create the user (this handles password hashing and duplicate checking)
  const user = await createUser(db, userData);

  // Create a session for the newly registered user (1 day expiration)
  const sessionToken = await createSession(db, user.id, 1);

  return {
    user,
    sessionToken,
  };
}

/**
 * Authenticates a user and creates a session.
 * Finds user by username or email (case-insensitive), verifies password, and creates session.
 * 
 * @param db - D1Database instance
 * @param usernameOrEmail - Username or email to authenticate
 * @param password - Plain text password to verify
 * @returns Promise resolving to user and session token
 * @throws Error if credentials are invalid
 */
export async function login(
  db: D1Database,
  usernameOrEmail: string,
  password: string
): Promise<{ user: User; sessionToken: string }> {
  // Get user with password hash for verification
  // We need to query directly to get the password_hash
  const dbUser = await executeQueryFirst<DbUserWithPassword>(
    db,
    `SELECT id, first_name, last_name, username, email, password_hash, created_at, updated_at
     FROM users
     WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
    [usernameOrEmail, usernameOrEmail]
  );

  if (!dbUser) {
    throw new Error('Invalid credentials');
  }

  // Verify the password
  const isValidPassword = await verifyPassword(password, dbUser.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Transform to User type (without password)
  const user = transformDbUserToUser(dbUser);

  // Create a session (1 day expiration)
  const sessionToken = await createSession(db, user.id, 1);

  return {
    user,
    sessionToken,
  };
}

/**
 * Logs out a user by invalidating their session.
 * Deletes the session from the database.
 * 
 * @param db - D1Database instance
 * @param sessionToken - Session token to invalidate
 * @returns Promise resolving when session is deleted
 */
export async function logout(
  db: D1Database,
  sessionToken: string
): Promise<void> {
  await executeMutation(
    db,
    `DELETE FROM user_sessions WHERE session_token = ?`,
    [sessionToken]
  );
}

/**
 * Gets the current user from a session token.
 * Validates the session and returns the associated user.
 * 
 * @param db - D1Database instance
 * @param sessionToken - Session token to validate
 * @returns Promise resolving to User if session is valid, null otherwise
 */
export async function getCurrentUser(
  db: D1Database,
  sessionToken: string
): Promise<User | null> {
  // Validate the session token
  const session = await validateSessionToken(db, sessionToken);
  if (!session) {
    return null;
  }

  // Get the user associated with the session
  const user = await getUserById(db, session.user_id);
  return user;
}

/**
 * Verifies if a session token is valid.
 * Checks that the session exists and is not expired.
 * 
 * @param db - D1Database instance
 * @param sessionToken - Session token to verify
 * @returns Promise resolving to true if session is valid, false otherwise
 */
export async function verifySession(
  db: D1Database,
  sessionToken: string
): Promise<boolean> {
  const session = await validateSessionToken(db, sessionToken);
  return session !== null;
}

/**
 * Cleans up expired sessions from the database.
 * Removes all sessions that have passed their expiration date.
 * 
 * @param db - D1Database instance
 * @returns Promise resolving to the number of deleted sessions
 */
export async function cleanupExpiredSessions(
  db: D1Database
): Promise<number> {
  const result = await executeMutation(
    db,
    `DELETE FROM user_sessions WHERE expires_at <= datetime('now')`
  );

  return result.meta.changes || 0;
}
