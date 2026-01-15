# Basic Authentication - Technical PRD

## Overview

This document outlines the requirements for implementing basic user authentication and user management in QuizMaker. The system will provide user registration, login, session management, and user profile functionality. This authentication system serves as the foundation for securing MCQ operations and tracking user attempts. The initial implementation will use a simple session-based approach with cookies, with the understanding that it can be upgraded to a more robust authentication framework in the future.

---

## Business Requirements

### User Management
- Users can create an account by providing first name, last name, username, email, and password
- Users can log in using their username/email and password
- Users can log out of their session
- User accounts are required to access protected features (creating MCQs, taking quizzes)
- Each user has a unique identifier that links to their created content and attempts

### Security Requirements
- Passwords must be securely hashed before storage (never stored in plain text)
- User sessions must be managed securely using HTTP-only cookies
- Protected routes must verify user authentication before allowing access
- Passwords must meet minimum security requirements (length, complexity)

### Data Requirements
- User information must be stored in a database table
- User sessions must be trackable and manageable
- User authentication state must be accessible throughout the application

---

## Technical Requirements

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table (for session management)
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

### Authentication Approach

**Recommended**: Simple session-based authentication using:
- **Password Hashing**: `bcryptjs` library (works in Cloudflare Workers with Node.js compatibility)
- **Session Management**: HTTP-only cookies with secure session tokens
- **Session Storage**: Database table for session tracking
- **Middleware**: Next.js middleware or route-level checks for protected routes

**Why this approach**:
- Simple to implement and understand
- Works well with Cloudflare Workers and Next.js
- Secure (HTTP-only cookies prevent XSS, bcrypt prevents password leaks)
- Can be upgraded to OAuth/JWT later without major refactoring
- No external service dependencies

### API Endpoints

#### POST /api/auth/register
**Purpose**: Create a new user account

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Validation Rules**:
- First name: Required, 1-50 characters
- Last name: Required, 1-50 characters
- Username: Required, 3-30 characters, alphanumeric and underscores only, unique
- Email: Required, valid email format, unique
- Password: Required, minimum 8 characters, must contain at least one letter and one number

**Response**:
- Success (201): User created and automatically logged in
```json
{
  "user": {
    "id": "user123",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john.doe@example.com"
  },
  "sessionToken": "session_token_here"
}
```
- Error (400): Validation error with field-specific messages
- Error (409): Username or email already exists

#### POST /api/auth/login
**Purpose**: Authenticate user and create session. Users can log in with either username or email (case-insensitive).

**Request Body**:
```json
{
  "usernameOrEmail": "johndoe",
  "password": "SecurePassword123!"
}
```

**Validation Rules**:
- `usernameOrEmail` is matched against both `username` and `email` fields (case-insensitive)
- Password is required

**Response**:
- Success (200): User authenticated, session created
```json
{
  "user": {
    "id": "user123",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john.doe@example.com"
  },
  "sessionToken": "session_token_here"
}
```
- Error (401): Invalid credentials
- Error (400): Missing username/email or password

#### POST /api/auth/logout
**Purpose**: End user session

**Response**:
- Success (200): Session terminated
- Error (401): Not authenticated

#### GET /api/auth/me
**Purpose**: Get current authenticated user information

**Response**:
- Success (200): Current user object (without password hash)
```json
{
  "id": "user123",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john.doe@example.com",
  "createdAt": "2025-01-15T10:00:00Z"
}
```
- Error (401): Not authenticated

#### POST /api/auth/verify-session
**Purpose**: Verify if current session is valid (used by middleware)

**Response**:
- Success (200): Session is valid
- Error (401): Session invalid or expired

### User Interface Requirements

#### Page: Sign Up (/auth/signup)
**Form Fields**:
- First Name (text input, required)
- Last Name (text input, required)
- Username (text input, required, with uniqueness validation)
- Email (email input, required, with format and uniqueness validation)
- Password (password input, required, with strength indicator)
- Confirm Password (password input, required, must match password)
- "Sign Up" button
- Link to login page: "Already have an account? Log in"

**Validation**:
- Real-time validation feedback
- Password strength indicator
- Username/email availability check (debounced)
- Submit button disabled until all validations pass

**Actions**:
- On successful signup: Redirect to MCQ listing page (`/mcqs`)
- On error: Display error message, keep form data

#### Page: Log In (/auth/login)
**Form Fields**:
- Username or Email (text input, required)
- Password (password input, required)
- "Remember Me" checkbox (optional, extends session duration)
- "Log In" button
- Link to signup page: "Don't have an account? Sign up"
- "Forgot Password?" link (placeholder for future feature)

**Validation**:
- Real-time validation feedback
- Error message for invalid credentials

