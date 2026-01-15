# Deployment Guide - QuizMaker App

## Overview

This guide covers the deployment process for QuizMaker to Cloudflare Workers, including verification steps to ensure database bindings are correctly configured. It also documents historical issues and their resolutions for reference.

## Prerequisites

1. **Cloudflare Account**: Ensure you have a Cloudflare account with Workers enabled
2. **D1 Database**: The production D1 database must exist and be accessible
3. **Wrangler CLI**: Installed and authenticated (`wrangler login`)
4. **Database Migrations**: All migrations must be applied to production database
5. **OpenAI API Key**: Required for TEKS-aligned MCQ generation feature

## Deployment Process

### Step 1: Build the Application

```bash
npm run build
npm run opennext-build
```

This creates:
- Next.js build in `.next/`
- OpenNext bundle in `.open-next/`
- Worker file at `.open-next/worker.js`

### Step 2: Verify Configuration

Before deploying, verify `wrangler.jsonc` contains:

```jsonc
{
  "name": "aisprints-starter",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": [
    "nodejs_compat",
    "nodejs_compat_populate_process_env",
    "global_fetch_strictly_public"
  ],
  "d1_databases": [
    {
      "binding": "quizmaker_db",
      "database_name": "quizmaker-db",
      "database_id": "0431e2ec-7879-491e-8555-16707ee87e49"
    }
  ]
}
```

**Critical**: The `binding` name (`quizmaker_db`) must match exactly what's used in code (`env.quizmaker_db`).

### Step 3: Set Production Secrets (IMPORTANT)

**Before deploying**, ensure the OpenAI API key is set as a Cloudflare secret:

```bash
wrangler secret put OPENAI_API_KEY
```

