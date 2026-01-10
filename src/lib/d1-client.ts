// D1Database type is available globally from cloudflare-env.d.ts

/**
 * Normalizes SQL placeholders from anonymous `?` to positional `?1`, `?2`, etc.
 * This is required to avoid D1 binding errors in local development.
 * 
 * @param sql - SQL query string with anonymous placeholders
 * @returns SQL query string with positional placeholders
 */
function normalizePlaceholders(sql: string): string {
  let placeholderIndex = 1;
  return sql.replace(/\?/g, () => `?${placeholderIndex++}`);
}

/**
 * Gets the D1 database instance from the environment.
 * The database binding is `quizmaker_db` as defined in wrangler.jsonc.
 * 
 * @param env - Cloudflare environment object containing the database binding
 * @returns D1Database instance
 * @throws Error if database is not available
 */
export function getDatabase(env: { quizmaker_db?: D1Database }): D1Database {
  const db = env.quizmaker_db;
  if (!db) {
    throw new Error('Database not available. Ensure quizmaker_db binding is configured.');
  }
  return db;
}

/**
 * Generates a unique ID using the same format as the database default.
 * Uses lower(hex(randomblob(16))) which matches the SQL DEFAULT expression.
 * 
 * @returns A unique 32-character hexadecimal string (lowercase)
 */
export function generateId(): string {
  // Generate 16 random bytes and convert to hex
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toLowerCase();
}

/**
 * Executes a SELECT query and returns all results.
 * Normalizes placeholders and handles parameter binding safely.
 * 
 * @param db - D1Database instance
 * @param sql - SQL query string with placeholders
 * @param params - Array of parameters to bind
 * @returns Promise resolving to array of result rows
 */
export async function executeQuery<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const normalizedSql = normalizePlaceholders(sql);
    const stmt = db.prepare(normalizedSql);
    const boundStmt = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await boundStmt.all<T>();
    return result.results || [];
  } catch (error) {
    // Fallback for wrangler-dev binding quirks
    if (error instanceof Error && error.message.includes('binding')) {
      const normalizedSql = normalizePlaceholders(sql);
      const stmt = db.prepare(normalizedSql);
      const boundStmt = params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await boundStmt.all<T>();
      return result.results || [];
    }
    throw error;
  }
}

/**
 * Executes a SELECT query and returns the first result row.
 * Uses executeQuery internally and returns the first row.
 * Prefer this over calling stmt.first() directly per D1 best practices.
 * 
 * @param db - D1Database instance
 * @param sql - SQL query string with placeholders
 * @param params - Array of parameters to bind
 * @returns Promise resolving to the first result row or null if no results
 */
export async function executeQueryFirst<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const results = await executeQuery<T>(db, sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Executes an INSERT, UPDATE, or DELETE mutation.
 * Normalizes placeholders and handles parameter binding safely.
 * 
 * @param db - D1Database instance
 * @param sql - SQL mutation string with placeholders
 * @param params - Array of parameters to bind
 * @returns Promise resolving to the mutation result
 */
export async function executeMutation(
  db: D1Database,
  sql: string,
  params: unknown[] = []
): Promise<D1Result<Record<string, unknown>>> {
  try {
    const normalizedSql = normalizePlaceholders(sql);
    const stmt = db.prepare(normalizedSql);
    const boundStmt = params.length > 0 ? stmt.bind(...params) : stmt;
    return await boundStmt.run();
  } catch (error) {
    // Fallback for wrangler-dev binding quirks
    if (error instanceof Error && error.message.includes('binding')) {
      const normalizedSql = normalizePlaceholders(sql);
      const stmt = db.prepare(normalizedSql);
      const boundStmt = params.length > 0 ? stmt.bind(...params) : stmt;
      return await boundStmt.run();
    }
    throw error;
  }
}

/**
 * Executes a batch of prepared statements in a single transaction.
 * All statements are executed atomically - if any fails, all are rolled back.
 * 
 * @param db - D1Database instance
 * @param statements - Array of objects with sql and params
 * @returns Promise resolving to array of results
 */
export async function executeBatch<T = Record<string, unknown>>(
  db: D1Database,
  statements: Array<{ sql: string; params?: unknown[] }>
): Promise<D1Result<T>[]> {
  const preparedStatements = statements.map(({ sql, params = [] }) => {
    const normalizedSql = normalizePlaceholders(sql);
    const stmt = db.prepare(normalizedSql);
    return params.length > 0 ? stmt.bind(...params) : stmt;
  });

  return await db.batch(preparedStatements);
}

// D1Result type is available globally from cloudflare-env.d.ts