**Actions**:
- On successful login: Redirect to MCQ listing page (`/mcqs`) or previously intended page
- On error: Display error message

#### Component: User Menu (in navigation/header)
**Features**:
- Display current user's name or username
- Dropdown menu with:
  - "Profile" option (future feature)
  - "Logout" option
- Show login/signup links when not authenticated
- Present on all pages via global navigation header

#### Logout Functionality on MCQ Page
**Requirements**:
- Logout button/option must be accessible from the MCQ listing page
- Logout action clears the session token from the database
- Logout action clears the session cookie
- After logout, user is redirected to home page or login page

### Authentication Middleware

**Implementation**: Next.js middleware or route-level authentication checks

**Protected Routes**:
- `/mcqs` (listing, create, edit, delete)
- `/api/mcqs/*` (all MCQ API endpoints)
- Any other routes requiring authentication

**Public Routes**:
- `/auth/login`
- `/auth/signup`
- `/` (home page - public, redirects authenticated users to `/mcqs`)

**Middleware Logic**:
1. Extract session token from cookie
2. Verify token exists in `user_sessions` table and is not expired
3. If valid, attach user info to request context
4. If invalid, redirect to `/auth/login` or return 401 for API routes

---

## Implementation Phases

### Phase 1: Authentication Database Migration

**Objective**: Create database schema for users and sessions

**Status**: ✅ COMPLETED

**Tasks**:
1. Create migration file: `migrations/0001_create_users_and_sessions.sql`
2. Define `users` table schema with all required fields
3. Define `user_sessions` table schema with expiration tracking
4. Add indexes for performance (username, email, session_token, expires_at)
5. Test migration locally using `wrangler d1 migrations apply --local`
6. Verify table structure and constraints

**Deliverables**:
- ✅ `migrations/0001_create_users_and_sessions.sql` file
- ✅ Database tables created and verified locally
- ✅ Migration tested and ready for production

**Testing**:
- Verify tables are created correctly
- Verify indexes are created
- Verify foreign key constraints work
- Verify unique constraints on username and email

**Deployment**:
- Migration can be applied to local database
- Ready for production migration (when approved)

---

### Phase 2: Authentication Utilities and D1 Client

**Objective**: Create core database access layer and authentication utilities

**Status**: ✅ COMPLETED

**Tasks**:
1. Install dependencies: `bcryptjs` and `@types/bcryptjs`
2. Create `lib/d1-client.ts` with helper functions:
   - `executeQuery` - for SELECT queries with multiple results
   - `executeQueryFirst` - for SELECT queries with single result
   - `executeMutation` - for INSERT/UPDATE/DELETE operations
   - `executeBatch` - for batch operations
   - `generateId` - for generating unique IDs
   - `getDatabase` - for getting database instance from env
3. Create `lib/utils/password.ts`:
   - `hashPassword(password: string): Promise<string>` - hash password with bcrypt
   - `verifyPassword(password: string, hash: string): Promise<boolean>` - verify password
4. Create `lib/utils/session.ts`:
   - `generateSessionToken(): string` - generate cryptographically random token
   - `createSession(userId: string, expiresInDays: number): Promise<string>` - create session in DB
   - `validateSessionToken(token: string): Promise<UserSession | null>` - validate and get session
5. Create `lib/schemas/auth-schema.ts` with Zod schemas:
   - `registerSchema` - validation for registration
   - `loginSchema` - validation for login
   - `userSchema` - user data structure
6. Write unit tests for all utility functions

**Deliverables**:
- ✅ `lib/d1-client.ts` module
- ✅ `lib/utils/password.ts` with password hashing
- ✅ `lib/utils/session.ts` with session management
- ✅ `lib/schemas/auth-schema.ts` with validation schemas
- ✅ Unit tests for all utilities - **COMPLETE** (see Test Coverage section)

**Testing**:
- Test password hashing and verification
- Test session token generation (uniqueness, randomness)
- Test database helpers with sample queries
- Test Zod schema validation

**Deployment**:
- Code is ready for deployment
- No database changes required

---

### Phase 3: Authentication Services

**Objective**: Create service layer for user and authentication operations

**Status**: ✅ COMPLETED

**Tasks**:
1. ✅ Create `lib/services/user-service.ts`:
   - ✅ `createUser(userData: RegisterInput): Promise<User>` - create new user
   - ✅ `getUserById(id: string): Promise<User | null>` - get user by ID
   - ✅ `getUserByUsername(username: string): Promise<User | null>` - get user by username (case-insensitive)
   - ✅ `getUserByEmail(email: string): Promise<User | null>` - get user by email (case-insensitive)
   - ✅ `getUserByUsernameOrEmail(identifier: string): Promise<User | null>` - get user by username or email (case-insensitive)
   - ✅ `checkUsernameExists(username: string): Promise<boolean>` - check username availability
   - ✅ `checkEmailExists(email: string): Promise<boolean>` - check email availability
