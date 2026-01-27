# QuizMaker UI Test Plan

**Version**: 1.1  
**Last Updated**: 2025-01-21  
**Status**: Phase 1 Complete - Phase 2 In Progress  
**Single Source of Truth**: This document is the authoritative reference for all UI test planning and implementation

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Prerequisites & Setup](#prerequisites--setup)
- [Test User Credentials](#test-user-credentials)
- [Test Organization Strategy](#test-organization-strategy)
- [UI Test Phases](#ui-test-phases)
- [Test Scenarios by Phase](#test-scenarios-by-phase)
- [Page Object Model Structure](#page-object-model-structure)
- [Session Management & Test Isolation](#session-management--test-isolation)
- [Test Execution Strategy](#test-execution-strategy)
- [Implementation Roadmap](#implementation-roadmap)
- [Success Criteria](#success-criteria)
- [Notes](#notes)

---

## Overview

This document outlines the UI test implementation plan for QuizMaker using **Selenium WebDriver with TypeScript** and **Jest** as the test runner. UI tests focus on critical user journeys and end-to-end workflows that validate the complete user experience.

**Technology Stack**:
- **Language**: TypeScript (matches project stack)
- **Test Framework**: Jest
- **Browser Automation**: Selenium WebDriver
- **CI/CD**: Jenkins
- **Reporting**: Jest HTML Reporter (Allure optional)
- **Accessibility**: axe-core (planned for Phase 4)

**Testing Philosophy**:
- Focus on **critical user journeys** (not every UI element)
- Test **end-to-end workflows** (user completes a task)
- Use **Page Object Model** for maintainability
- Prioritize **smoke tests** for fast feedback
- Include **security-focused UI tests** (OWASP client-side)

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Chrome browser installed
- Application running on `http://localhost:3000`

### Setup

1. **Install dependencies**:
```bash
cd tests/ui
npm install
```

2. **Start the application**:
```bash
# From project root
npm run preview
```

3. **Run tests**:
```bash
# Run all tests
cd tests/ui
npm run test:selenium

# Run smoke tests only
npm run test:selenium:smoke

# Run in watch mode
npm run test:selenium:watch
```

### Test Structure

- `src/base/` - Base classes and utilities
- `src/pages/` - Page Object Model classes
- `src/tests/` - Test files organized by feature
- `config/` - Configuration files
- `reports/` - Test reports and screenshots

### Configuration Files

- `config/selenium.config.ts` - Selenium and test configuration
- `jest.config.ts` - Jest test runner configuration
- `tsconfig.json` - TypeScript configuration

### Test Reports

- **HTML reports**: `reports/html-reports/test-results.html`
- **Screenshots**: `reports/screenshots/` (on failure)

---

## Prerequisites & Setup

### Required Software

| Requirement | Status | Version/Details |
|------------|--------|-----------------|
| **Node.js** | ✅ Installed | v23.11.0 (Requirement: 18+) |
| **npm** | ✅ Installed | v10.9.2 (Requirement: 9+) |
| **Chrome Browser** | ✅ Installed | Google Chrome 144.0.7559.97 |
| **TypeScript** | ✅ Installed | Installed in `tests/ui/` |
| **Cursor IDE** | ✅ Confirmed | Already using |

### Dependencies Installed

The following npm packages are installed in `tests/ui/`:

- `selenium-webdriver` - Selenium WebDriver for TypeScript
- `jest` - Test framework
- `@types/jest` - Jest TypeScript types
- `@types/selenium-webdriver` - Selenium TypeScript types
- `chromedriver` - ChromeDriver binary (auto-managed)
- `jest-html-reporter` - HTML test reports
- `@axe-core/webdriverjs` - Accessibility testing (for Phase 4)
- `ts-jest` - TypeScript support for Jest

### Project Structure

The following directory structure has been created:

```
tests/ui/
├── package.json               # ✅ Created
├── tsconfig.json              # ✅ Created
├── jest.config.ts             # ✅ Created
├── README.md                  # ✅ Created
├── src/
│   ├── base/                  # ✅ Created
│   │   ├── BaseTest.ts        # ✅ Created
│   │   ├── DriverFactory.ts   # ✅ Created
│   │   ├── TestDataHelper.ts  # ✅ Created
│   │   └── jest.setup.ts      # ✅ Created
│   │
│   ├── pages/                 # ✅ Created
│   │   ├── auth/              # ✅ Created
│   │   │   ├── LoginPage.ts  # ✅ Created
│   │   │   ├── SignupPage.ts # ✅ Created
│   │   │   └── NavigationHeader.ts # ✅ Created
│   │   │
│   │   └── common/            # ✅ Created (empty, for future use)
│   │
│   └── tests/                 # ✅ Created
│       └── auth/              # ✅ Created
│           └── auth-flow.test.ts # ✅ Created (Phase 1)
│
├── config/                     # ✅ Created
│   ├── selenium.config.ts     # ✅ Created
│   └── test-data/             # ✅ Created (empty, for future use)
│
└── reports/                    # ✅ Created
    ├── screenshots/           # ✅ Created
    └── html-reports/          # ✅ Created
```

### Configuration Files

1. **`tests/ui/package.json`** ✅ Created
   - Dependencies: selenium-webdriver, jest, chromedriver, etc.
   - Scripts: `test:selenium`, `test:selenium:smoke`, `test:selenium:watch`

2. **`tests/ui/jest.config.ts`** ✅ Created
   - Test file patterns: `src/**/*.test.ts`
   - Test timeout: 30 seconds (for Selenium waits)
   - Reporter: Jest HTML Reporter
   - Setup file: `src/base/jest.setup.ts`

3. **`tests/ui/tsconfig.json`** ✅ Created
   - Target: ES2017
   - Module: commonjs
   - Includes: `src/**/*.ts`, `config/**/*.ts`

4. **`tests/ui/config/selenium.config.ts`** ✅ Created
   - Base URL: `http://localhost:3000`
   - Browser: `chrome` (default)
   - Timeouts: 5s implicit, 30s page load, 30s script
   - Test user credentials (see Test User Credentials section)

### Application Configuration

#### Base URL
- **Local Development**: `http://localhost:3000`
- **Source**: `tests/postman/environments/dev.json`
- **Config Location**: `tests/ui/config/selenium.config.ts`

#### Application Status
- ⚠️ **Application must be running** before executing UI tests
- **Start Command**: `npm run preview` or `npm run dev:cf`
- **Verification**: Navigate to `http://localhost:3000` in browser

### Script Name Convention

**Note**: Root `package.json` has `"test:ui": "vitest --ui"` for Vitest UI.

**Resolution**: Selenium UI tests use `test:selenium` to avoid conflict:
- **Selenium UI Tests**: `test:selenium` (in `tests/ui/package.json`)
- **Vitest UI**: `test:ui` (in root `package.json`)

### Verification Steps

#### 1. Verify Application Runs
```bash
# Start application
npm run preview

# Verify in browser
open http://localhost:3000
```

#### 2. Verify Test Users Can Be Created
```bash
# Test registration endpoint (if needed)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "username": "integration_teacher_1",
    "email": "integration.teacher1@example.com",
    "password": "IntegrationTestPassword123!"
  }'
```

#### 3. Verify Chrome Accessible
```bash
# Check Chrome version
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
```

### Potential Issues & Resolutions

#### Issue 1: Script Name Conflict
**Problem**: Root `package.json` has `test:ui` for Vitest UI  
**Resolution**: Use `test:selenium` for Selenium tests (already resolved)

#### Issue 2: Application Not Running
**Problem**: UI tests require running application  
**Resolution**: Always start application before running tests (`npm run preview`)

#### Issue 3: Test Users Don't Exist
**Problem**: Tests may fail if test users aren't created  
**Resolution**: Tests will create users via registration flow, or create them manually first

#### Issue 4: Port Already in Use
**Problem**: Port 3000 may be in use  
**Resolution**: Change base URL in config or kill process on port 3000

---

## Test User Credentials

### Primary Test User (from auth.json)
- **Username**: `integration_teacher_1`
- **Email**: `integration.teacher1@example.com`
- **Password**: `IntegrationTestPassword123!`
- **Purpose**: Main test user for authentication and MCQ tests

### Alternative Test User (from dev.json)
- **Username**: `testuser`
- **Email**: `testuser@example.com`
- **Password**: `TestPassword123`
- **Purpose**: Fallback test user

### Security Test Users (from security.json)
- **User 1**: 
  - Username: `security_test_user_1`
  - Email: `security.test.user1@example.com`
  - Password: `SecurityTestPassword123!`
- **User 2**: 
  - Username: `security_test_user_2`
  - Email: `security.test.user2@example.com`
  - Password: `SecurityTestPassword123!`
- **Purpose**: Security-focused UI tests

**Note**: These users will be created automatically via registration tests if they don't exist. Credentials are stored in `tests/ui/config/selenium.config.ts`.

---

## Test Organization Strategy

### Recommended Structure

```
tests/ui/
├── src/
│   ├── base/
│   │   ├── BaseTest.ts                # Common setup/teardown ✅
│   │   ├── DriverFactory.ts          # WebDriver initialization ✅
│   │   ├── TestDataHelper.ts         # Test data utilities ✅
│   │   └── jest.setup.ts             # Jest global setup ✅
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.ts          # ✅ Created
│   │   │   ├── SignupPage.ts        # ✅ Created
│   │   │   └── NavigationHeader.ts  # ✅ Created
│   │   │
│   │   ├── mcq/                      # ⏳ Phase 2
│   │   │   ├── McqListingPage.ts
│   │   │   ├── McqCreatePage.ts
│   │   │   ├── McqEditPage.ts
│   │   │   ├── McqPreviewPage.ts
│   │   │   └── TeksGeneratorDialog.ts
│   │   │
│   │   └── common/                   # ⏳ Future
│   │       ├── ToastNotification.ts
│   │       └── ConfirmationDialog.ts
│   │
│   └── tests/
│       ├── auth/
│       │   └── auth-flow.test.ts      # ✅ Phase 1 Complete
│       │
│       ├── mcq/                       # ⏳ Phase 2
│       │   ├── mcq-crud.test.ts
│       │   └── mcq-attempt.test.ts
│       │
│       ├── teks/                      # ⏳ Phase 3
│       │   └── teks-generation.test.ts
│       │
│       └── security/                  # ⏳ Phase 4
│           └── security-ui.test.ts
│
├── config/
│   ├── jest.config.ts                 # ✅ Created
│   ├── selenium.config.ts            # ✅ Created
│   └── test-data/                    # ✅ Created
│       ├── users.json                 # ⏳ Future
│       └── mcqs.json                  # ⏳ Future
│
└── reports/
    ├── allure-results/                # ⏳ Future (if Allure used)
    ├── screenshots/                   # ✅ Created
    └── html-reports/                  # ✅ Created
```

### Jest Test Organization

Use Jest's `describe` blocks and test naming for categorization:

- **Smoke Tests**: `describe('Smoke Tests', () => { ... })` - Critical path tests
- **Regression Tests**: `describe('Regression Tests', () => { ... })` - Full feature coverage
- **Security Tests**: `describe('Security Tests', () => { ... })` - OWASP client-side
- **Accessibility Tests**: `describe('Accessibility Tests', () => { ... })` - WCAG compliance

**Test Naming Convention**:
- `describe('Feature Name', () => { ... })` - Feature grouping
- `test('should [expected behavior]', () => { ... })` - Individual test
- Example: `test('should login with valid credentials', () => { ... })`

---

## UI Test Phases

### Phase 1: Authentication UI Tests ✅ COMPLETE

**Priority**: High  
**Status**: ✅ **COMPLETE**  
**Test Count**: 15+ tests implemented

**Focus**: Core authentication flows that users must complete to access the application.

**Test Scenarios Implemented**:

1. **Registration Flow** (`@Smoke @Regression`) ✅
   - Navigate to `/signup`
   - Fill registration form with valid data
   - Submit form
   - Verify redirect to `/mcqs`
   - Verify user menu shows username
   - Verify toast notification shows success message
   - 🔒 **OWASP**: Verify password field is masked (type="password")

2. **Registration Validation** (`@Regression`) ✅
   - Test invalid email format
   - Test weak password (less than 8 characters)
   - Test password without numbers/letters
   - Test duplicate username/email
   - Test password mismatch
   - Verify error messages display correctly
   - Verify form does not submit with invalid data

3. **Login Flow** (`@Smoke @Regression`) ✅
   - Navigate to `/login`
   - Fill login form with valid credentials
   - Submit form
   - Verify redirect to `/mcqs` (or redirect URL if provided)
   - Verify session persists on page refresh
   - Verify user menu shows username
   - 🔒 **OWASP**: Verify password field is masked

4. **Login Validation** (`@Regression`) ✅
   - Test invalid credentials
   - Test empty username/email
   - Test empty password
   - Verify error messages display correctly
   - Verify generic error message (no account enumeration)

5. **Logout Flow** (`@Smoke`) ✅
   - Click logout button in navigation header
   - Verify redirect to home page (`/`)
   - Verify session cleared (attempt to access `/mcqs` redirects to login)
   - Verify user menu no longer shows username

6. **Protected Route Access** (`@Security`) ⏳ PLANNED
   - Attempt to access `/mcqs` without authentication
   - Verify redirect to `/login` with redirect parameter
   - Login and verify redirect back to `/mcqs`
   - 🔒 **OWASP**: Test direct URL access to protected routes
   - 🔒 **OWASP**: Verify session cookie attributes (HttpOnly, SameSite) via browser dev tools

7. **Session Persistence** (`@Regression`) ✅
   - Login successfully
   - Refresh page
   - Verify still authenticated
   - Close and reopen browser (if "Remember Me" implemented)
   - Verify session state

**Page Objects Created**:
- ✅ `LoginPage` - Login form elements and actions
- ✅ `SignupPage` - Registration form elements and actions
- ✅ `NavigationHeader` - User menu and logout actions

**Test File**: `tests/ui/src/tests/auth/auth-flow.test.ts`

---

### Phase 2: MCQ CRUD UI Tests ⏳ PLANNED

**Priority**: High  
**Estimated Effort**: 4-5 days  
**Test Count**: ~15-20 tests

**Focus**: Complete MCQ lifecycle - create, read, update, delete, and attempt workflows.

**Test Scenarios**:

#### MCQ Listing (`@Smoke @Regression`)

1. **MCQ List Display** (`@Smoke`)
   - Navigate to `/mcqs`
   - Verify MCQ table displays
   - Verify table shows: title, question text, created date
   - Verify "Create MCQ" button is visible
   - Verify empty state displays when no MCQs exist

2. **MCQ Search** (`@Regression`)
   - Enter search term in search box
   - Verify results filter in real-time (debounced)
   - Verify URL updates with search parameter
   - Verify search persists on page refresh
   - Verify clear search resets results

3. **MCQ Pagination** (`@Regression`)
   - Create multiple MCQs (more than page size)
   - Verify pagination controls appear
   - Click next page
   - Verify URL updates with page parameter
   - Verify correct MCQs display on each page
   - Verify pagination persists on page refresh

4. **MCQ Sorting** (`@Regression`)
   - Click column header to sort
   - Verify sort order changes
   - Verify URL updates with sort parameters
   - Verify sort persists on page refresh

#### MCQ Creation (`@Smoke @Regression`)

5. **Create MCQ Flow** (`@Smoke @Regression`)
   - Navigate to `/mcqs/new`
   - Fill MCQ form with valid data:
     - Title
     - Description (optional)
     - Question text
     - 4 choices (exactly one correct)
   - Submit form
   - Verify redirect to `/mcqs`
   - Verify new MCQ appears in list
   - Verify toast notification shows success

6. **MCQ Form Validation** (`@Regression`)
   - Test empty title
   - Test empty question text
   - Test MCQ with no choices
   - Test MCQ with only 1 choice
   - Test MCQ with no correct choice
   - Test MCQ with multiple correct choices
   - Verify error messages display correctly
   - Verify form does not submit with invalid data

7. **MCQ Form Choice Management** (`@Regression`)
   - Add choice
   - Remove choice
   - Reorder choices (if drag-and-drop implemented)
   - Mark choice as correct
   - Verify exactly one choice can be marked correct
   - Verify choice text validation

#### MCQ Editing (`@Regression`)

8. **Edit MCQ Flow** (`@Regression`)
   - Navigate to existing MCQ
   - Click "Edit" button
   - Verify form pre-populated with MCQ data
   - Modify title and question text
   - Update choices
   - Submit form
   - Verify redirect to MCQ preview
   - Verify changes reflected in preview
   - Verify toast notification shows success

9. **Edit MCQ Authorization** (`@Security`)
   - Login as User A
   - Create MCQ
   - Logout
   - Login as User B
   - Attempt to edit User A's MCQ
   - Verify 403 error or redirect
   - Verify error message displayed

#### MCQ Deletion (`@Regression`)

10. **Delete MCQ Flow** (`@Regression`)
    - Navigate to MCQ listing
    - Click delete button on MCQ
    - Confirm deletion in dialog
    - Verify MCQ removed from list
    - Verify toast notification shows success
    - Verify redirect to listing page

11. **Delete MCQ Authorization** (`@Security`)
    - Login as User A
    - Create MCQ
    - Logout
    - Login as User B
    - Attempt to delete User A's MCQ
    - Verify delete button not visible or disabled
    - Verify 403 error if API call attempted

#### MCQ Preview & Attempt (`@Smoke @Regression`)

12. **MCQ Preview Display** (`@Smoke`)
    - Navigate to `/mcqs/[id]`
    - Verify MCQ title displays
    - Verify question text displays
    - Verify all choices display as radio buttons
    - Verify "Submit Answer" button visible
    - Verify MCQ metadata (created date, etc.)

13. **MCQ Attempt Flow** (`@Smoke @Regression`)
    - Navigate to MCQ preview
    - Select correct answer
    - Click "Submit Answer"
    - Verify success message displays
    - Verify result shows (correct/incorrect)
    - Verify attempt recorded (if attempt history implemented)

14. **MCQ Attempt Validation** (`@Regression`)
    - Navigate to MCQ preview
    - Click "Submit Answer" without selecting choice
    - Verify error message displays
    - Verify form does not submit

15. **MCQ Attempt History** (`@Regression` - if implemented)
    - Complete multiple attempts on same MCQ
    - Verify attempt history displays
    - Verify previous answers shown
    - Verify results displayed correctly

**Page Objects Required**:
- `McqListingPage` - MCQ table, search, pagination
- `McqCreatePage` - MCQ creation form
- `McqEditPage` - MCQ edit form
- `McqPreviewPage` - MCQ preview and attempt
- `McqActionMenu` - Edit/delete actions

---

### Phase 3: TEKS AI Generation UI Tests ⏳ PLANNED

**Priority**: Medium  
**Estimated Effort**: 2-3 days  
**Test Count**: ~6-8 tests

**Focus**: TEKS-driven MCQ generation via dialog interface.

**Test Scenarios**:

1. **TEKS Generator Dialog Open** (`@Smoke`)
   - Navigate to `/mcqs/new`
   - Click "Generate with TEKS" button (if implemented)
   - Verify dialog opens
   - Verify form fields visible:
     - Subject dropdown
     - Grade level dropdown
     - Strand name dropdown
     - Standard code/description
     - Topic description input

2. **TEKS Generator Form Validation** (`@Regression`)
   - Leave required fields empty
   - Enter topic description too short (< 10 characters)
   - Enter topic description too long (> 500 characters)
   - Verify error messages display
   - Verify form does not submit with invalid data

3. **TEKS MCQ Generation Flow** (`@Smoke @Regression`)
   - Fill TEKS form with valid data
   - Click "Generate MCQ" button
   - Verify loading state displays
   - Verify generated MCQ appears in form
   - Verify MCQ has:
     - Title
     - Question text
     - Exactly 4 choices
     - Exactly one correct choice
   - Verify user can edit generated MCQ before saving
   - Click "Use This MCQ" or "Save"
   - Verify MCQ saved to database
   - Verify redirect to MCQ listing

4. **TEKS Generation Error Handling** (`@Regression`)
   - Trigger API error (e.g., invalid OpenAI API key)
   - Verify error message displays in dialog
   - Verify dialog does not close
   - Verify user can retry or cancel

5. **TEKS Generator Dialog Cancel** (`@Regression`)
   - Open dialog
   - Fill form partially
   - Click "Cancel" or close dialog
   - Verify dialog closes
   - Verify form data cleared (if reopened)

**Page Objects Required**:
- `TeksGeneratorDialog` - TEKS generation dialog
- `McqCreatePage` - Integration with TEKS generator

---

### Phase 4: Security & Cross-Cutting UI Tests ⏳ PLANNED

**Priority**: Medium  
**Estimated Effort**: 3-4 days  
**Test Count**: ~10-12 tests

**Focus**: OWASP client-side security testing and UI-specific security concerns.

**Test Scenarios**:

#### OWASP Client-Side Security (WSTG 4.11)

1. **DOM-based XSS Prevention** (`@Security`)
   - Inject XSS payload in MCQ title
   - Submit form
   - Verify XSS payload not executed
   - Verify payload displayed as text (sanitized)
   - Test in MCQ preview/display

2. **JavaScript Execution Security** (`@Security`)
   - Attempt to inject JavaScript in form inputs
   - Verify JavaScript not executed
   - Verify input sanitized before display

3. **HTML Injection Prevention** (`@Security`)
   - Inject HTML tags in MCQ fields
   - Submit form
   - Verify HTML tags escaped/sanitized
   - Verify safe display in preview

4. **Client-Side URL Redirect** (`@Security`)
   - Test redirect parameter in login URL
   - Verify redirect only to allowed domains
   - Verify no open redirect vulnerability

5. **Clickjacking Prevention** (`@Security`)
   - Verify X-Frame-Options header present
   - Verify Content-Security-Policy header (if implemented)
   - Test iframe embedding blocked

6. **Browser Storage Security** (`@Security`)
   - Verify no sensitive data in localStorage
   - Verify no sensitive data in sessionStorage
   - Verify session tokens not in client-side storage
   - Verify cookies marked HttpOnly (via browser dev tools)

#### UI-Specific Security

7. **CSRF Protection** (`@Security` - if implemented)
   - Verify CSRF tokens in forms
   - Verify CSRF tokens validated on submission
   - Test CSRF attack simulation

8. **Input Sanitization** (`@Security`)
   - Test special characters in all form inputs
   - Verify proper encoding/escaping
   - Verify no script execution

9. **Error Message Security** (`@Security`)
   - Trigger various errors
   - Verify error messages don't expose:
     - Stack traces
     - File paths
     - Database details
     - Internal system information

#### Accessibility (WCAG Compliance)

10. **Keyboard Navigation** (`@Accessibility`)
    - Test all interactive elements accessible via keyboard
    - Verify tab order logical
    - Verify focus indicators visible
    - Verify keyboard shortcuts work

11. **Screen Reader Compatibility** (`@Accessibility`)
    - Verify ARIA labels present
    - Verify form labels associated correctly
    - Verify error messages announced
    - Test with screen reader (if available)

12. **Color Contrast** (`@Accessibility`)
    - Verify text meets WCAG AA contrast ratios
    - Verify error states visible
    - Verify focus indicators visible

**Page Objects Required**:
- Browser DevTools integration for security header checks
- Accessibility testing utilities (axe-core integration)

---

## Page Object Model Structure

### Base Page Class

```typescript
import { WebDriver, WebElement, until, By } from 'selenium-webdriver';

export abstract class BasePage {
    protected driver: WebDriver;
    protected wait: WebDriverWait;
    
    constructor(driver: WebDriver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, 10000); // 10 seconds
    }
    
    // Common methods
    protected async waitForElement(locator: By): Promise<WebElement> {
        return await this.wait.until(until.elementLocated(locator));
    }
    
    protected async click(locator: By): Promise<void> {
        const element = await this.waitForElement(locator);
        await element.click();
    }
    
    protected async type(locator: By, text: string): Promise<void> {
        const element = await this.waitForElement(locator);
        await element.clear();
        await element.sendKeys(text);
    }
    
    protected async getText(locator: By): Promise<string> {
        const element = await this.waitForElement(locator);
        return await element.getText();
    }
}
```

### Example: LoginPage

```typescript
import { WebDriver, By } from 'selenium-webdriver';
import { BasePage } from '../base/BasePage';
import { McqListingPage } from '../mcq/McqListingPage';

export class LoginPage extends BasePage {
    // Locators
    private readonly usernameInput = By.id('usernameOrEmail');
    private readonly passwordInput = By.id('password');
    private readonly submitButton = By.css('button[type="submit"]');
    private readonly errorMessage = By.className('error-message');
    
    constructor(driver: WebDriver) {
        super(driver);
    }
    
    // Actions
    async enterUsername(username: string): Promise<void> {
        await this.type(this.usernameInput, username);
    }
    
    async enterPassword(password: string): Promise<void> {
        await this.type(this.passwordInput, password);
    }
    
    async clickSubmit(): Promise<void> {
        await this.click(this.submitButton);
    }
    
    async login(username: string, password: string): Promise<McqListingPage> {
        await this.enterUsername(username);
        await this.enterPassword(password);
        await this.clickSubmit();
        return new McqListingPage(this.driver);
    }
    
    // Verifications
    async isErrorMessageDisplayed(): Promise<boolean> {
        try {
            const element = await this.driver.findElement(this.errorMessage);
            return await element.isDisplayed();
        } catch {
            return false;
        }
    }
    
    async getErrorMessage(): Promise<string> {
        return await this.getText(this.errorMessage);
    }
}
```

---

## Session Management & Test Isolation

### Critical Principle: Test Independence

**Each test MUST be able to run independently** - tests should not depend on cookies or session state from previous tests. This ensures:
- Tests can run in any order
- Tests can run in parallel
- Failed tests don't affect subsequent tests
- Tests are maintainable and debuggable

### Session Management Strategy

**Recommended Approach: Per-Test-Suite Login (Hybrid)**

Use per-test-suite login for MCQ/TEKS tests (performance), per-test login for auth/security tests (isolation):

```typescript
// Example: MCQ Tests - Login once per suite
describe('MCQ CRUD Tests', () => {
    let driver: WebDriver;
    
    beforeAll(async () => {
        // Login once for entire test suite
        driver = await DriverFactory.create('chrome');
        await driver.manage().deleteAllCookies();
        await driver.get(`${baseUrl}/login`);
        
        const loginPage = new LoginPage(driver);
        await loginPage.login(testUsername, testPassword);
        
        // Verify login successful
        await driver.wait(async () => {
            const url = await driver.getCurrentUrl();
            return url.includes('/mcqs');
        }, 10000);
    });
    
    afterAll(async () => {
        // Logout and cleanup
        try {
            const nav = new NavigationHeader(driver);
            await nav.logout();
        } finally {
            await driver.manage().deleteAllCookies();
            await driver.quit();
        }
    });
    
    test('should create MCQ', async () => {
        // Already authenticated - test MCQ creation
    });
});
```

### Recommended Strategy: Hybrid Approach

**Use per-test-class login for performance, but ensure isolation:**

1. **Per Test Suite Login** (`beforeAll`):
   - Login once per test suite (describe block)
   - Faster execution (fewer logins)
   - Use for: MCQ tests, TEKS tests (need authentication)

2. **Per Test Login** (`beforeEach`):
   - Fresh login for each test
   - Maximum isolation
   - Use for: Authentication tests (testing login itself), Security tests (testing session behavior)

3. **Cookie Clearing**:
   - Always clear cookies in `beforeEach` for authentication tests
   - Clear cookies in `afterEach` for all tests (defensive)

### Example: Authentication Tests (Per-Test Login)

```typescript
describe('Authentication Flow Tests', () => {
    let driver: WebDriver;
    let baseUrl: string;
    
    beforeEach(async () => {
        // Always start with clean state
        driver = await DriverFactory.create('chrome');
        baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        await driver.manage().deleteAllCookies();
        await driver.get(baseUrl);
    });
    
    afterEach(async () => {
        await driver.manage().deleteAllCookies();
        await driver.quit();
    });
    
    test('should register new user', async () => {
        // No existing session - testing registration
        const signupPage = new SignupPage(driver);
        await signupPage.navigateTo();
        // ... test implementation
    });
    
    test('should login with valid credentials', async () => {
        // No existing session - testing login
        const loginPage = new LoginPage(driver);
        await loginPage.navigateTo();
        // ... test implementation
    });
});
```

### Example: MCQ Tests (Per-Suite Login)

```typescript
describe('MCQ CRUD Tests', () => {
    let driver: WebDriver;
    let baseUrl: string;
    
    beforeAll(async () => {
        // Login once for all MCQ tests
        driver = await DriverFactory.create('chrome');
        baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        
        await driver.manage().deleteAllCookies();
        await driver.get(`${baseUrl}/login`);
        const loginPage = new LoginPage(driver);
        await loginPage.login(testUsername, testPassword);
        
        // Verify login successful
        await driver.wait(async () => {
            const url = await driver.getCurrentUrl();
            return url.includes('/mcqs');
        }, 10000);
    });
    
    afterAll(async () => {
        // Clean logout
        try {
            const nav = new NavigationHeader(driver);
            await nav.logout();
        } finally {
            await driver.manage().deleteAllCookies();
            await driver.quit();
        }
    });
    
    beforeEach(async () => {
        // Ensure we're on the right page
        // Clear any test-specific UI state
        await driver.get(`${baseUrl}/mcqs`);
    });
    
    afterEach(async () => {
        // Clean up test data (delete created MCQs via API or UI)
        // But keep session cookie for next test
    });
    
    test('should create MCQ', async () => {
        // Already authenticated - just test MCQ creation
        const createPage = new McqCreatePage(driver);
        // ... test implementation
    });
});
```

### Cookie Persistence Behavior

**Important**: In Selenium, cookies persist within the same WebDriver instance:

- ✅ **Same WebDriver instance**: Cookies persist across test methods
- ❌ **New WebDriver instance**: Cookies are cleared
- ✅ **Explicit cookie deletion**: `driver.manage().deleteAllCookies()` clears all cookies

**Therefore**:
- If using same WebDriver for multiple tests → cookies persist
- If using different WebDriver per test → cookies don't persist
- Always explicitly manage cookies for predictable behavior

### Test Data Isolation

**Each test should use unique test data**:

```typescript
describe('MCQ CRUD Tests', () => {
    function generateUniqueMcqTitle(): string {
        return `Test MCQ ${Date.now()}`;
    }
    
    test('should create MCQ', async () => {
        const uniqueTitle = generateUniqueMcqTitle();
        // Use unique title to avoid conflicts
    });
});
```

### Parallel Execution Considerations

If running tests in parallel:

- **Each worker gets its own WebDriver instance** → cookies don't leak between workers
- **Each worker should use unique test data** → avoid database conflicts
- **Use Jest `--maxWorkers=3` for parallel execution**

### Summary: Session Management Rules

1. ✅ **Authentication tests**: Fresh login per test (`beforeEach`)
2. ✅ **MCQ/TEKS tests**: Login once per test suite (`beforeAll`)
3. ✅ **Security tests**: Fresh login per test (`beforeEach`)
4. ✅ **Always clear cookies** in `beforeEach` for authentication tests
5. ✅ **Always clear cookies** in `afterEach` for defensive cleanup
6. ✅ **Use unique test data** to avoid conflicts
7. ✅ **Never assume** cookies from previous tests exist

---

## Test Execution Strategy

### Local Development

**From `tests/ui/` directory**:

```bash
# Run all tests
npm run test:selenium

# Run smoke tests only
npm run test:selenium:smoke

# Run in watch mode
npm run test:selenium:watch

# Run specific test file
npm run test:selenium -- auth-flow.test.ts

# Run with coverage
npm run test:selenium:coverage
```

**Note**: Application must be running (`npm run preview`) before executing UI tests. Each test manages its own session.

### CI/CD Pipeline (Jenkins)

- **Post-Deploy**: Run smoke tests (`jest --testNamePattern="Smoke"`)
- **Nightly**: Run full regression suite (`jest`)
- **Weekly**: Run security tests (`jest --testNamePattern="Security"`)
- **On-Demand**: Run accessibility tests (`jest --testNamePattern="Accessibility"`)

### Test Reports

- **Jest HTML Reporter**: HTML test execution reports
  - Location: `reports/html-reports/test-results.html`
- **Screenshots**: Captured on test failures (via Jest hooks)
  - Location: `reports/screenshots/`
- **Allure Reports**: Optional (if Allure Jest integration configured)
- **Accessibility Reports**: axe-core accessibility reports (Phase 4)

---

## Implementation Roadmap

### Phase 1: Setup & Authentication ✅ COMPLETE

- [x] Setup Selenium TypeScript project structure
- [x] Install dependencies (`selenium-webdriver`, `jest`, etc.)
- [x] Create base classes and utilities (BaseTest, DriverFactory, TestDataHelper)
- [x] Implement Page Objects for authentication (LoginPage, SignupPage, NavigationHeader)
- [x] Implement Phase 1 test scenarios (15+ tests)
- [x] Setup Jest HTML reporting
- [ ] Verify tests run locally (pending application verification)
- [ ] Configure Jenkins pipeline for UI tests

### Phase 2: MCQ CRUD ⏳ IN PROGRESS

- [ ] Implement Page Objects for MCQ pages (McqListingPage, McqCreatePage, etc.)
- [ ] Implement Phase 2 test scenarios
- [ ] Add test data management utilities
- [ ] Verify end-to-end MCQ workflows

### Phase 3: TEKS Generation ⏳ PLANNED

- [ ] Implement Page Objects for TEKS dialog
- [ ] Implement Phase 3 test scenarios
- [ ] Add error handling tests

### Phase 4: Security & Accessibility ⏳ PLANNED

- [ ] Integrate axe-core for accessibility testing
- [ ] Implement Phase 4 security tests
- [ ] Add browser security header checks
- [ ] Generate accessibility reports

---

## Success Criteria

- ✅ All smoke tests passing (< 5 minutes execution)
- ✅ All regression tests passing (< 30 minutes execution)
- ✅ Security tests validate OWASP client-side requirements
- ✅ Accessibility tests validate WCAG AA compliance
- ✅ Test reports generated and archived in CI/CD
- ✅ Screenshots captured on failures
- ✅ Tests maintainable via Page Object Model

---

## Notes

- **Test Data**: Use unique test data per test run to avoid conflicts
- **Parallel Execution**: Configure Jest for parallel test execution (`jest --maxWorkers=3`)
- **Browser Support**: Start with Chrome, expand to Firefox/Safari as needed
- **Headless Mode**: Use headless browsers in CI/CD for performance
- **Test Maintenance**: Update Page Objects when UI changes
- **Single Source of Truth**: This document (`docs/UI_TEST_PLAN.md`) is the authoritative reference for all UI test planning and implementation

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-15 | Initial draft |
| 1.1 | 2025-01-21 | Consolidated prerequisites, added Quick Start, updated Phase 1 status to complete |

---

**End of UI Test Plan**
