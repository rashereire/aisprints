import { executeQueryFirst, executeMutation, generateId } from '@/lib/d1-client';
import { hashPassword } from '@/lib/utils/password';
import type { RegisterInput, User } from '@/lib/schemas/auth-schema';

// D1Database type is available globally from cloudflare-env.d.ts

/**
 * Database user structure (matches database schema with snake_case)
 */
interface DbUser {
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
 * 
 * @param dbUser - Database user object with snake_case fields
 * @returns User object with camelCase fields (without password)
 */
function transformDbUserToUser(dbUser: DbUser): User {
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
 * Creates a new user in the database.
 * Hashes the password before storing it.
 * 
 * @param db - D1Database instance
 * @param userData - User registration data
 * @returns Promise resolving to the created User (without password hash)
 * @throws Error if username or email already exists
 */
export async function createUser(
  db: D1Database,
  userData: RegisterInput
): Promise<User> {
  // Check if username already exists (case-insensitive)
  const existingUsername = await getUserByUsername(db, userData.username);
  if (existingUsername) {
    throw new Error('Username already exists');
  }

  // Check if email already exists (case-insensitive)
  const existingEmail = await getUserByEmail(db, userData.email);
  if (existingEmail) {
    throw new Error('Email already exists');
  }

  // Hash the password
  const passwordHash = await hashPassword(userData.password);

  // Generate unique ID
  const userId = generateId();

  // Insert user into database
  // Note: Username and email are stored as-is, but lookups use LOWER() for case-insensitive matching
  await executeMutation(
    db,
    `INSERT INTO users (id, first_name, last_name, username, email, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      userData.firstName,
      userData.lastName,
      userData.username,
      userData.email,
      passwordHash,
    ]
  );

  // Retrieve and return the created user
  const createdUser = await getUserById(db, userId);
  if (!createdUser) {
    throw new Error('Failed to retrieve created user');
  }

  return createdUser;
}

/**
 * Retrieves a user by their ID.
 * 
 * @param db - D1Database instance
 * @param id - User ID
 * @returns Promise resolving to User if found, null otherwise
 */
export async function getUserById(
  db: D1Database,
  id: string
): Promise<User | null> {
  const dbUser = await executeQueryFirst<DbUser>(
    db,
    `SELECT id, first_name, last_name, username, email, password_hash, created_at, updated_at
     FROM users
     WHERE id = ?`,
    [id]
  );

  if (!dbUser) {
    return null;
  }

  return transformDbUserToUser(dbUser);
}

/**
 * Retrieves a user by their username (case-insensitive).
 * 
 * @param db - D1Database instance
 * @param username - Username to search for
 * @returns Promise resolving to User if found, null otherwise
 */
export async function getUserByUsername(
  db: D1Database,
  username: string
): Promise<User | null> {
  const dbUser = await executeQueryFirst<DbUser>(
    db,
    `SELECT id, first_name, last_name, username, email, password_hash, created_at, updated_at
     FROM users
     WHERE LOWER(username) = LOWER(?)`,
    [username]
  );

  if (!dbUser) {
    return null;
  }

  return transformDbUserToUser(dbUser);
}

/**
 * Retrieves a user by their email (case-insensitive).
 * 
 * @param db - D1Database instance
 * @param email - Email to search for
 * @returns Promise resolving to User if found, null otherwise
 */
export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<User | null> {
  const dbUser = await executeQueryFirst<DbUser>(
    db,
    `SELECT id, first_name, last_name, username, email, password_hash, created_at, updated_at
     FROM users
     WHERE LOWER(email) = LOWER(?)`,
    [email]
  );

  if (!dbUser) {
    return null;
  }

  return transformDbUserToUser(dbUser);
}

/**
 * Retrieves a user by their username or email (case-insensitive).
 * Searches both username and email fields.
 * 
 * @param db - D1Database instance
 * @param identifier - Username or email to search for
 * @returns Promise resolving to User if found, null otherwise
 */
export async function getUserByUsernameOrEmail(
  db: D1Database,
  identifier: string
): Promise<User | null> {
  const dbUser = await executeQueryFirst<DbUser>(
    db,
    `SELECT id, first_name, last_name, username, email, password_hash, created_at, updated_at
     FROM users
     WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
    [identifier, identifier]
  );

  if (!dbUser) {
    return null;
  }

  return transformDbUserToUser(dbUser);
}

/**
 * Checks if a username already exists (case-insensitive).
 * 
 * @param db - D1Database instance
 * @param username - Username to check
 * @returns Promise resolving to true if username exists, false otherwise
 */
export async function checkUsernameExists(
  db: D1Database,
  username: string
): Promise<boolean> {
  const user = await getUserByUsername(db, username);
  return user !== null;
}

/**
 * Checks if an email already exists (case-insensitive).
 * 
 * @param db - D1Database instance
 * @param email - Email to check
 * @returns Promise resolving to true if email exists, false otherwise
 */
export async function checkEmailExists(
  db: D1Database,
  email: string
): Promise<boolean> {
  const user = await getUserByEmail(db, email);
  return user !== null;
}