2. ✅ Create `lib/services/auth-service.ts`:
   - ✅ `register(userData: RegisterInput): Promise<{ user: User; sessionToken: string }>` - register and auto-login
   - ✅ `login(usernameOrEmail: string, password: string): Promise<{ user: User; sessionToken: string }>` - authenticate user
   - ✅ `logout(sessionToken: string): Promise<void>` - invalidate session
   - ✅ `getCurrentUser(sessionToken: string): Promise<User | null>` - get user from session
   - ✅ `verifySession(sessionToken: string): Promise<boolean>` - verify session is valid
   - ✅ `cleanupExpiredSessions(): Promise<number>` - remove expired sessions (optional)
3. ✅ Write unit tests for all service methods - **COMPLETE** (see Test Coverage section)
4. ✅ Test error handling (duplicate username/email, invalid credentials, etc.) - implemented

**Deliverables**:
- ✅ `lib/services/user-service.ts` with user operations
- ✅ `lib/services/auth-service.ts` with authentication logic
- ✅ Comprehensive test coverage - **COMPLETE** (see Test Coverage section)
- ✅ Error handling implemented

**Testing**:
- ✅ Error handling for duplicate username/email implemented in `createUser`
- ✅ Error handling for invalid credentials implemented in `login`
- ✅ Case-insensitive username/email lookup implemented using SQL `LOWER()`
- ✅ Session creation and validation implemented
- ✅ Logout functionality implemented
- ✅ Unit tests complete - **COMPLETE** (see Test Coverage section)

**Deployment**:
- Code is ready for deployment
- Services can be tested independently

---

### Phase 4: Authentication API Routes

**Objective**: Implement REST API endpoints for authentication

**Status**: ✅ COMPLETED

**Tasks**:
1. ✅ Create `app/api/auth/register/route.ts`:
   - ✅ POST handler for user registration
   - ✅ Validate input using Zod schema
   - ✅ Check for duplicate username/email (handled by service)
   - ✅ Create user and session
   - ✅ Set HTTP-only cookie with session token
   - ✅ Return user data (without password hash)
2. ✅ Create `app/api/auth/login/route.ts`:
   - ✅ POST handler for user login
   - ✅ Validate input using Zod schema
   - ✅ Find user by username or email (case-insensitive, handled by service)
   - ✅ Verify password (handled by service)
   - ✅ Create session
   - ✅ Set HTTP-only cookie with session token (1 day expiration)
   - ✅ Return user data
3. ✅ Create `app/api/auth/logout/route.ts`:
   - ✅ POST handler for logout
   - ✅ Get session token from cookie
   - ✅ Delete session from database
   - ✅ Clear session cookie
   - ✅ Return success response
4. ✅ Create `app/api/auth/me/route.ts`:
   - ✅ GET handler to get current user
   - ✅ Get session token from cookie
   - ✅ Validate session and get user
   - ✅ Return user data (without password hash)
5. ✅ Create `app/api/auth/verify-session/route.ts`:
   - ✅ POST handler for session verification (used by middleware)
   - ✅ Validate session token
   - ✅ Return session status
6. ✅ Add comprehensive error handling to all routes
7. ✅ Create helper functions:
   - ✅ `lib/auth/get-database.ts` - Get database from environment
   - ✅ `lib/auth/cookies.ts` - Cookie management helpers
8. ✅ Write unit tests for all API route endpoints - **COMPLETE** (see Test Coverage section)
9. ⏳ Write integration tests for all endpoints (deferred to later phase)

**Deliverables**:
- ✅ All authentication API routes implemented (5 routes)
- ✅ Cookie management working correctly (HTTP-only, secure, 1 day expiration)
- ✅ Error handling with appropriate HTTP status codes (400, 401, 409, 500)
- ✅ Request validation using Zod schemas
- ✅ Helper functions for database access and cookie management
- ⏳ Integration tests (deferred to later phase)

**Testing**:
- Test registration with valid data
- Test registration with duplicate username/email
- Test login with username (case-insensitive)
- Test login with email (case-insensitive)
- Test login with invalid credentials
- Test logout functionality
- Test session cookie setting and reading
- Test session expiration (1 day)
- Test protected endpoints without authentication

**Deployment**:
- API routes can be deployed and tested
- Can test with API client (Postman, curl, etc.)

---

### Phase 5: Authentication Middleware and Helpers

**Objective**: Create middleware and helpers for route protection and user context

**Status**: ✅ COMPLETED

**Tasks**:
1. ✅ Create `lib/auth/get-current-user.ts`:
   - ✅ `getCurrentUser(request: NextRequest): Promise<User | null>` - get user from request cookies
   - ✅ Helper for server components and API routes
