# QuizMaker Application Test Plan

**Version**: 1.0 (Draft)  
**Last Updated**: 2025-01-13  
**Status**: Draft for Review

---

## Document Purpose

This test plan provides a comprehensive overview of the testing strategy, methodologies, tools, and implementation roadmap for the QuizMaker application. It serves as a reference for developers, QA engineers, and stakeholders to understand how quality is ensured across all layers of the application.

This document is influenced by:
- [Test Plan Guidelines](./TESTPLAN_GUIDELINES.md) - Universal testing principles
- [OWASP Web Security Testing Guide (WSTG) v4.2](https://owasp.org/www-project-web-security-testing-guide/v42/) - Security testing standards

This test plan covers testing for:
- **Basic Authentication** (see [Basic Authentication PRD](./BASIC_AUTHENTICATION.md))
- **MCQ CRUD Operations** (see [MCQ CRUD PRD](./MCQ_CRUD.md))

---

## Executive Summary

### Testing Approach

QuizMaker follows a **test pyramid strategy** with emphasis on:
- **Unit Tests** (Foundation) - Fast, isolated, comprehensive coverage
- **Integration Tests** (Middle Layer) - API contract validation, component interactions
- **UI Tests** (Top Layer) - Critical user journeys, end-to-end workflows

### Current Status

- ✅ **Unit Tests**: Complete for authentication, MCQ services, and TEKS AI generation (319 tests passing)
  - Authentication: 169 tests
  - MCQ CRUD: 76 tests
  - TEKS AI Generation: 74 tests
- ⏳ **Integration Tests**: Planned (Postman collections)
- ⏳ **UI Tests**: Planned (Selenium WebDriver)
- ✅ **Security Tests**: OWASP WSTG aligned tests integrated into unit test suites

### Testing Philosophy

- **Quality is a team responsibility** - All developers write and maintain tests
- **Tests document system behavior** - Well-written tests serve as executable documentation
- **Automation supports judgment** - Tests catch regressions and validate behavior
- **OWASP compliance** - Security testing aligned with [OWASP Web Security Testing Guide (WSTG) v4.2](https://owasp.org/www-project-web-security-testing-guide/v42/)

---

## Testing Methodologies

### Test Pyramid Strategy

```
        ┌─────────────┐
        │   UI Tests  │  Fewest tests, slowest execution
        │  (Selenium) │  Critical user journeys only
        ├─────────────┤
        │Integration  │  Moderate number, moderate speed
        │ Tests       │  API contracts, component interactions
        │ (Postman)   │
        ├─────────────┤
        │ Unit Tests  │  Most tests, fastest execution
        │  (Vitest)   │  Service layer, utilities, API routes
        └─────────────┘
```

### Test Types

#### 1. Unit Tests
- **Purpose**: Validate individual functions, methods, and components in isolation
- **Scope**: Services, utilities, API route handlers
- **Framework**: Vitest
- **Status**: ✅ Complete for authentication and MCQ services

#### 2. Integration Tests
- **Purpose**: Validate API contracts, database interactions, and component integration
- **Scope**: API endpoints, service-to-database interactions
- **Tool**: Postman (with Newman CLI for CI/CD)
- **Status**: ⏳ Planned

#### 3. UI Tests
- **Purpose**: Validate end-to-end user workflows and critical user journeys
- **Scope**: Complete user flows (registration → login → create MCQ → attempt MCQ)
- **Tool**: Selenium WebDriver (Java + TestNG)
- **Status**: ⏳ Planned

#### 4. Security Tests
- **Purpose**: Validate security controls, authentication, authorization, input validation
- **Scope**: OWASP WSTG aligned tests across all layers
- **Framework**: Integrated into unit, integration, and UI test suites
- **Status**: ⏳ Planned (highlighted in test cases)

---

## Tools and Frameworks

### Unit Testing

**Framework**: Vitest  
**Language**: TypeScript  
**Location**: Test files colocated with source code (e.g., `src/lib/services/auth-service.test.ts`)

**Key Features**:
- Fast execution (runs in Node.js)
- Mocking support (`vi.mock`)
- React Testing Library integration
- TypeScript support

**Configuration**: `vitest.config.ts`

### Integration Testing

**Tool**: Postman  
**CLI**: Newman (for CI/CD execution)  
**Language**: JavaScript (Postman test scripts)

**Key Features**:
- Collection-based organization
- Environment variables for different contexts (dev/stage/prod)
- Schema validation
- Data-driven testing support
- CI/CD integration via Newman

**Configuration**: 
- Postman Collections: `tests/postman/collections/`
- Environments: `tests/postman/environments/`
- CI Script: Newman CLI commands

**Reference**: See [Postman Testing Guidelines](../.cursor/rules/APITesting-Postman.mdc)

### UI Testing

**Framework**: Selenium WebDriver  
**Language**: Java  
**Test Framework**: TestNG  
**CI/CD Platform**: Jenkins  
**Reporting**: Allure  
**Accessibility**: axe-core

**Key Features**:
- Page Object Model (POM) pattern
- Cross-browser testing support
- Headless execution for CI
- Screenshot capture on failures
- Accessibility testing integration
- Jenkins pipeline integration for automated execution

**Project Structure**:
```
src/test/java
 ├─ base          # Base test classes, driver factory
 ├─ pages         # Page Object Model classes
 ├─ tests         # Test classes
 └─ utils         # Test utilities, helpers
```

**Jenkins Integration**:
- Jenkins pipeline executes Selenium tests post-deployment
- Test results published to Jenkins dashboard
- Allure reports generated and archived
- Test failures trigger alerts

**Reference**: See [Selenium Testing Guidelines](../.cursor/rules/SeleniumTesting.mdc)

---

## CI/CD Integration

### Test Execution Pipeline

**Platform**: Jenkins for sandbox deployment and automation execution

```
┌─────────────────────────────────────────────────────────┐
│ 1. Pre-Build: Unit Tests (Vitest)                       │
│    - Run: npm run test:run                              │
│    - Fail build if tests fail                           │
│    - Coverage threshold: >80%                           │
│    - Executed in: Jenkins pipeline or pre-commit hook   │
├─────────────────────────────────────────────────────────┤
│ 2. Build: Next.js Build                                 │
│    - Run: npm run build                                 │
│    - Includes type checking                             │
│    - Executed in: Jenkins pipeline                      │
├─────────────────────────────────────────────────────────┤
│ 3. Pre-Deploy: Integration Tests (Newman)              │
│    - Run: newman run collections/auth.json              │
│    - Run: newman run collections/mcq.json               │
│    - Fail deploy if tests fail                          │
│    - Executed in: Jenkins pipeline                       │
├─────────────────────────────────────────────────────────┤
│ 4. Deploy: Cloudflare Workers                           │
│    - Run: npm run deploy                                │
│    - Executed in: Jenkins pipeline                      │
├─────────────────────────────────────────────────────────┤
│ 5. Post-Deploy: UI Tests (Selenium via Jenkins)        │
│    - Jenkins pipeline triggers Selenium test job       │
│    - Run smoke tests only (@Smoke tag)                 │
│    - Generate Allure reports                            │
│    - Archive reports in Jenkins                         │
│    - Publish test results to Jenkins dashboard         │
│    - Alert on failures (non-blocking)                   │
│    - Executed in: Jenkins pipeline (separate job)      │
└─────────────────────────────────────────────────────────┘
```

### Jenkins Configuration

**Jenkins Pipeline Structure**:
- **Main Pipeline**: Handles build, unit tests, integration tests, and deployment
- **UI Test Job**: Separate Jenkins job triggered post-deployment for Selenium tests
- **Test Result Archiving**: Allure reports and test results archived in Jenkins
- **Notifications**: Email/Slack notifications on test failures

**Jenkinsfile Location**: `Jenkinsfile` (root of repository)

**Key Jenkins Plugins Required**:
- Allure Jenkins Plugin (for test reporting)
- TestNG Plugin (for test result parsing)
- Git Plugin (for source control)
- NodeJS Plugin (for npm commands)
- Cloudflare Workers Plugin (for deployment, if available)

### npm Scripts

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:ui": "vitest --ui",
  "test:integration": "newman run tests/postman/collections/quizmaker.json",
  "prebuild": "npm run test:run",
  "predeploy": "npm run build && npm run opennext-build"
}
```

**Note**: UI tests are executed via Jenkins pipeline, not npm scripts. Jenkins handles Selenium test execution, reporting, and result archiving.

### Test Execution Triggers

- **Unit Tests**: Run on every commit (pre-build hook)
- **Integration Tests**: Run before deployment (pre-deploy)
- **UI Tests**: Run after deployment (post-deploy, smoke tests)
- **Full Test Suite**: Run nightly or on release branches

---

## Current Test Coverage

### Unit Tests Status

#### Authentication Module ✅ COMPLETE

**Test Files**: 9 files  
**Total Tests**: 169 passing

**Coverage**:
- ✅ Password utilities (`lib/utils/password.test.ts`) - 4 tests
- ✅ Session utilities (`lib/utils/session.test.ts`) - 6 tests
- ✅ User service (`lib/services/user-service.test.ts`) - 15 tests
- ✅ Auth service (`lib/services/auth-service.test.ts`) - 13 tests
- ✅ API Routes:
  - ✅ `POST /api/auth/register` - 8 tests
  - ✅ `POST /api/auth/login` - 5 tests
  - ✅ `POST /api/auth/logout` - 3 tests
  - ✅ `GET /api/auth/me` - 4 tests
  - ✅ `POST /api/auth/verify-session` - 4 tests

**Test Principles**:
- All dependencies mocked (no real database/network)
- OWASP WSTG aligned (authentication, authorization, input validation)
- Security-focused (no password/hash exposure)
- SQL safety verified (anonymous `?` placeholders)

#### MCQ Module ✅ COMPLETE

**Test Files**: 2 files  
**Total Tests**: 76 passing

**Coverage**:
- ✅ MCQ service (`lib/services/mcq-service.test.ts`) - 55 tests
  - ✅ `createMcq` - 10 test scenarios
  - ✅ `getMcqById` - 7 test scenarios
  - ✅ `getMcqs` - 15 test scenarios (pagination, search, sorting)
  - ✅ `updateMcq` - 10 test scenarios
  - ✅ `deleteMcq` - 5 test scenarios
  - ✅ `verifyMcqOwnership` - 4 test scenarios
- ✅ MCQ attempt service (`lib/services/mcq-attempt-service.test.ts`) - 21 tests
  - ✅ `recordAttempt` - 9 test scenarios
  - ✅ `getAttemptsByMcq` - 6 test scenarios
  - ✅ `getAttemptsByUser` - 3 test scenarios

**Test Principles**:
- All dependencies mocked (no real database)
- Data transformation verified (snake_case ↔ camelCase)
- Transaction integrity tested
- Ownership verification tested
- SQL safety verified

#### TEKS AI Generation Module ✅ COMPLETE

**Test Files**: 3 files  
**Total Tests**: 74 passing

**Coverage**:
- ✅ TEKS schemas (`lib/schemas/teks-mcq-schema.test.ts`) - 32 tests
  - ✅ `teksSelectionSchema` validation - 12 test scenarios
  - ✅ `teksMcqGenerationSchema` validation - 18 test scenarios
  - ✅ OWASP security tests - 3 tests (INPVAL-009, INPVAL-010, BUSLOGIC-001)
- ✅ TEKS service (`lib/services/TEKS.test.ts`) - 16 tests
  - ✅ TEKS data structure validation
  - ✅ Schema validation for all nested structures
  - ✅ Data integrity checks
- ✅ TEKS API route (`app/api/mcqs/generate-teks/route.test.ts`) - 26 tests
  - ✅ Happy path scenarios - 3 tests
  - ✅ Error handling - 9 tests
  - ✅ OWASP security tests - 12 tests
  - ✅ Prompt construction - 2 tests

**OWASP Security Test Coverage**:
- 🔒 **INPVAL-001**: XSS prevention in input fields
- 🔒 **INPVAL-005**: SQL injection prevention
- 🔒 **INPVAL-009**: Input length limits enforcement
- 🔒 **INPVAL-010**: Special character handling
- 🔒 **API-001**: API authentication required
- 🔒 **API-002**: API authorization checks
- 🔒 **API-003**: API input validation (Zod schemas)
- 🔒 **API-005**: Error response information leakage prevention
- 🔒 **ERR-001**: Generic error messages without internals
- 🔒 **ERR-004**: Appropriate HTTP status codes
- 🔒 **BUSLOGIC-001**: Business logic validation (exactly 4 choices, one correct)
- 🔒 **BUSLOGIC-005**: Rate limiting error handling

**Test Principles**:
- All dependencies mocked (no real OpenAI API calls)
- OWASP WSTG aligned security testing
- Input validation and sanitization verified
- Error handling and status codes tested
- Business logic constraints enforced

### Integration Tests Status

⏳ **PLANNED** - Not yet implemented

**Planned Coverage**:
- All API endpoints (authentication + MCQ)
- Database integration
- Error handling and status codes
- Schema validation
- Authentication flows

### UI Tests Status

⏳ **PLANNED** - Not yet implemented

**Planned Coverage**:
- Critical user journeys
- End-to-end workflows
- Form validation
- Navigation flows
- Accessibility compliance

---

## Test Scenarios by Feature

### Authentication Feature Tests

#### Unit Tests ✅ COMPLETE

See [Basic Authentication PRD - Test Coverage](./BASIC_AUTHENTICATION.md#test-coverage) for detailed test scenarios.

**Key Test Areas**:
- Password hashing and verification
- Session token generation and validation
- User registration and login flows
- API route authentication and authorization
- Input validation (Zod schemas)
- Error handling and status codes

#### Integration Tests ⏳ PLANNED

**Postman Collection**: `tests/postman/collections/auth.json`

**Test Scenarios**:

1. **User Registration Flow**
   - ✅ Register with valid data → 201 Created
   - ✅ Register with duplicate username → 409 Conflict
   - ✅ Register with duplicate email → 409 Conflict
   - ✅ Register with invalid data → 400 Bad Request
   - ✅ Register with missing fields → 400 Bad Request
   - 🔒 **OWASP**: Test password requirements enforcement
   - 🔒 **OWASP**: Test input sanitization (XSS prevention)

2. **User Login Flow**
   - ✅ Login with username → 200 OK
   - ✅ Login with email → 200 OK
   - ✅ Login with invalid credentials → 401 Unauthorized
   - ✅ Login with missing fields → 400 Bad Request
   - 🔒 **OWASP**: Test brute force protection (rate limiting)
   - 🔒 **OWASP**: Test session token security (HTTP-only cookies)

3. **Session Management**
   - ✅ Get current user → 200 OK
   - ✅ Get current user (no session) → 401 Unauthorized
   - ✅ Verify session (valid) → 200 OK
   - ✅ Verify session (invalid) → 401 Unauthorized
   - ✅ Logout → 200 OK
   - 🔒 **OWASP**: Test session expiration
   - 🔒 **OWASP**: Test session hijacking prevention

**Environment Variables**:
- `baseUrl`: API base URL (dev/stage/prod)
- `testUsername`: Test user username
- `testPassword`: Test user password
- `sessionToken`: Session token (set after login)

#### UI Tests ⏳ PLANNED

**Selenium Test Class**: `tests.ui.auth.AuthFlowTests`

**Test Scenarios**:

1. **Registration Flow** (`@Smoke @Regression`)
   - Navigate to signup page
   - Fill registration form with valid data
   - Submit form
   - Verify redirect to MCQ listing page
   - Verify user menu shows username
   - 🔒 **OWASP**: Verify password field is masked

2. **Login Flow** (`@Smoke @Regression`)
   - Navigate to login page
   - Fill login form with valid credentials
   - Submit form
   - Verify redirect to MCQ listing page
   - Verify session persists on page refresh
   - 🔒 **OWASP**: Verify "Remember Me" functionality (if implemented)

3. **Logout Flow** (`@Smoke`)
   - Click logout button in navigation header
   - Verify redirect to home page
   - Verify session cleared (cannot access protected routes)

4. **Protected Route Access** (`@Security`)
   - Attempt to access `/mcqs` without authentication
   - Verify redirect to login page
   - Login and verify access granted
   - 🔒 **OWASP**: Test direct URL access to protected routes

**Page Objects**:
- `LoginPage` - Login form elements and actions
- `SignupPage` - Registration form elements and actions
- `NavigationHeader` - User menu and logout actions

### MCQ Feature Tests

#### Unit Tests ✅ COMPLETE

See [MCQ CRUD PRD - Phase 6](./MCQ_CRUD.md#phase-6-testing-and-refinement) for detailed test scenarios.

**Key Test Areas**:
- MCQ CRUD operations
- Choice management and validation
- Attempt recording and retrieval
- Ownership verification
- Pagination, search, and sorting
- Transaction handling

#### Integration Tests ⏳ PLANNED

**Postman Collection**: `tests/postman/collections/mcq.json`

**Test Scenarios**:

1. **MCQ Creation** (`@Smoke @Regression`)
   - ✅ Create MCQ with valid data → 201 Created
   - ✅ Create MCQ with invalid data → 400 Bad Request
   - ✅ Create MCQ without authentication → 401 Unauthorized
   - ✅ Create MCQ with no correct choice → 400 Bad Request
   - ✅ Create MCQ with too few choices → 400 Bad Request
   - 🔒 **OWASP**: Test input length limits (title, description, question text)
   - 🔒 **OWASP**: Test SQL injection prevention

2. **MCQ Retrieval** (`@Smoke`)
   - ✅ Get MCQ by ID → 200 OK
   - ✅ Get MCQ (not found) → 404 Not Found
   - ✅ List MCQs with pagination → 200 OK
   - ✅ List MCQs with search → 200 OK
   - ✅ List MCQs with sorting → 200 OK

3. **MCQ Update** (`@Regression`)
   - ✅ Update MCQ (owner) → 200 OK
   - ✅ Update MCQ (non-owner) → 403 Forbidden
   - ✅ Update MCQ (not found) → 404 Not Found
   - ✅ Update MCQ without authentication → 401 Unauthorized
   - 🔒 **OWASP**: Test authorization checks

4. **MCQ Deletion** (`@Regression`)
   - ✅ Delete MCQ (owner) → 200 OK
   - ✅ Delete MCQ (non-owner) → 403 Forbidden
   - ✅ Delete MCQ (not found) → 404 Not Found
   - ✅ Verify CASCADE delete (choices and attempts deleted)

5. **MCQ Attempt** (`@Smoke @Regression`)
   - ✅ Record attempt with correct answer → 201 Created
   - ✅ Record attempt with incorrect answer → 201 Created
   - ✅ Record attempt (invalid choice) → 400 Bad Request
   - ✅ Record attempt (not authenticated) → 401 Unauthorized
   - ✅ Get attempt history → 200 OK

**Environment Variables**:
- `baseUrl`: API base URL
- `sessionToken`: Authentication token
- `testMcqId`: Test MCQ ID (set after creation)
- `testChoiceId`: Test choice ID (set after MCQ creation)

#### UI Tests ⏳ PLANNED

**Selenium Test Class**: `tests.ui.mcq.McqFlowTests`

**Test Scenarios**:

1. **MCQ Creation Flow** (`@Smoke @Regression`)
   - Navigate to MCQ listing page
   - Click "Create MCQ" button
   - Fill MCQ form (title, description, question, choices)
   - Mark one choice as correct
   - Submit form
   - Verify MCQ appears in listing
   - Verify success toast notification
   - 🔒 **OWASP**: Test form validation (client-side)

2. **MCQ Listing Flow** (`@Smoke`)
   - Navigate to MCQ listing page
   - Verify table displays MCQs
   - Test pagination (next/previous)
   - Test search functionality
   - Test sorting (by title, date)
   - Verify empty state when no MCQs

3. **MCQ Edit Flow** (`@Regression`)
   - Navigate to MCQ listing
   - Click edit action on owned MCQ
   - Modify MCQ fields
   - Submit form
   - Verify changes reflected in listing
   - Attempt to edit non-owned MCQ → Verify 403 error

4. **MCQ Delete Flow** (`@Regression`)
   - Navigate to MCQ listing
   - Click delete action on owned MCQ
   - Confirm deletion in dialog
   - Verify MCQ removed from listing
   - Verify success toast notification

5. **MCQ Attempt Flow** (`@Smoke @Regression`)
   - Navigate to MCQ preview page
   - Select an answer choice
   - Submit answer
   - Verify feedback (correct/incorrect)
   - Verify attempt recorded
   - Test "Try Again" functionality
   - View attempt history

**Page Objects**:
- `McqListingPage` - MCQ table, search, pagination
- `McqCreatePage` - MCQ creation form
- `McqEditPage` - MCQ edit form
- `McqPreviewPage` - MCQ preview and attempt submission

### TEKS AI Generation Feature Tests

#### Unit Tests ✅ COMPLETE

**Test Files**: 3 files  
**Total Tests**: 74 passing

**Coverage**:

1. **TEKS Schema Validation** (`lib/schemas/teks-mcq-schema.test.ts`) - 32 tests
   - ✅ `teksSelectionSchema` validation (12 tests)
     - Required field validation
     - Length constraints (topicDescription: 10-500 chars)
     - OWASP INPVAL-009: Input length limits
     - OWASP INPVAL-010: Special character handling
   - ✅ `teksMcqGenerationSchema` validation (18 tests)
     - Field length limits (title: 200, description: 500, questionText: 1000)
     - Choice count validation (exactly 4 choices required)
     - Correct answer validation (exactly one correct)
     - OWASP BUSLOGIC-001: Business logic constraints

2. **TEKS Service** (`lib/services/TEKS.test.ts`) - 16 tests
   - ✅ TEKS data structure validation
   - ✅ Schema validation for nested structures (subjects → grades → strands → standards)
   - ✅ Data integrity checks

3. **TEKS API Route** (`app/api/mcqs/generate-teks/route.test.ts`) - 26 tests
   - ✅ Happy path scenarios (3 tests)
     - Successful MCQ generation
     - Empty string description handling
     - Null description handling
   - ✅ Error handling (9 tests)
     - Missing OpenAI API key
     - Invalid JSON body
     - Zod validation errors
     - OpenAI API failures (auth, rate limit, quota)
     - Generated MCQ validation failures
   - ✅ OWASP security tests (12 tests)
     - INPVAL-001: XSS prevention
     - INPVAL-005: SQL injection prevention
     - INPVAL-009: Input length limits
     - API-001: API authentication required
     - API-002: Request data validation
     - API-003: Zod schema validation
     - API-005: Error response information leakage prevention
     - ERR-001: Generic error messages
     - ERR-004: Appropriate HTTP status codes
     - BUSLOGIC-001: Business logic validation
     - BUSLOGIC-005: Rate limiting error handling
   - ✅ Prompt construction (2 tests)
     - Prompt includes all TEKS fields
     - Schema used for structured output

**Test Principles**:
- All dependencies mocked (no real OpenAI API calls)
- OWASP WSTG aligned security testing
- Input validation and sanitization verified
- Error handling and status codes tested
- Business logic constraints enforced

#### Integration Tests ⏳ PLANNED

**Postman Collection**: `tests/postman/collections/mcq.json` (TEKS generation section)

**Test Scenarios**:

1. **TEKS MCQ Generation** (`@Smoke @Regression`)
   - ✅ Generate MCQ with valid TEKS selection → 200 OK
   - ✅ Generate MCQ with invalid TEKS selection → 400 Bad Request
   - ✅ Generate MCQ without OpenAI API key → 500 Internal Server Error
   - ✅ Generate MCQ with OpenAI API error → 500 Internal Server Error
   - ✅ Generate MCQ with rate limit error → 429 Too Many Requests
   - 🔒 **OWASP**: Test input length limits
   - 🔒 **OWASP**: Test XSS payload handling
   - 🔒 **OWASP**: Test SQL injection prevention

**Environment Variables**:
- `baseUrl`: API base URL
- `openaiApiKey`: OpenAI API key (for integration tests)
- `testTeksSelection`: Sample TEKS selection data

#### UI Tests ⏳ PLANNED

**Selenium Test Class**: `tests.ui.mcq.TeksMcqGenerationTests`

**Test Scenarios**:

1. **TEKS MCQ Generation Flow** (`@Smoke @Regression`)
   - Navigate to MCQ creation page
   - Click "Generate with TEKS" button
   - Select subject, grade level, strand, and standard
   - Enter topic description
   - Click "Generate MCQ" button
   - Verify loading state displayed
   - Verify generated MCQ populates form fields
   - Verify form can be edited before submission
   - 🔒 **OWASP**: Test form validation (client-side)
   - 🔒 **OWASP**: Test XSS prevention in topic description field

2. **TEKS Dialog Interaction** (`@Regression`)
   - Test cascading dropdowns (Subject → Grade → Strand → Standard)
   - Test topic description input validation
   - Test error handling and display
   - Test dialog close/cancel functionality

---

## OWASP Security Testing

### Security Test Categories

All security tests are **highlighted with 🔒 OWASP** markers in test cases and follow [OWASP Web Security Testing Guide (WSTG) v4.2](https://owasp.org/www-project-web-security-testing-guide/v42/) principles.

#### Identity Management Testing (WSTG-IDM) - Section 4.3

**Reference**: [OWASP WSTG 4.3](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/03-Identity_Management_Testing/)

**Test Areas**:
- ✅ User registration process (unit tests)
- ⏳ Account enumeration prevention (integration tests)
- ⏳ Username policy enforcement (integration tests)
- ⏳ Account provisioning process (integration tests)

**Test Cases**:
- 🔒 **IDM-001** (WSTG 4.3.2): Verify user registration process validates all required fields
- 🔒 **IDM-002** (WSTG 4.3.2): Verify duplicate username/email detection works correctly
- 🔒 **IDM-003** (WSTG 4.3.4): Verify account enumeration not possible via error messages
- 🔒 **IDM-004** (WSTG 4.3.4): Verify username enumeration attacks prevented
- 🔒 **IDM-005** (WSTG 4.3.5): Verify username policy enforced (length, format, uniqueness)

#### Authentication Testing (WSTG-AUTHN) - Section 4.4

**Reference**: [OWASP WSTG 4.4](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/04-Authentication_Testing/)

**Test Areas**:
- ✅ Password requirements enforcement (unit tests)
- ⏳ Credentials transported over encrypted channel (integration tests)
- ⏳ Weak lockout mechanism (integration tests)
- ⏳ Authentication bypass attempts (integration tests)
- ⏳ Browser cache weaknesses (integration tests)
- ⏳ Weak password policy (integration tests)

**Test Cases**:
- 🔒 **AUTHN-001** (WSTG 4.4.1): Verify credentials transported over HTTPS only
- 🔒 **AUTHN-002** (WSTG 4.4.2): Verify no default credentials exist
- 🔒 **AUTHN-003** (WSTG 4.4.3): Verify account lockout mechanism after failed attempts
- 🔒 **AUTHN-004** (WSTG 4.4.4): Verify authentication schema cannot be bypassed
- 🔒 **AUTHN-005** (WSTG 4.4.5): Verify "Remember Password" functionality secure (if implemented)
- 🔒 **AUTHN-006** (WSTG 4.4.6): Verify browser cache doesn't store sensitive data
- 🔒 **AUTHN-007** (WSTG 4.4.7): Verify password complexity requirements enforced
- 🔒 **AUTHN-008** (WSTG 4.4.9): Verify password change/reset functionality secure (if implemented)

#### Authorization Testing (WSTG-AUTHZ) - Section 4.5

**Reference**: [OWASP WSTG 4.5](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/05-Authorization_Testing/)

**Test Areas**:
- ✅ Ownership verification (unit tests)
- ⏳ Authorization schema bypass attempts (integration tests)
- ⏳ Privilege escalation attempts (integration tests)
- ⏳ Insecure direct object references (integration tests)
- ⏳ Directory traversal (integration tests)

**Test Cases**:
- 🔒 **AUTHZ-001** (WSTG 4.5.1): Verify directory traversal attacks prevented
- 🔒 **AUTHZ-002** (WSTG 4.5.2): Verify authorization schema cannot be bypassed
- 🔒 **AUTHZ-003** (WSTG 4.5.3): Verify privilege escalation attempts blocked
- 🔒 **AUTHZ-004** (WSTG 4.5.4): Verify insecure direct object references prevented
- 🔒 **AUTHZ-005**: Verify users can only edit/delete their own MCQs
- 🔒 **AUTHZ-006**: Verify protected routes require authentication
- 🔒 **AUTHZ-007**: Verify API endpoints enforce ownership checks

#### Session Management Testing (WSTG-SESS) - Section 4.6

**Reference**: [OWASP WSTG 4.6](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/06-Session_Management_Testing/)

**Test Areas**:
- ✅ Session token generation (unit tests)
- ⏳ Session management schema validation (integration tests)
- ⏳ Cookie attributes security (integration tests)
- ⏳ Session fixation prevention (integration tests)
- ⏳ Exposed session variables (integration tests)
- ⏳ CSRF protection (integration tests)
- ⏳ Logout functionality (integration tests)
- ⏳ Session timeout (integration tests)
- ⏳ Session hijacking prevention (integration tests)

**Test Cases**:
- 🔒 **SESS-001** (WSTG 4.6.1): Verify session management schema is secure
- 🔒 **SESS-002** (WSTG 4.6.2): Verify cookie attributes (HttpOnly, Secure, SameSite) configured correctly
- 🔒 **SESS-003** (WSTG 4.6.3): Verify session fixation attacks prevented
- 🔒 **SESS-004** (WSTG 4.6.4): Verify session variables not exposed in URLs or client-side code
- 🔒 **SESS-005** (WSTG 4.6.5): Verify CSRF protection implemented (tokens, SameSite cookies)
- 🔒 **SESS-006** (WSTG 4.6.6): Verify logout functionality invalidates session completely
- 🔒 **SESS-007** (WSTG 4.6.7): Verify session timeout enforced correctly
- 🔒 **SESS-008** (WSTG 4.6.9): Verify session hijacking prevention measures in place
- 🔒 **SESS-009**: Verify session tokens are unique and cryptographically random
- 🔒 **SESS-010**: Verify concurrent sessions handled correctly

#### Input Validation Testing (WSTG-INPVAL) - Section 4.7

**Reference**: [OWASP WSTG 4.7](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/07-Input_Validation_Testing/)

**Test Areas**:
- ✅ Zod schema validation (unit tests)
- ⏳ Reflected XSS prevention (integration tests)
- ⏳ Stored XSS prevention (integration tests)
- ⏳ SQL injection prevention (integration tests)
- ⏳ HTTP parameter pollution (integration tests)
- ⏳ Command injection prevention (integration tests)
- ⏳ Server-side template injection (integration tests)

**Test Cases**:
- 🔒 **INPVAL-001** (WSTG 4.7.1): Verify reflected XSS attacks prevented
- 🔒 **INPVAL-002** (WSTG 4.7.2): Verify stored XSS attacks prevented
- 🔒 **INPVAL-003** (WSTG 4.7.3): Verify HTTP verb tampering prevented
- 🔒 **INPVAL-004** (WSTG 4.7.4): Verify HTTP parameter pollution handled correctly
- 🔒 **INPVAL-005** (WSTG 4.7.5): Verify SQL injection attacks blocked (prepared statements)
- 🔒 **INPVAL-006** (WSTG 4.7.5.6): Verify NoSQL injection attacks prevented (if applicable)
- 🔒 **INPVAL-007** (WSTG 4.7.12): Verify command injection attacks prevented
- 🔒 **INPVAL-008** (WSTG 4.7.18): Verify server-side template injection prevented
- 🔒 **INPVAL-009**: Verify input length limits enforced
- 🔒 **INPVAL-010**: Verify special characters sanitized correctly
- 🔒 **INPVAL-011**: Verify file upload restrictions (if applicable)

#### Error Handling Testing (WSTG-ERR) - Section 4.8

**Reference**: [OWASP WSTG 4.8](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/08-Testing_for_Error_Handling/)

**Test Areas**:
- ✅ Error handling in services (unit tests)
- ⏳ Improper error handling (integration tests)
- ⏳ Stack trace exposure (integration tests)

**Test Cases**:
- 🔒 **ERR-001** (WSTG 4.8.1): Verify improper error handling doesn't leak information
- 🔒 **ERR-002** (WSTG 4.8.2): Verify stack traces not exposed in production responses
- 🔒 **ERR-003**: Verify error messages don't expose sensitive information (database structure, file paths)
- 🔒 **ERR-004**: Verify appropriate HTTP status codes returned
- 🔒 **ERR-005**: Verify generic error messages for users, detailed logs for developers

#### Testing for Weak Cryptography (WSTG-CRYPTO) - Section 4.9

**Reference**: [OWASP WSTG 4.9](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/)

**Test Areas**:
- ✅ Password hashing (bcrypt) - unit tests
- ⏳ Transport layer security (integration tests)
- ⏳ Sensitive information encryption (integration tests)
- ⏳ Weak encryption detection (integration tests)

**Test Cases**:
- 🔒 **CRYPTO-001** (WSTG 4.9.1): Verify TLS/SSL configuration is secure (TLS 1.2+, strong ciphers)
- 🔒 **CRYPTO-002** (WSTG 4.9.3): Verify sensitive information not sent via unencrypted channels
- 🔒 **CRYPTO-003** (WSTG 4.9.4): Verify weak encryption algorithms not used
- 🔒 **CRYPTO-004**: Verify password hashing uses bcrypt with appropriate salt rounds (10+)
- 🔒 **CRYPTO-005**: Verify session tokens use cryptographically secure random generation

#### Business Logic Testing (WSTG-BUSLOGIC) - Section 4.10

**Reference**: [OWASP WSTG 4.10](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/10-Business_Logic_Testing/)

**Test Areas**:
- ✅ Business logic data validation (unit tests)
- ⏳ Request forgery attempts (integration tests)
- ⏳ Integrity checks (integration tests)
- ⏳ Process timing attacks (integration tests)
- ⏳ Workflow circumvention (integration tests)
- ⏳ Rate limiting (integration tests)

**Test Cases**:
- 🔒 **BUSLOGIC-001** (WSTG 4.10.1): Verify business logic data validation enforced
- 🔒 **BUSLOGIC-002** (WSTG 4.10.2): Verify ability to forge requests prevented
- 🔒 **BUSLOGIC-003** (WSTG 4.10.3): Verify integrity checks for MCQ ownership
- 🔒 **BUSLOGIC-004** (WSTG 4.10.4): Verify process timing attacks prevented
- 🔒 **BUSLOGIC-005** (WSTG 4.10.5): Verify rate limiting on login/registration endpoints
- 🔒 **BUSLOGIC-006** (WSTG 4.10.6): Verify workflow circumvention prevented (e.g., skipping steps)
- 🔒 **BUSLOGIC-007**: Verify MCQ creation requires authentication
- 🔒 **BUSLOGIC-008**: Verify MCQ update requires ownership verification

#### Client-side Testing (WSTG-CLIENT) - Section 4.11

**Reference**: [OWASP WSTG 4.11](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/11-Client-side_Testing/)

**Test Areas**:
- ⏳ DOM-based XSS (UI tests)
- ⏳ JavaScript execution security (UI tests)
- ⏳ HTML injection (UI tests)
- ⏳ Client-side URL redirect (UI tests)
- ⏳ CORS configuration (integration tests)
- ⏳ Clickjacking prevention (UI tests)
- ⏳ Browser storage security (UI tests)

**Test Cases**:
- 🔒 **CLIENT-001** (WSTG 4.11.1): Verify DOM-based XSS attacks prevented
- 🔒 **CLIENT-002** (WSTG 4.11.2): Verify JavaScript execution security measures
- 🔒 **CLIENT-003** (WSTG 4.11.3): Verify HTML injection attacks prevented
- 🔒 **CLIENT-004** (WSTG 4.11.4): Verify client-side URL redirects validated
- 🔒 **CLIENT-005** (WSTG 4.11.7): Verify CORS configuration is secure
- 🔒 **CLIENT-006** (WSTG 4.11.9): Verify clickjacking prevention (X-Frame-Options header)
- 🔒 **CLIENT-007** (WSTG 4.11.12): Verify browser storage (localStorage/sessionStorage) security

#### API Testing (WSTG-API) - Section 4.12

**Reference**: [OWASP WSTG 4.12](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/12-API_Testing/)

**Test Areas**:
- ⏳ API authentication and authorization (integration tests)
- ⏳ API input validation (integration tests)
- ⏳ API rate limiting (integration tests)
- ⏳ API error handling (integration tests)

**Test Cases**:
- 🔒 **API-001** (WSTG 4.12): Verify API authentication required for protected endpoints
- 🔒 **API-002** (WSTG 4.12): Verify API authorization checks enforced
- 🔒 **API-003** (WSTG 4.12): Verify API input validation (Zod schemas)
- 🔒 **API-004** (WSTG 4.12): Verify API rate limiting implemented
- 🔒 **API-005** (WSTG 4.12): Verify API error responses don't leak information

#### Configuration and Deployment Management Testing (WSTG-CONFIG) - Section 4.2

**Reference**: [OWASP WSTG 4.2](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/)

**Test Areas**:
- ⏳ HTTP methods security (integration tests)
- ⏳ HTTP Strict Transport Security (integration tests)
- ⏳ File permissions (integration tests)
- ⏳ Cloud storage security (integration tests)

**Test Cases**:
- 🔒 **CONFIG-001** (WSTG 4.2.6): Verify only required HTTP methods enabled (GET, POST, PUT, DELETE)
- 🔒 **CONFIG-002** (WSTG 4.2.7): Verify HSTS header configured (if HTTPS enabled)
- 🔒 **CONFIG-003** (WSTG 4.2.9): Verify file permissions secure (no world-writable files)
- 🔒 **CONFIG-004** (WSTG 4.2.11): Verify Cloudflare Workers configuration secure

### Security Test Implementation

**Unit Tests**: Security tests integrated into existing unit test suites with `🔒 OWASP` markers and WSTG section references in test names (e.g., `🔒 OWASP AUTHN-001 (WSTG 4.4.1)`).

**Integration Tests**: Dedicated security test collection in Postman organized by WSTG categories:
- `tests/postman/collections/security.json`
  - Identity Management (WSTG 4.3)
  - Authentication (WSTG 4.4)
  - Authorization (WSTG 4.5)
  - Session Management (WSTG 4.6)
  - Input Validation (WSTG 4.7)
  - Error Handling (WSTG 4.8)
  - Weak Cryptography (WSTG 4.9)
  - Business Logic (WSTG 4.10)
  - API Testing (WSTG 4.12)
  - Configuration Management (WSTG 4.2)

**UI Tests**: Security-focused test methods in Selenium test classes:
- `@Security` test group
- `@OWASP` tag for filtering
- Tests organized by WSTG categories:
  - Client-side Testing (WSTG 4.11)
  - Authentication flows (WSTG 4.4)
  - Authorization flows (WSTG 4.5)
  - Session management flows (WSTG 4.6)

**Test Naming Convention**:
- Format: `🔒 OWASP [CATEGORY]-[NUMBER] (WSTG [SECTION])`
- Example: `🔒 OWASP AUTHN-001 (WSTG 4.4.1): Verify credentials transported over HTTPS only`

---

## Test Interdependencies

### Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│ Unit Tests (Vitest)                                      │
│ - No dependencies                                        │
│ - Can run independently                                  │
│ - Fastest execution                                      │
└─────────────────────────────────────────────────────────┘
           │
           │ Provides mocked interfaces
           ▼
┌─────────────────────────────────────────────────────────┐
│ Integration Tests (Postman)                            │
│ - Depends on: Unit tests passing                        │
│ - Requires: Running application                        │
│ - Requires: Test database seeded                        │
│ - Requires: Authentication tokens                      │
└─────────────────────────────────────────────────────────┘
           │
           │ Validates API contracts
           ▼
┌─────────────────────────────────────────────────────────┐
│ UI Tests (Selenium)                                     │
│ - Depends on: Integration tests passing                │
│ - Requires: Deployed application                        │
│ - Requires: Test users created                          │
│ - Requires: Test data seeded                            │
└─────────────────────────────────────────────────────────┘
```

### Test Data Management

**Unit Tests**:
- Use mocked data (no real database)
- Test fixtures generated in test files
- No cleanup required

**Integration Tests**:
- Use test database (isolated from production)
- Test data seeded before test execution
- Cleanup after test execution (delete test records)
- Test users created via API

**UI Tests**:
- Use test database (same as integration tests)
- Test data seeded before test execution
- Cleanup after test execution
- Screenshots captured on failures

### Environment Requirements

**Unit Tests**:
- Node.js environment
- No external dependencies
- Can run offline

**Integration Tests**:
- Running application (dev/stage environment)
- Accessible API endpoints
- Test database available
- Environment variables configured

**UI Tests**:
- Deployed application (stage/prod environment)
- Browser drivers installed (Chrome, Firefox)
- Selenium Grid or local browser
- Test database available

---

## Implementation To-Do List

### Phase 1: Integration Test Setup ⏳ PLANNED

**Priority**: High  
**Estimated Effort**: 2-3 days

- [ ] **Setup Postman Collections**
  - [ ] Create `tests/postman/collections/auth.json`
  - [ ] Create `tests/postman/collections/mcq.json`
  - [ ] Create `tests/postman/collections/security.json`
  - [ ] Organize requests by feature/module

- [ ] **Setup Postman Environments**
  - [ ] Create `tests/postman/environments/dev.json`
  - [ ] Create `tests/postman/environments/stage.json`
  - [ ] Configure environment variables (baseUrl, tokens)

- [ ] **Implement Authentication Tests**
  - [ ] Registration flow tests (6 scenarios)
  - [ ] Login flow tests (6 scenarios)
  - [ ] Session management tests (6 scenarios)
  - [ ] Add OWASP security test cases (5 scenarios)

- [ ] **Implement MCQ Tests**
  - [ ] MCQ creation tests (6 scenarios)
  - [ ] MCQ retrieval tests (5 scenarios)
  - [ ] MCQ update tests (5 scenarios)
  - [ ] MCQ deletion tests (4 scenarios)
  - [ ] MCQ attempt tests (5 scenarios)
  - [ ] Add OWASP security test cases (3 scenarios)

- [ ] **Setup Newman CLI Integration**
  - [ ] Create npm script: `test:integration`
  - [ ] Configure CI/CD pipeline step
  - [ ] Setup JUnit XML reporting
  - [ ] Configure HTML report generation

- [ ] **Test Data Management**
  - [ ] Create test data seeding scripts
  - [ ] Create test data cleanup scripts
  - [ ] Document test user credentials

**Deliverables**:
- Postman collections for all API endpoints
- Newman CLI integration in CI/CD
- Test execution reports
- Test data management scripts

### Phase 2: UI Test Setup ⏳ PLANNED

**Priority**: Medium  
**Estimated Effort**: 5-7 days

- [ ] **Setup Selenium Project Structure**
  - [ ] Create Java project structure (`src/test/java`)
  - [ ] Configure TestNG test runner
  - [ ] Setup Allure reporting
  - [ ] Create Jenkins pipeline configuration (`Jenkinsfile`)
  - [ ] Configure Jenkins job for UI test execution

- [ ] **Create Base Classes**
  - [ ] `BaseTest` - Common test setup/teardown
  - [ ] `DriverFactory` - WebDriver initialization
  - [ ] `TestDataHelper` - Test data utilities

- [ ] **Create Page Objects**
  - [ ] `LoginPage` - Login form elements and actions
  - [ ] `SignupPage` - Registration form elements and actions
  - [ ] `NavigationHeader` - User menu and navigation
  - [ ] `McqListingPage` - MCQ table and actions
  - [ ] `McqCreatePage` - MCQ creation form
  - [ ] `McqEditPage` - MCQ edit form
  - [ ] `McqPreviewPage` - MCQ preview and attempt

- [ ] **Implement Authentication UI Tests**
  - [ ] Registration flow test (`@Smoke @Regression`)
  - [ ] Login flow test (`@Smoke @Regression`)
  - [ ] Logout flow test (`@Smoke`)
  - [ ] Protected route access test (`@Security`)

- [ ] **Implement MCQ UI Tests**
  - [ ] MCQ creation flow test (`@Smoke @Regression`)
  - [ ] MCQ listing flow test (`@Smoke`)
  - [ ] MCQ edit flow test (`@Regression`)
  - [ ] MCQ delete flow test (`@Regression`)
  - [ ] MCQ attempt flow test (`@Smoke @Regression`)

- [ ] **Setup Jenkins Pipeline Integration**
  - [ ] Create Jenkins pipeline (`Jenkinsfile`) for UI test execution
  - [ ] Configure Jenkins job to trigger post-deployment
  - [ ] Configure headless browser execution in Jenkins
  - [ ] Setup screenshot capture on failures
  - [ ] Configure Allure report generation and archiving in Jenkins
  - [ ] Setup Jenkins notifications for test failures
  - [ ] Configure test result publishing to Jenkins dashboard

- [ ] **Accessibility Testing**
  - [ ] Integrate axe-core for accessibility checks
  - [ ] Add accessibility test cases
  - [ ] Generate accessibility reports

**Deliverables**:
- Selenium test suite with Page Object Model
- Allure test reports
- Screenshot capture on failures
- Accessibility test reports

### Phase 3: Security Test Enhancement ⏳ PLANNED

**Priority**: High  
**Estimated Effort**: 5-7 days

- [ ] **OWASP WSTG v4.2 Test Case Implementation**

  - [ ] **Identity Management Testing (WSTG 4.3)**
    - [ ] User registration process tests (IDM-001, IDM-002)
    - [ ] Account enumeration prevention tests (IDM-003, IDM-004)
    - [ ] Username policy enforcement tests (IDM-005)

  - [ ] **Authentication Testing (WSTG 4.4)**
    - [ ] Credentials transport encryption tests (AUTHN-001)
    - [ ] Default credentials tests (AUTHN-002)
    - [ ] Account lockout mechanism tests (AUTHN-003)
    - [ ] Authentication bypass tests (AUTHN-004)
    - [ ] Browser cache security tests (AUTHN-006)
    - [ ] Password policy tests (AUTHN-007)
    - [ ] Password reset security tests (AUTHN-008, if implemented)

  - [ ] **Authorization Testing (WSTG 4.5)**
    - [ ] Directory traversal tests (AUTHZ-001)
    - [ ] Authorization bypass tests (AUTHZ-002)
    - [ ] Privilege escalation tests (AUTHZ-003)
    - [ ] Insecure direct object reference tests (AUTHZ-004)
    - [ ] Ownership verification tests (AUTHZ-005, AUTHZ-006, AUTHZ-007)

  - [ ] **Session Management Testing (WSTG 4.6)**
    - [ ] Session management schema tests (SESS-001)
    - [ ] Cookie attributes tests (SESS-002)
    - [ ] Session fixation tests (SESS-003)
    - [ ] Exposed session variables tests (SESS-004)
    - [ ] CSRF protection tests (SESS-005)
    - [ ] Logout functionality tests (SESS-006)
    - [ ] Session timeout tests (SESS-007)
    - [ ] Session hijacking prevention tests (SESS-008)

  - [ ] **Input Validation Testing (WSTG 4.7)**
    - [ ] Reflected XSS tests (INPVAL-001)
    - [ ] Stored XSS tests (INPVAL-002)
    - [ ] HTTP verb tampering tests (INPVAL-003)
    - [ ] HTTP parameter pollution tests (INPVAL-004)
    - [ ] SQL injection tests (INPVAL-005)
    - [ ] NoSQL injection tests (INPVAL-006, if applicable)
    - [ ] Command injection tests (INPVAL-007)
    - [ ] Server-side template injection tests (INPVAL-008)
    - [ ] Input length limit tests (INPVAL-009)
    - [ ] Special character sanitization tests (INPVAL-010)

  - [ ] **Error Handling Testing (WSTG 4.8)**
    - [ ] Improper error handling tests (ERR-001)
    - [ ] Stack trace exposure tests (ERR-002)
    - [ ] Information disclosure tests (ERR-003, ERR-004, ERR-005)

  - [ ] **Weak Cryptography Testing (WSTG 4.9)**
    - [ ] TLS/SSL configuration tests (CRYPTO-001)
    - [ ] Unencrypted channel tests (CRYPTO-002)
    - [ ] Weak encryption detection tests (CRYPTO-003)
    - [ ] Password hashing verification tests (CRYPTO-004)
    - [ ] Session token generation tests (CRYPTO-005)

  - [ ] **Business Logic Testing (WSTG 4.10)**
    - [ ] Business logic validation tests (BUSLOGIC-001)
    - [ ] Request forgery tests (BUSLOGIC-002)
    - [ ] Integrity check tests (BUSLOGIC-003)
    - [ ] Process timing attack tests (BUSLOGIC-004)
    - [ ] Rate limiting tests (BUSLOGIC-005)
    - [ ] Workflow circumvention tests (BUSLOGIC-006)
    - [ ] MCQ ownership tests (BUSLOGIC-007, BUSLOGIC-008)

  - [ ] **Client-side Testing (WSTG 4.11)**
    - [ ] DOM-based XSS tests (CLIENT-001)
    - [ ] JavaScript execution security tests (CLIENT-002)
    - [ ] HTML injection tests (CLIENT-003)
    - [ ] Client-side URL redirect tests (CLIENT-004)
    - [ ] CORS configuration tests (CLIENT-005)
    - [ ] Clickjacking prevention tests (CLIENT-006)
    - [ ] Browser storage security tests (CLIENT-007)

  - [ ] **API Testing (WSTG 4.12)**
    - [ ] API authentication tests (API-001)
    - [ ] API authorization tests (API-002)
    - [ ] API input validation tests (API-003)
    - [ ] API rate limiting tests (API-004)
    - [ ] API error handling tests (API-005)

  - [ ] **Configuration and Deployment Management Testing (WSTG 4.2)**
    - [ ] HTTP methods security tests (CONFIG-001)
    - [ ] HSTS configuration tests (CONFIG-002)
    - [ ] File permissions tests (CONFIG-003)
    - [ ] Cloudflare Workers configuration tests (CONFIG-004)

- [ ] **Security Test Organization**
  - [ ] Mark all security tests with `🔒 OWASP` prefix and WSTG reference
  - [ ] Create dedicated security test collection in Postman: `tests/postman/collections/security.json`
  - [ ] Organize tests by WSTG category
  - [ ] Create `@Security` test group in Selenium
  - [ ] Create `@OWASP` tag for filtering security tests
  - [ ] Document security test coverage matrix

- [ ] **Security Test Reporting**
  - [ ] Generate security test reports with WSTG category breakdown
  - [ ] Track security test coverage by WSTG section
  - [ ] Document security findings with WSTG references
  - [ ] Create security test dashboard

**Deliverables**:
- Comprehensive OWASP WSTG v4.2-aligned security test suite
- Security test reports organized by WSTG categories
- Security test coverage documentation with WSTG references
- Security test execution dashboard

### Phase 4: Test Maintenance and Optimization ⏳ PLANNED

**Priority**: Low  
**Estimated Effort**: Ongoing

- [ ] **Test Performance Optimization**
  - [ ] Optimize slow-running tests
  - [ ] Implement test parallelization
  - [ ] Reduce test execution time

- [ ] **Test Coverage Analysis**
  - [ ] Generate coverage reports
  - [ ] Identify coverage gaps
  - [ ] Increase coverage to >90%

- [ ] **Test Documentation**
  - [ ] Document test execution procedures
  - [ ] Document test data requirements
  - [ ] Create test troubleshooting guide

- [ ] **Test Maintenance**
  - [ ] Regular test review and cleanup
  - [ ] Update tests for new features
  - [ ] Remove obsolete tests

**Deliverables**:
- Optimized test suite
- Test coverage reports
- Test documentation

---

## Test Execution Strategy

### Local Development

**Unit Tests**:
```bash
# Run all unit tests
npm run test:run

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui
```

**Integration Tests**:
```bash
# Run Postman collections locally
newman run tests/postman/collections/auth.json -e tests/postman/environments/dev.json

# Run all integration tests
npm run test:integration
```

**UI Tests**:
```bash
# Run Selenium tests locally (using Gradle or direct TestNG execution)
# Note: Jenkins handles test execution in CI/CD pipeline

# Run specific test group locally
gradle test --tests SmokeTests
# OR
java -cp "test-classes:lib/*" org.testng.TestNG testng-smoke.xml

# Run with Allure report locally
gradle test allureReport
# OR use Allure command-line tool
allure serve allure-results
```

**Jenkins Pipeline Execution**:
- Jenkins automatically triggers UI tests post-deployment
- Tests run in Jenkins agent with browser drivers configured
- Allure reports generated and archived in Jenkins
- Test results published to Jenkins test results dashboard

### CI/CD Pipeline (Jenkins)

**Pre-Build** (Unit Tests):
- Trigger: On every commit (Jenkins pipeline)
- Command: `npm run test:run`
- Execution: Jenkins pipeline stage
- Failure: Blocks build
- Duration: ~2-3 minutes

**Pre-Deploy** (Integration Tests):
- Trigger: Before deployment (Jenkins pipeline)
- Command: `npm run test:integration` (executed in Jenkins)
- Execution: Jenkins pipeline stage
- Failure: Blocks deployment
- Duration: ~5-10 minutes

**Post-Deploy** (UI Tests - Smoke):
- Trigger: After successful deployment (Jenkins job)
- Execution: Separate Jenkins job triggers Selenium test suite
- Test Group: Smoke tests only (`@Smoke` tag)
- Jenkins Job: `quizmaker-ui-tests-smoke`
- Failure: Generates alert (non-blocking)
- Duration: ~10-15 minutes
- Reports: Allure reports archived in Jenkins

**Nightly** (Full Test Suite):
- Trigger: Scheduled Jenkins job (e.g., 2 AM)
- Execution: Jenkins scheduled pipeline
- Test Suites: All unit, integration, and UI tests
- Failure: Generates report and notifications
- Duration: ~30-45 minutes

---

## Test Reporting

### Unit Test Reports

**Framework**: Vitest built-in reporting  
**Format**: Console output, JSON, JUnit XML  
**Location**: `coverage/` directory

**Metrics**:
- Test execution time
- Pass/fail counts
- Code coverage percentage
- Coverage by file

### Integration Test Reports

**Tool**: Newman HTML Reporter  
**Format**: HTML, JUnit XML  
**Location**: `tests/postman/reports/`

**Metrics**:
- Request/response details
- Assertion results
- Execution time per request
- Pass/fail summary

### UI Test Reports

**Tool**: Allure Framework  
**Format**: HTML report  
**Location**: `allure-results/`, `allure-report/`

**Metrics**:
- Test execution timeline
- Screenshots on failures
- Test step details
- Browser/OS information
- Accessibility violations (if any)

---

## Risk Assessment

### Testing Risks

**Risk**: Flaky UI tests due to timing issues  
**Mitigation**: Use explicit waits, avoid fixed sleeps, retry failed tests

**Risk**: Test data conflicts in parallel execution  
**Mitigation**: Use unique test data, isolate test environments

**Risk**: Slow test execution blocking CI/CD  
**Mitigation**: Optimize tests, run critical tests first, parallelize execution

**Risk**: Test maintenance overhead  
**Mitigation**: Follow Page Object Model, reuse test utilities, document test patterns

### Coverage Gaps

**Current Gaps**:
- Integration tests not implemented
- UI tests not implemented
- Security tests not fully implemented (OWASP WSTG v4.2 coverage incomplete)
- Performance tests not implemented
- Accessibility tests not implemented

**OWASP WSTG v4.2 Coverage Status**:
- ✅ **Identity Management (4.3)**: Partial (registration tests exist, enumeration tests needed)
- ✅ **Authentication (4.4)**: Partial (password policy exists, lockout/encryption tests needed)
- ✅ **Authorization (4.5)**: Partial (ownership tests exist, privilege escalation tests needed)
- ✅ **Session Management (4.6)**: Partial (token generation exists, CSRF/fixation tests needed)
- ✅ **Input Validation (4.7)**: Partial (Zod validation exists, XSS/SQL injection tests needed)
- ✅ **Error Handling (4.8)**: Partial (error handling exists, information disclosure tests needed)
- ⏳ **Weak Cryptography (4.9)**: Not implemented (TLS/encryption tests needed)
- ⏳ **Business Logic (4.10)**: Not implemented (rate limiting/workflow tests needed)
- ⏳ **Client-side Testing (4.11)**: Not implemented (XSS/clickjacking tests needed)
- ⏳ **API Testing (4.12)**: Not implemented (API-specific security tests needed)
- ⏳ **Configuration Management (4.2)**: Not implemented (HTTP methods/HSTS tests needed)

**Mitigation Plan**: See Implementation To-Do List Phase 3 above

---

## Success Criteria

### Test Coverage Goals

- ✅ **Unit Tests**: >80% coverage (ACHIEVED - 169 tests passing)
- ⏳ **Integration Tests**: 100% API endpoint coverage (PLANNED)
- ⏳ **UI Tests**: Critical user journeys covered (PLANNED)
- ⏳ **Security Tests**: OWASP WSTG compliance (PLANNED)

### Quality Metrics

- **Test Execution Time**: <30 minutes for full suite
- **Test Reliability**: <5% flaky test rate
- **Test Maintenance**: Tests updated within 1 sprint of feature changes
- **Security Coverage**: All OWASP WSTG categories covered

---

## Appendices

### Appendix A: Test Data Requirements

**Test Users**:
- `testuser1` / `TestPassword123!` - Standard test user
- `testuser2` / `TestPassword123!` - Secondary test user
- `admin` / `AdminPassword123!` - Admin user (future)

**Test MCQs**:
- Pre-seeded MCQs for integration/UI tests
- Unique identifiers for parallel execution
- Cleanup scripts to remove test data

### Appendix B: Test Environment Setup

**Development Environment**:
- Local database (D1 local)
- Local API server (`npm run preview`)
- Test users created via API

**Staging Environment**:
- Staging database (D1 remote)
- Staging API server
- Test users pre-created
- Test data seeded

### Appendix C: Troubleshooting Guide

**Common Issues**:
- Tests failing due to timing → Use explicit waits
- Tests failing due to data conflicts → Use unique test data
- Tests failing in CI but passing locally → Check environment variables
- Integration tests failing → Verify API server is running

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 (Draft) | 2025-01-13 | AI Assistant | Initial draft for review |

---

## Review and Approval

**Status**: Draft for Review  
**Next Review Date**: TBD  
**Approvers**: TBD

**Review Checklist**:
- [ ] Test strategy aligns with project goals
- [ ] Tool selection appropriate for project
- [ ] Test coverage goals realistic
- [ ] Implementation timeline feasible
- [ ] CI/CD integration plan clear
- [ ] Security testing approach comprehensive

---

**End of Test Plan**
