# Deployment Guide - QuizMaker App

## Overview

This guide covers the deployment process for QuizMaker to Cloudflare Workers, including verification steps to ensure database bindings are correctly configured.

## Prerequisites

1. **Cloudflare Account**: Ensure you have a Cloudflare account with Workers enabled
2. **D1 Database**: The production D1 database must exist and be accessible
3. **Wrangler CLI**: Installed and authenticated (`wrangler login`)
4. **Database Migrations**: All migrations must be applied to production database

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
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
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

### Step 3: Deploy to Cloudflare

```bash
npm run deploy
```

This command:
1. Builds the Next.js application
2. Builds the OpenNext bundle
3. Deploys using `@opennextjs/cloudflare deploy`
4. Uses `wrangler.jsonc` for configuration

### Step 4: Verify Database Binding

After deployment, verify the database binding is active:

1. **Check Cloudflare Dashboard**:
   - Go to Workers & Pages → Your Worker
   - Check "Settings" → "Variables and Secrets"
   - Verify `quizmaker_db` binding is listed under D1 Databases

2. **Check Worker Logs**:
   - Go to Workers & Pages → Your Worker → Logs
   - Look for any binding-related errors

3. **Test API Endpoints**:
   - Try registering a user: `POST /api/auth/register`
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

**Debugging Steps**:
1. Check Cloudflare Worker logs for detailed error messages
2. Verify `wrangler.jsonc` is being read during deployment
3. Check if database binding appears in Cloudflare dashboard
4. Verify database ID is correct for production

**Solution**:
- Enhanced error logging has been added to `lib/auth/get-database.ts`
- Check logs for specific error messages
- Verify binding configuration in Cloudflare dashboard

### Issue 2: Database Binding Not Found

**Error**: `Database not available. Ensure quizmaker_db binding is configured.`

**Solution**:
1. Verify `wrangler.jsonc` contains the `d1_databases` array
2. Ensure the binding name matches: `quizmaker_db`
3. Verify the database ID is correct for production
4. Redeploy after fixing configuration

### Issue 3: getCloudflareContext() Returns Null

**Error**: `Cloudflare context not available. This may indicate a deployment configuration issue.`

**Solution**:
1. Ensure you're deploying to Cloudflare Workers (not Pages)
2. Verify OpenNext Cloudflare adapter is correctly configured
3. Check that `@opennextjs/cloudflare` version is compatible
4. Review deployment logs for configuration errors

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
- [ ] Worker logs show no binding errors
- [ ] API endpoints respond (even if with errors, not 500s)
- [ ] Test registration/login endpoints

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

All errors are logged to Cloudflare Worker logs with detailed information.

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

**Important**: If you see "Database not available" errors in `npm run dev`, switch to `npm run preview` or `npm run dev:cf` for database access.

## Best Practices

1. **Always test locally first**: Use `npm run preview` to test before deploying
2. **Monitor logs**: Check Cloudflare logs after deployment
3. **Verify bindings**: Always verify bindings appear in Cloudflare dashboard
4. **Version control**: Keep `wrangler.jsonc` in version control
5. **Database migrations**: Apply migrations separately and verify before deploying code
6. **Staging environment**: Consider using a staging environment for testing
7. **Use correct dev mode**: Use `npm run preview` or `npm run dev:cf` when testing database features

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

## Additional Resources

- [OpenNext Cloudflare Documentation](https://opennext.js.org/cloudflare)
- [Cloudflare Workers D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Workers Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