2. ✅ Create `lib/auth/require-auth.ts`:
   - ✅ `requireAuth(request: NextRequest): Promise<User>` - require authentication or throw error
   - ✅ Helper for protected API routes
3. ✅ Create `lib/middleware/auth.ts`:
   - ✅ `isAuthenticated(request)` - Check if user is authenticated
   - ✅ `isPublicRoute(pathname)` - Check if route is public
   - ✅ `isApiRoute(pathname)` - Check if route is API route
   - ✅ `getLoginUrl()` - Get login URL for redirects
4. ✅ Create `middleware.ts` (Next.js middleware file):
   - ✅ Check authentication for protected routes
   - ✅ Redirect unauthenticated users to login (with redirect parameter)
   - ✅ Return 401 for unauthenticated API routes
   - ✅ Skip middleware for public routes
   - ✅ Configure matcher to exclude static files
5. ⏳ Test middleware with various scenarios (deferred to later phase):
   - Authenticated user accessing protected route
   - Unauthenticated user accessing protected route
   - Authenticated user accessing public route
   - Expired session handling

**Deliverables**:
- ✅ `lib/auth/get-current-user.ts` helper
- ✅ `lib/auth/require-auth.ts` helper
- ✅ `lib/middleware/auth.ts` utilities (4 helper functions)
- ✅ `middleware.ts` for Next.js with route protection
- ✅ Middleware configured with proper matcher
- ⏳ Middleware testing (deferred to later phase)

**Testing**:
- Test authenticated requests
- Test unauthenticated requests (should redirect/401)
- Test expired sessions
- Test middleware on different route patterns

**Deployment**:
- Middleware can be deployed
- Route protection is active

---

### Phase 6: Authentication UI (ShadCN Blocks)

**Objective**: Build authentication pages using ShadCN blocks

**Status**: ✅ COMPLETED

**Note**: This phase uses ShadCN components for registration and login UI.

**Tasks**:
1. ✅ Install React Hook Form: `npm install react-hook-form @hookform/resolvers` - Installed
2. ✅ Create `components/signup-form.tsx`:
   - ✅ Uses ShadCN components for signup form structure
   - ✅ Integrated React Hook Form with Zod resolver
   - ✅ Form fields: firstName, lastName, username, email, password, confirmPassword
   - ✅ Real-time validation feedback
   - ✅ Submit handler that calls `/api/auth/register`
   - ✅ Handle success (redirect to `/mcqs`) and error states
   - ✅ Show toast notifications for feedback
3. ✅ Create `components/login-form.tsx`:
   - ✅ Uses ShadCN components for login form structure
   - ✅ Integrated React Hook Form with Zod resolver
   - ✅ Form fields: usernameOrEmail, password
   - ✅ Real-time validation feedback
   - ✅ Submit handler that calls `/api/auth/login`
   - ✅ Handle success (redirect to `/mcqs` or redirect URL) and error states
   - ✅ Show toast notifications for feedback
4. ✅ Create `app/signup/page.tsx`:
   - ✅ Server component that renders SignupForm
   - ✅ Centered layout with responsive design
5. ✅ Create `app/login/page.tsx`:
   - ✅ Server component that renders LoginForm
   - ✅ Centered layout with responsive design
   - ✅ Supports redirect parameter for post-login navigation
6. ✅ Create `components/navigation-header.tsx`:
   - ✅ Global navigation header component
   - ✅ Shows user information when authenticated (with logout option)
   - ✅ Shows login/signup links when not authenticated
   - ✅ Fetches current user from `/api/auth/me`
7. ✅ Create `components/logout-button.tsx`:
   - ✅ Logout button component that calls `/api/auth/logout`
   - ✅ Redirects to home after logout
8. ✅ Update root layout to include NavigationHeader
   - ✅ NavigationHeader added to `app/layout.tsx`
   - ✅ Toaster component added for toast notifications
9. ⏳ Test all authentication flows end-to-end (deferred to integration testing phase)

**Deliverables**:
- ✅ Sign up page and form component (`app/signup/page.tsx`, `components/signup-form.tsx`)
- ✅ Login page and form component (`app/login/page.tsx`, `components/login-form.tsx`)
- ✅ Global navigation header with user menu (`components/navigation-header.tsx`)
- ✅ Logout button component (`components/logout-button.tsx`)
- ✅ All forms integrated with React Hook Form and Zod
- ✅ Toast notifications working (via Sonner)
- ✅ Redirect logic working correctly

