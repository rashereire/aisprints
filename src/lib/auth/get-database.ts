import { getDatabase } from '@/lib/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Gets the D1 database instance from the Cloudflare Workers environment.
 * Uses the OpenNext Cloudflare utility to access bindings.
 * 
 * @returns D1Database instance
 * @throws Error if database is not available
 */
export function getDatabaseFromEnv(): D1Database {
  try {
    // Get Cloudflare context which contains the environment bindings
    let context;
    try {
      context = getCloudflareContext();
    } catch (contextError) {
      // getCloudflareContext() may throw in non-Cloudflare environments (e.g., regular Next.js dev)
      const isDevMode = process.env.NODE_ENV === 'development' || process.env.NEXTJS_ENV === 'development';
      if (isDevMode) {
        throw new Error(
          'Database not available in regular Next.js dev mode. ' +
          'Please use "npm run preview" or "wrangler dev --local" to access the D1 database. ' +
          'These commands provide the Cloudflare Workers environment needed for database bindings.'
        );
      }
      // In production/preview, re-throw the original error
      throw contextError;
    }
    
    if (!context) {
      const isDevMode = process.env.NODE_ENV === 'development' || process.env.NEXTJS_ENV === 'development';
      if (isDevMode) {
        throw new Error(
          'Database not available in regular Next.js dev mode. ' +
          'Please use "npm run preview" or "wrangler dev --local" to access the D1 database.'
        );
      }
      console.error('getCloudflareContext() returned null/undefined');
      throw new Error(
        'Cloudflare context not available. This may indicate a deployment configuration issue.'
      );
    }
    
    const { env } = context;
    
    if (!env) {
      console.error('getCloudflareContext().env is null/undefined');
      throw new Error(
        'Cloudflare environment not available. Ensure bindings are configured in wrangler.jsonc.'
      );
    }
    
    // Access the database binding (matches wrangler.jsonc configuration: quizmaker_db)
    return getDatabase(env as { quizmaker_db?: D1Database });
  } catch (error) {
    // Log the full error for debugging (but only in non-dev mode to avoid noise)
    const isDevMode = process.env.NODE_ENV === 'development' || process.env.NEXTJS_ENV === 'development';
    if (!isDevMode) {
      console.error('getDatabaseFromEnv error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error?.constructor?.name,
      });
    }
    
    // Provide a more helpful error message
    if (error instanceof Error && error.message.includes('Database not available')) {
      // Don't modify the error message if it already has helpful context
      if (!error.message.includes('regular Next.js dev mode')) {
        throw new Error(
          'Database not available. This project requires Cloudflare Workers environment. ' +
          'Please use "npm run preview" or "wrangler dev" instead of "npm run dev" to access the D1 database.'
        );
      }
    }
    throw error;
  }
}