When prompted:
1. Paste your OpenAI API key (it won't be displayed for security)
2. Press Enter
3. The secret will be encrypted and stored securely

**Note**: This only needs to be done once, or when you need to update the key.

To verify the secret is set:
```bash
wrangler secret list
```

### Step 4: Deploy to Cloudflare

```bash
npm run deploy
```

This command:
1. Builds the Next.js application
2. Builds the OpenNext bundle
3. Deploys using `@opennextjs/cloudflare deploy`
4. Uses `wrangler.jsonc` for configuration

### Step 5: Verify Database Binding

After deployment, verify the database binding is active:

1. **Check Cloudflare Dashboard**:
   - Go to Workers & Pages → Your Worker
   - Check "Settings" → "Variables and Secrets"
   - Verify `quizmaker_db` binding is listed under D1 Databases
   - Verify database ID matches: `0431e2ec-7879-491e-8555-16707ee87e49`
   - Verify `OPENAI_API_KEY` is listed under Secrets (if using TEKS generation feature)

2. **Check Worker Logs**:
   - Go to Workers & Pages → Your Worker → Logs
   - Look for any binding-related errors
   - Check for messages like:
     - "getCloudflareContext() returned null/undefined"
     - "getCloudflareContext().env is null/undefined"
     - "Database not available. Ensure quizmaker_db binding is configured."

3. **Test API Endpoints**:
   - Try registering a user: `POST /api/auth/register`
   - Try logging in: `POST /api/auth/login`
   - Check logs for database connection errors

## Database Binding Configuration

### How Bindings Work

1. **Configuration File**: `wrangler.jsonc` defines the binding
2. **Binding Name**: `quizmaker_db` (must match code)
3. **Database ID**: `0431e2ec-7879-491e-8555-16707ee87e49`
4. **Database Name**: `quizmaker-db`

### Accessing Bindings in Code

The binding is accessed via `getCloudflareContext()`:

```typescript
import { getCloudflareContext } from '@opennextjs/cloudflare';

const { env } = getCloudflareContext();
const db = env.quizmaker_db; // D1Database instance
```

**Important**: All database access should go through `lib/auth/get-database.ts` which handles errors and logging.

## Common Deployment Issues

### Issue 1: 500 Errors on API Routes

**Symptoms**: API routes return 500 errors, especially `/api/auth/register` and `/api/auth/login`

**Possible Causes**:
1. Database binding not configured in production
2. `getCloudflareContext()` returning null/undefined
3. Database binding name mismatch
4. Database not accessible or migrations not applied
5. Insufficient error handling in API routes

**Debugging Steps**:
1. Check Cloudflare Worker logs for detailed error messages
2. Verify `wrangler.jsonc` is being read during deployment
3. Check if database binding appears in Cloudflare dashboard
4. Verify database ID is correct for production
5. Look for specific error messages in logs:
   - "getCloudflareContext() returned null/undefined"
   - "getCloudflareContext().env is null/undefined"
   - "Database not available. Ensure quizmaker_db binding is configured."

**Solution**:
- Enhanced error logging has been added to `lib/auth/get-database.ts`
- Improved error handling in `app/api/auth/login/route.ts`
- All API routes now have consistent error handling
- Check logs for specific error messages
- Verify binding configuration in Cloudflare dashboard

**Files Modified** (for reference):
- `src/lib/auth/get-database.ts` - Enhanced error handling and logging
- `src/app/api/auth/login/route.ts` - Added database error handling
- `src/app/api/auth/register/route.ts` - Verified error handling (already correct)

### Issue 2: Database Binding Not Found

**Error**: `Database not available. Ensure quizmaker_db binding is configured.`

**Solution**:
1. Verify `wrangler.jsonc` contains the `d1_databases` array
2. Ensure the binding name matches: `quizmaker_db`
3. Verify the database ID is correct for production
4. Ensure database exists in Cloudflare account
5. Redeploy after fixing configuration

### Issue 3: getCloudflareContext() Returns Null

**Error**: `Cloudflare context not available. This may indicate a deployment configuration issue.`

**Solution**:
1. Ensure you're deploying to Cloudflare Workers (not Pages)
2. Verify OpenNext Cloudflare adapter is correctly configured
3. Check that `@opennextjs/cloudflare` version is compatible
4. Review deployment logs for configuration errors
5. Verify `wrangler.jsonc` is in the project root and properly formatted

### Issue 4: "Database not available" in Dev Mode

**Error**: `Database not available` errors when running `npm run dev`

**Root Cause**: The enhanced error handling correctly detects that `getCloudflareContext()` is not available in regular Next.js dev mode. Database bindings require the Cloudflare Workers runtime environment.

**Solution**: Use the correct development command:
- For UI-only development: `npm run dev` (no database access)
- For full-stack development: `npm run preview` or `npm run dev:cf` (database access available)

See the [Development Modes](#development-modes) section for details.

### Issue 5: Environment Variables from .dev.vars Not Accessible (500 Internal Server Error)

**Error**: API routes return 500 errors when trying to access environment variables from `.dev.vars` (e.g., `OPENAI_API_KEY`)

**Root Cause**: In Cloudflare Workers, `process.env` is not populated by default. Environment variables from `.dev.vars` require the `nodejs_compat_populate_process_env` compatibility flag to be accessible via `process.env`.

**Solution**: 
1. Add `nodejs_compat_populate_process_env` to `compatibility_flags` in `wrangler.jsonc`:
   ```jsonc
   "compatibility_flags": [
     "nodejs_compat",
     "nodejs_compat_populate_process_env",  // <-- Required for .dev.vars access
     "global_fetch_strictly_public"
   ]
   ```
2. Restart the development server after adding the flag
3. Access environment variables via `process.env.VARIABLE_NAME` as normal

**Code Reference**: 
- `wrangler.jsonc` - Must include the flag
- `src/app/api/mcqs/generate-teks/route.ts` - Accesses `process.env.OPENAI_API_KEY`

**Important Notes**:
- This flag is required for any API route that needs to access environment variables from `.dev.vars`
- The flag must be added to `wrangler.jsonc` before the server is started
- After adding the flag, restart the server (`npm run preview` or `wrangler dev`)
- For production, use `wrangler secret put VARIABLE_NAME` instead of `.dev.vars`
- See `docs/BASIC_AUTHENTICATION.md` for more details on this common issue

## Historical Issues and Resolutions

### Production 500 Error Fix (January 2025)

**Status**: ✅ **RESOLVED**

**Issue**: Production deployment was experiencing 500 errors on:
- `/api/auth/register`
- `/api/auth/login`

**Root Cause Analysis**:
1. Insufficient error handling in API routes
2. Missing error logging to diagnose issues
3. Potential database binding configuration issues in production

**Changes Made**:

1. **Enhanced Error Handling in `lib/auth/get-database.ts`**:
   - Added null/undefined checks for `getCloudflareContext()` return value
   - Added null/undefined checks for `env` object
   - Added detailed error logging with stack traces
   - Added more specific error messages

2. **Improved Error Handling in `app/api/auth/login/route.ts`**:
   - Added try-catch around `getDatabaseFromEnv()` (matching register route)
   - Added JSON parsing error handling
   - Added specific error response for database errors

3. **Verified Error Handling in `app/api/auth/register/route.ts`**:
   - Already had proper error handling, verified it's correct

**Benefits**:
- Better visibility into what's failing
- Clearer error messages for debugging
- Prevents crashes from null/undefined values
- Consistent error handling across auth routes
- Better error messages for clients
- Prevents generic 500 errors

**Resolution**: Deployment successful, database bindings verified, migrations applied. All error logging now provides specific, actionable information.

## Verification Checklist

Before deploying to production:

- [ ] `wrangler.jsonc` contains `d1_databases` configuration
- [ ] Binding name `quizmaker_db` matches code usage
- [ ] Database ID is correct for production environment
- [ ] All migrations have been applied to production database
- [ ] `npm run build` completes successfully
- [ ] `npm run opennext-build` completes successfully
- [ ] Wrangler is authenticated (`wrangler whoami`)

After deployment:

- [ ] Worker appears in Cloudflare dashboard
- [ ] Database binding appears in Worker settings
- [ ] Database ID matches: `0431e2ec-7879-491e-8555-16707ee87e49`
- [ ] Worker logs show no binding errors
- [ ] API endpoints respond (even if with errors, not 500s)
- [ ] Test registration/login endpoints (see Testing section)
- [ ] Verify session management works correctly

## Database Migrations

### Apply Migrations to Production

```bash
# List migrations
wrangler d1 migrations list quizmaker-db

# Apply migrations to production
wrangler d1 migrations apply quizmaker-db --remote
```

**Important**: Always test migrations on local database first:
```bash
wrangler d1 migrations apply quizmaker-db --local
```

## Monitoring and Debugging

### View Worker Logs

1. **Cloudflare Dashboard**:
   - Workers & Pages → Your Worker → Logs
   - Filter by error level or search for specific errors

2. **Real-time Logs**:
   ```bash
   wrangler tail
   ```

### Error Logging

Enhanced error logging has been added to:
- `lib/auth/get-database.ts` - Logs context and env availability
- `app/api/auth/register/route.ts` - Logs database errors
- `app/api/auth/login/route.ts` - Logs database errors

All errors are logged to Cloudflare Worker logs with detailed information, including:
- Stack traces for debugging
- Specific error messages indicating what failed
- Context about whether bindings are available

## Testing

After deploying, test the following endpoints:

### Registration Endpoint

```bash
curl -X POST https://your-worker.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","username":"testuser","email":"test@example.com","password":"Test1234","confirmPassword":"Test1234"}'
```

**Expected Response**:
- **Success**: 201 status, user data returned, session cookie set
- **Error**: 400 (validation), 409 (duplicate), 500 (database error with specific message)

### Login Endpoint

```bash
curl -X POST https://your-worker.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"testuser","password":"Test1234"}'
```

**Expected Response**:
- **Success**: 200 status, user data returned, session cookie set
- **Error**: 400 (validation), 401 (invalid credentials), 500 (database error with specific message)

### Check Logs

After testing:
- Review Cloudflare Worker logs for any errors
- Verify error messages are detailed and helpful
- Ensure no 500 errors occur (should return specific error codes)

## Rollback Procedure

If deployment fails:

1. **Check Previous Version**:
   - Cloudflare dashboard → Workers & Pages → Your Worker → Versions
   - Rollback to previous working version if available

2. **Fix Configuration**:
   - Update `wrangler.jsonc` if needed
   - Fix any code issues
   - Rebuild and redeploy

3. **Verify Database**:
   - Ensure database is accessible
   - Check migrations are applied
   - Verify binding configuration

## Development Modes

### Understanding Different Development Commands

**`npm run dev`** - Regular Next.js Development:
- ✅ Fast hot-reload for UI development
- ✅ Good for frontend-only work
- ❌ **No database access** - Cloudflare bindings not available
- **Use when**: Developing UI components, styling, frontend logic

**Note**: If you see "Database not available" errors in `npm run dev`, this is expected. The enhanced error handling correctly detects that database bindings are not available in regular Next.js dev mode. Switch to `npm run preview` or `npm run dev:cf` for database access.

**`npm run preview`** - Full Stack Preview:
- ✅ Full Cloudflare Workers environment
- ✅ Database bindings available
- ✅ Production-like environment
- **Use when**: Testing API routes, database operations, full-stack features

**`npm run dev:cf`** - Wrangler Development:
- ✅ Full Cloudflare Workers environment
- ✅ Local D1 database support
- ✅ Database bindings available
- **Use when**: Full-stack development with local database

**Important**: Use `npm run preview` or `npm run dev:cf` when testing database features. The "Database not available" error in `npm run dev` is intentional and guides developers to use the correct command.

## Best Practices

1. **Always test locally first**: Use `npm run preview` to test before deploying
2. **Monitor logs**: Check Cloudflare logs after deployment
3. **Verify bindings**: Always verify bindings appear in Cloudflare dashboard
4. **Version control**: Keep `wrangler.jsonc` in version control
5. **Database migrations**: Apply migrations separately and verify before deploying code
6. **Staging environment**: Consider using a staging environment for testing
7. **Use correct dev mode**: Use `npm run preview` or `npm run dev:cf` when testing database features
8. **Check error logs**: Enhanced error logging provides specific information - use it to diagnose issues quickly

## Troubleshooting

### OpenNext Cloudflare Deploy Not Reading wrangler.jsonc

If `@opennextjs/cloudflare deploy` doesn't seem to read `wrangler.jsonc`:

1. Verify file is named `wrangler.jsonc` (not `wrangler.toml`)
2. Check file is in project root
3. Verify JSON syntax is valid (comments are allowed in `.jsonc`)
4. Try using `wrangler deploy` directly to test configuration

### Database Binding Not Appearing in Dashboard

1. Verify database exists in Cloudflare dashboard
2. Check database ID matches `wrangler.jsonc`
3. Ensure you have permissions to bind databases
4. Try manually binding in dashboard, then verify `wrangler.jsonc` matches

### If Errors Persist After Deployment

Based on the error logs, check:

1. **If `getCloudflareContext()` returns null**:
   - Verify OpenNext Cloudflare adapter is correctly configured
   - Check `@opennextjs/cloudflare` version compatibility
   - Verify deployment is to Cloudflare Workers (not Pages)

2. **If `env` is null/undefined**:
   - Verify `wrangler.jsonc` is being read during deployment
   - Check binding name matches: `quizmaker_db`
   - Verify database ID is correct for production

3. **If `quizmaker_db` binding is missing**:
   - Check `wrangler.jsonc` contains `d1_databases` array
   - Verify binding name matches exactly
   - Ensure database exists in Cloudflare account
   - Check database ID is correct

## Production Deployment Status

**Date**: January 9, 2025  
**Status**: ✅ **SUCCESSFUL**

### Deployment Details
- **Worker Name**: `aisprints-starter`
- **Deployment URL**: `https://aisprints-starter.quizmaker-app.workers.dev`
- **Version ID**: `1656c613-9955-452d-95d2-0fd992d836d5`

### Verified Bindings
- ✅ `env.quizmaker_db` → D1 Database (`quizmaker-db`)
- ✅ `env.ASSETS` → Assets

### Database Migrations
- ✅ Migration `0001_create_users_and_sessions.sql` applied to production
- ✅ Database schema verified

### Next Steps
- [ ] User testing of registration/login endpoints in production
- [ ] Monitor Cloudflare Worker logs for any errors
- [ ] Verify session management works correctly

## Additional Resources

- [OpenNext Cloudflare Documentation](https://opennext.js.org/cloudflare)
- [Cloudflare Workers D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Workers Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