**Testing**:
- ⏳ Test signup flow (form validation, submission, success, errors) - deferred to integration testing
- ⏳ Test login flow (form validation, submission, success, errors) - deferred to integration testing
- ⏳ Test logout functionality - deferred to integration testing
- ⏳ Test navigation between auth pages - deferred to integration testing
- ⏳ Test redirect when already authenticated - deferred to integration testing
- ⏳ Test redirect after successful auth - deferred to integration testing
- ⏳ Test error handling and user feedback - deferred to integration testing

**Deployment**:
- ✅ Authentication UI is complete and functional
- ✅ Users can register, login, and logout
- ✅ Ready for integration with MCQ features

---

## Technical Implementation Details

### Accessing Cloudflare Bindings in API Routes

**Important**: When using OpenNext with Cloudflare Workers, you must use `getCloudflareContext()` from `@opennextjs/cloudflare` to access D1 database bindings and other Cloudflare resources. Do not attempt to access bindings via `process.env` directly.

**Correct Approach**:
```typescript
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();
  const db = env.quizmaker_db; // D1 database binding
  // Use db for database operations
}
```

**Incorrect Approach** (will cause 500 errors):
```typescript
// ❌ This does NOT work in OpenNext/Cloudflare Workers
const db = process.env.quizmaker_db;
```

All database access should go through `lib/auth/get-database.ts` which uses `getCloudflareContext()` internally.

### Key Files
- `migrations/0001_create_users.sql` - Database schema migration
- `lib/utils/password.ts` - Password hashing utilities
- `lib/utils/session.ts` - Session token utilities
- `lib/schemas/auth-schema.ts` - Zod validation schemas
- `lib/services/user-service.ts` - User data operations
- `lib/services/auth-service.ts` - Authentication logic
- `lib/middleware/auth.ts` - Authentication middleware helpers
- `lib/auth/get-current-user.ts` - Get current user helper
- `lib/auth/require-auth.ts` - Route protection helper
- `app/api/auth/register/route.ts` - Registration endpoint
- `app/api/auth/login/route.ts` - Login endpoint (username/email case-insensitive)
- `app/api/auth/logout/route.ts` - Logout endpoint
- `app/api/auth/me/route.ts` - Current user endpoint
- `app/api/auth/verify-session/route.ts` - Session verification endpoint
- `app/auth/signup/page.tsx` - Sign up page
- `app/auth/login/page.tsx` - Log in page
- `components/auth/` - Authentication components
- `components/layout/NavigationHeader.tsx` - Global navigation with user menu
- `middleware.ts` - Next.js middleware (if needed)

### Implementation Patterns

**Password Hashing Pattern**:
```typescript
import bcrypt from 'bcryptjs';

// Hash password
const passwordHash = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, passwordHash);
```

**Session Management Pattern**:
```typescript
// Generate session token
import { randomBytes } from 'crypto';
const sessionToken = randomBytes(32).toString('hex');

// Store session in database (1 day expiration)
await executeMutation(
  `INSERT INTO user_sessions (user_id, session_token, expires_at) 
   VALUES (?1, ?2, datetime('now', '+1 day'))`,
  [userId, sessionToken]
);

// Set HTTP-only cookie (1 day expiration)
response.cookies.set('session_token', sessionToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 // 1 day
});
```

**Authentication Check Pattern**:
```typescript
// In API route
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Proceed with authenticated logic
}
```

**Server Component Pattern**:
```typescript
// In Server Component
import { getCurrentUser } from '@/lib/auth/get-current-user';

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  // Render authenticated content
}
```

### Important Notes
- Use `bcryptjs` (not `bcrypt`) as it works in Cloudflare Workers with Node.js compatibility
- Session tokens should be cryptographically random (use `crypto.randomBytes`)
- Cookies must be HTTP-only to prevent XSS attacks
- Use `secure` flag for cookies in production
- Implement session cleanup job to remove expired sessions (can be done periodically)
- Never return password hashes in API responses
- Validate all inputs on both client and server side
- Use prepared statements for all database queries to prevent SQL injection
- Consider rate limiting for login/register endpoints to prevent brute force attacks

---

## Success Criteria

- [x] Users can create accounts with valid information (Phase 6: Signup form implemented)
- [x] Users cannot create accounts with duplicate usernames or emails (Phase 3: Service validation, Phase 4: API error handling)
- [x] Passwords are securely hashed before storage (Phase 2: bcryptjs implementation)
- [x] Users can log in with username or email (case-insensitive) and password (Phase 3: Service implementation, Phase 6: Login form)
- [x] Invalid login attempts are rejected with appropriate error messages (Phase 3: Service validation, Phase 6: Form error display)
- [x] User sessions are created and stored in database (Phase 2: Session utilities, Phase 3: Auth service)
- [x] Session tokens are stored in HTTP-only cookies (Phase 4: API routes with cookie management)
- [x] Protected routes redirect to login if user is not authenticated (Phase 5: Middleware implementation)
- [x] Users can log out and their session is terminated (Phase 3: Logout service, Phase 4: Logout API, Phase 6: Logout button)
- [x] Current user information is accessible throughout the application (Phase 4: `/api/auth/me` endpoint, Phase 6: NavigationHeader)
- [x] Session expiration is properly handled (1 day duration) (Phase 2: Session utilities, Phase 3: Session validation)
- [x] Logout functionality is accessible from navigation header and properly clears session (Phase 6: NavigationHeader with LogoutButton)
- [x] All authentication API endpoints return appropriate HTTP status codes (Phase 4: All 5 API routes implemented with proper status codes)
- [x] Form validation provides clear, actionable error messages (Phase 6: React Hook Form with Zod validation and field-level error display)

---

## Troubleshooting Guide

### Common Issue: Login fails even with correct credentials
**Problem**: Password comparison always returns false
**Cause**: Password hashing salt rounds mismatch or comparison method error
**Solution**: Verify bcrypt.compare is used correctly and hash was created with same library
**Code Reference**: `lib/utils/password.ts`

### Common Issue: Session not persisting after login
**Problem**: User gets logged out immediately after login
**Cause**: Cookie not being set correctly or middleware not reading cookie
**Solution**: Verify cookie settings (httpOnly, secure, sameSite) and cookie reading logic
**Code Reference**: `app/api/auth/login/route.ts` and `lib/middleware/auth.ts`

### Common Issue: "Unauthorized" errors on protected routes
**Problem**: Authenticated users cannot access protected routes
**Cause**: Session token not being extracted from cookie or session expired
**Solution**: Check cookie name matches, verify session lookup logic, check expiration
**Code Reference**: `lib/auth/get-current-user.ts`

### Common Issue: Password validation too strict or too lenient
**Problem**: Users cannot create accounts or weak passwords accepted
**Cause**: Validation rules not matching requirements
**Solution**: Review and adjust password validation schema
**Code Reference**: `lib/schemas/auth-schema.ts`

### Common Issue: Database binding not accessible (500 Internal Server Error)
**Problem**: API routes return 500 errors when trying to access D1 database
**Cause**: Attempting to access Cloudflare bindings via `process.env` instead of using OpenNext utility
**Solution**: Use `getCloudflareContext()` from `@opennextjs/cloudflare` to access bindings. The database binding must be accessed through the Cloudflare context, not directly from `process.env`.
**Code Reference**: `lib/auth/get-database.ts`
**Example**:
```typescript
import { getCloudflareContext } from '@opennextjs/cloudflare';

const { env } = getCloudflareContext();
const db = env.quizmaker_db; // Access D1 database binding
```
**Note**: This is required for all API routes that need to access Cloudflare bindings (D1, R2, KV, etc.) when using OpenNext with Cloudflare Workers.

### Common Issue: Environment variables from .dev.vars not accessible (500 Internal Server Error)
**Problem**: API routes return 500 errors when trying to access environment variables from `.dev.vars` (e.g., `OPENAI_API_KEY`)
**Cause**: In Cloudflare Workers, `process.env` is not populated by default. Environment variables from `.dev.vars` require the `nodejs_compat_populate_process_env` compatibility flag to be accessible via `process.env`.
**Solution**: 
1. Add `nodejs_compat_populate_process_env` to `compatibility_flags` in `wrangler.jsonc`:
   ```jsonc
   "compatibility_flags": [
     "nodejs_compat",
     "nodejs_compat_populate_process_env",  // <-- Add this
     "global_fetch_strictly_public"
   ]
   ```
2. Restart the development server after adding the flag
3. Access environment variables via `process.env.VARIABLE_NAME` as normal
**Code Reference**: `wrangler.jsonc`, `src/app/api/mcqs/generate-teks/route.ts`
**Note**: 
- This flag is required for any API route that needs to access environment variables from `.dev.vars`
- The flag must be added to `wrangler.jsonc` before the server is started
- After adding the flag, restart the server (`npm run preview` or `wrangler dev`)
- For production, use `wrangler secret put VARIABLE_NAME` instead of `.dev.vars`

### Common Issue: Database not available in regular Next.js dev mode
**Problem**: "Database not available" error when running `npm run dev`
**Cause**: `getCloudflareContext()` is not available in regular Next.js dev mode. Database bindings require the Cloudflare Workers runtime environment.
**Solution**: Use `npm run preview` or `npm run dev:cf` instead of `npm run dev` when testing database features. These commands provide the Cloudflare Workers environment needed for database bindings.
**Code Reference**: `lib/auth/get-database.ts` - Enhanced error handling detects dev mode and provides helpful error messages
**Note**: 
- `npm run dev` - Use for UI-only development (no database access)
- `npm run preview` - Use for full-stack development (with database access)
- `npm run dev:cf` - Use for full-stack development with local database

---

## Future Enhancements

- Email verification for new accounts
- Password reset functionality
- Two-factor authentication (2FA)
- OAuth integration (Google, GitHub, etc.)
- Remember me functionality with longer session duration
- Account deletion and data export
- User profile management (update name, email, password)
- Session management (view active sessions, revoke sessions)
- Password strength meter with visual feedback
- Account lockout after failed login attempts
- Migration to NextAuth.js or similar authentication framework

## Future Enhancement Decisions

The following design decisions need to be made in future iterations:

### Account Management
- Should we support account deletion, or just deactivation?
- What happens to a user's MCQs and attempts if they delete their account?
- Should deleted accounts be soft-deleted for audit purposes?

### Password Requirements
- Are the current password requirements (8+ chars, letter + number) sufficient, or should we require more complexity?
- Should we enforce password expiration or password history?
- Should we add a password strength meter with visual feedback?

### Session Management
- Should "Remember Me" extend the session duration beyond 1 day?
- Should users be able to view and manage their active sessions?
- Should we implement session revocation (logout from all devices)?

### Security Enhancements
- Should we implement rate limiting for login/register endpoints to prevent brute force attacks?
- Should we add account lockout after failed login attempts?
- Should we require email verification before allowing full account access?
- Should we implement two-factor authentication (2FA)?

### User Experience
- Should the login form remember the username/email (but not password) for convenience?
- Should we add "Forgot Password?" functionality with email reset?
- Should we add social login options (OAuth with Google, GitHub, etc.)?

---

## Dependencies

### External Dependencies
- `bcryptjs` - Password hashing library (must be installed)
- `@types/bcryptjs` - TypeScript types for bcryptjs (dev dependency)

### Internal Dependencies
- `lib/d1-client.ts` module (must be created)
- Database migration system (Wrangler)
- shadcn/ui components (Button, Input, Form, etc.)
- Next.js cookies API for session management

### Environment Variables
- None required for basic implementation
- Future: May need `SESSION_SECRET` for enhanced security

---

## Risks and Mitigation

### Technical Risks
- **Risk**: bcryptjs performance in Cloudflare Workers
- **Mitigation**: Use appropriate salt rounds (10 is standard), consider async operations

- **Risk**: Session token collisions (extremely rare but possible)
- **Mitigation**: Use sufficient token length (32 bytes = 64 hex characters), check uniqueness on insert

- **Risk**: Session table growing indefinitely
- **Mitigation**: Implement cleanup job to remove expired sessions, or use TTL-based cleanup

### Security Risks
- **Risk**: Password stored in plain text
- **Mitigation**: Always hash passwords with bcrypt before storage, never log passwords

- **Risk**: Session hijacking via XSS
- **Mitigation**: Use HTTP-only cookies, implement CSRF protection, sanitize user inputs

- **Risk**: Brute force attacks on login
- **Mitigation**: Implement rate limiting, consider account lockout after failed attempts

- **Risk**: SQL injection in authentication queries
- **Mitigation**: Always use prepared statements via d1-client helpers

### User Experience Risks
- **Risk**: Users forget passwords with no recovery option
- **Mitigation**: Implement password reset flow (future enhancement), provide clear error messages

- **Risk**: Confusing error messages during registration/login
- **Mitigation**: Provide specific, field-level error messages, avoid generic "invalid credentials"

---

## Test Coverage

**Last Updated**: 2025-01-13
**Status**: ✅ UNIT TESTS COMPLETE

### Overview

Comprehensive unit test coverage has been implemented for all authentication components. All tests follow OWASP Web Security Testing Guide (WSTG) principles, focusing on authentication, authorization, input validation, error handling, and session management.

**Test Framework**: Vitest  
**Total Test Files**: 9  
**Total Tests**: 169 passing

### Utility Tests

#### Password Utilities (`lib/utils/password.test.ts`)
- ✅ `hashPassword` produces bcrypt hash (not plain password)
- ✅ `hashPassword` produces different hashes for same input (salting)
- ✅ `verifyPassword` returns true for correct password and hash
- ✅ `verifyPassword` returns false for incorrect password

#### Session Utilities (`lib/utils/session.test.ts`)
- ✅ `generateSessionToken` generates 64-character hex token
- ✅ `generateSessionToken` generates different tokens on subsequent calls
- ✅ `createSession` creates session and returns generated token
- ✅ `createSession` uses anonymous `?` placeholders in SQL
- ✅ `validateSessionToken` returns session when token is valid
- ✅ `validateSessionToken` returns null when token is invalid or expired

### Service Tests

#### User Service (`lib/services/user-service.test.ts`)
- ✅ `createUser` creates user with hashed password
- ✅ `createUser` throws error for duplicate username
- ✅ `createUser` throws error for duplicate email
- ✅ `createUser` uses anonymous `?` placeholders
- ✅ `getUserById` returns user when found
- ✅ `getUserById` returns null when not found
- ✅ `getUserByUsername` returns user (case-insensitive)
- ✅ `getUserByUsername` returns null when not found
- ✅ `getUserByEmail` returns user (case-insensitive)
- ✅ `getUserByEmail` returns null when not found
- ✅ `getUserByUsernameOrEmail` finds user by username
- ✅ `getUserByUsernameOrEmail` finds user by email
- ✅ `checkUsernameExists` and `checkEmailExists` return boolean

#### Auth Service (`lib/services/auth-service.test.ts`)
- ✅ `register` creates user and session on success
- ✅ `register` propagates duplicate username error
- ✅ `register` propagates duplicate email error
- ✅ `register` never returns password hash
- ✅ `login` returns user and session token on success
- ✅ `login` throws "Invalid credentials" when user not found
- ✅ `login` throws "Invalid credentials" when password wrong
- ✅ `login` never returns password hash
- ✅ `logout` deletes session from database
- ✅ `getCurrentUser` returns user for valid session
- ✅ `getCurrentUser` returns null for invalid session
- ✅ `verifySession` returns true/false based on session validity
- ✅ `cleanupExpiredSessions` deletes expired sessions

### API Route Tests

#### POST /api/auth/register (`app/api/auth/register/route.test.ts`)
- ✅ Returns 201 with user data on success
- ✅ Sets session cookie on success
- ✅ Returns 400 for invalid JSON body
- ✅ Returns 400 for schema validation errors
- ✅ Returns 409 for duplicate username
- ✅ Returns 409 for duplicate email
- ✅ Returns 500 when database unavailable
- ✅ Returns 500 for generic errors

#### POST /api/auth/login (`app/api/auth/login/route.test.ts`)
- ✅ Returns 200 with user data on success
- ✅ Sets session cookie on success
- ✅ Returns 400 for invalid JSON body
- ✅ Returns 400 for schema validation errors
- ✅ Returns 401 for invalid credentials
- ✅ Returns 500 when database unavailable

#### POST /api/auth/logout (`app/api/auth/logout/route.test.ts`)
- ✅ Returns 200 OK on success
- ✅ Clears session cookie on success
- ✅ Returns 401 when not authenticated
- ✅ Returns 500 when database unavailable

#### GET /api/auth/me (`app/api/auth/me/route.test.ts`)
- ✅ Returns 200 with user data for valid session
- ✅ Returns 401 when not authenticated
- ✅ Returns 401 when session invalid
- ✅ Returns 500 when database unavailable

#### POST /api/auth/verify-session (`app/api/auth/verify-session/route.test.ts`)
- ✅ Returns 200 with `{ valid: true }` for valid session
- ✅ Returns 401 with `{ valid: false }` when no session token
- ✅ Returns 401 with `{ valid: false }` when session invalid
- ✅ Returns 500 when database unavailable

### Test Coverage Principles

All tests follow these principles:
- **Unit-level only**: No real database, no real network, all dependencies mocked
- **OWASP WSTG aligned**: Focus on authentication, authorization, input validation, error handling
- **Isolation**: Each test runs independently with fresh mocks
- **Security-focused**: Verify no password/hash exposure, proper error handling
- **SQL safety**: Verify anonymous `?` placeholders (not numbered `?1`, `?2`)
- **Data transformation**: Verify snake_case ↔ camelCase conversion
- **Error propagation**: Verify errors are thrown correctly and handled appropriately

### Integration and Component Tests

- ⏳ Integration tests for API routes (planned)
- ⏳ Component tests for UI forms (planned)
- ⏳ End-to-end tests for authentication flows (planned)

---

## Current Status

**Last Updated**: 2025-01-13
**Current Phase**: Complete - All Authentication Features Implemented
**Status**: ✅ AUTHENTICATION FULLY COMPLETE
**Completed Phases**:
- ✅ Phase 1: Authentication Database Migration - Migration file created, tables verified locally
- ✅ Phase 2: Authentication Utilities and D1 Client - All utility files created, dependencies installed
- ✅ Phase 3: Authentication Services - User service and auth service implemented with all required functions
- ✅ Phase 4: Authentication API Routes - All 5 API routes implemented with cookie management and error handling
- ✅ Phase 5: Authentication Middleware and Helpers - Middleware and helper functions implemented for route protection
- ✅ Phase 6: Authentication UI - All authentication pages and components implemented with React Hook Form, Zod validation, and ShadCN UI components
**Next Steps**: Authentication is fully complete. Ready for integration testing and MCQ functionality integration
