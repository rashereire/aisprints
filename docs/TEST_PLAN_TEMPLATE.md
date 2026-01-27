# Test Plan Guidelines

## Purpose

This document provides universal, tool-agnostic guidelines for creating comprehensive test plans and implementing tests across all layers (unit, integration, UI). These principles apply regardless of the specific testing tools used.

---

## Quality Philosophy

- **Quality is a team responsibility** - Testing is not solely the QA team's job
- **Automation supports judgment, not replaces it** - Tests document system behavior and catch regressions
- **Tests document system behavior** - Well-written tests serve as executable documentation

---

## Test Pyramid Strategy

- **Unit tests** form the foundation (most tests, fastest execution)
- **Integration tests** validate component interactions (moderate number, moderate speed)
- **UI tests** validate end-to-end flows (fewest tests, slowest execution)
- **UI tests SHOULD be the smallest layer** - Focus on critical user journeys only

---

## Test Plan Creation Principles

### Planning and Prioritization

- **Define clear automation goals and test scope** - Know what you're testing and why
- **Automate high-value, repeatable scenarios first** - Focus on regression and smoke tests
- **Leave rarely-run or trivial tests manual** - Not everything needs automation
- **Map tests to requirements** - Ensure each test ties back to a specific user story or requirement

### Test Design Principles

- **Deterministic behavior** - Tests must produce consistent results
- **Independence of tests** - Each test should set up its own data/state and not depend on others
- **Focused tests** - Keep tests focused on one objective; avoid long end-to-end scripts
- **Clear ownership** - Know who maintains each test

### Modular and Reusable Design

- **Break tests into small, independent modules** - Use design patterns (e.g., Page Object Model for UI) to separate test logic from implementation details
- **Reuse common functionality** - Group related functions (e.g., login routines, form interactions) into reusable helpers or service classes
- **Use meaningful names** - Test names and methods should clearly describe what they verify

---

## Unit Test Rules

### Core Principles

- **Purpose**: Validate that code behaves correctly, not just to make the test pass
- **Isolation**: Each test runs in isolation without depending on other tests
- **No real dependencies**: Never hit real services, databases, or external dependencies in unit tests
- **Mock external dependencies**: Mock all external services, databases, and APIs
- **Reset state**: Reset mocks between tests to prevent test pollution

### Test Structure

- **Colocate tests**: Test files should be next to the files they test (e.g., `utils/format.test.ts` next to `utils/format.ts`)
- **Clear test names**: Test names should clearly describe what they are verifying
- **One assertion per concept**: Focus each test on verifying one behavior
- **No placeholder tests**: Do not write tests that assert `expect(true).toBe(true)` or equivalent

### Data Management

- **Use test fixtures**: Create helper functions to generate mock data structures
- **Test data transformation**: Verify data transformations (e.g., snake_case ↔ camelCase)
- **Test edge cases**: Empty results, null values, invalid inputs
- **Test error propagation**: Verify errors are thrown correctly

---

## Integration Test Rules

### Core Principles

- **Purpose**: Validate component interactions and API contracts
- **Test real integrations**: Use real databases, services, and APIs (in test environments)
- **Environment isolation**: Each test environment must be isolated and independent
- **Clean state**: Reset or clean up test data after execution to ensure each run starts fresh

### API Testing Best Practices

- **Clear scenarios**: Define what each API test should validate (status codes, response schemas, data)
- **Positive and negative paths**: Test both "happy path" cases and edge/failure scenarios
- **Error handling**: Verify error handling and status codes (e.g., 400/500 responses)
- **Schema validation**: Validate responses against JSON schemas or contracts to detect breaking changes
- **Authentication handling**: Automate token management and store secrets securely (environment variables or vault)

### Data Management

- **Data-driven testing**: Store test data externally (CSV, JSON, DB) instead of hardcoding
- **Unique test data**: Use unique or mock data to avoid collisions
- **Cleanup**: Delete created resources (users, records) after execution
- **No shared mutable data**: Avoid shared state between tests

### Environment Configuration

- **Environment variables**: Use environment variables to handle different contexts (dev/stage/prod)
- **Secrets management**: Secrets MUST be managed externally, never hardcoded
- **Environment isolation**: Each environment must be isolated and independent

---

## UI Test Rules

### Core Principles

- **Purpose**: Validate end-to-end user workflows and critical user journeys
- **Focus on critical flows**: Automate only high-value user journeys
- **Deterministic behavior**: Tests must produce consistent results
- **Clean state**: Reset application state between tests (log out, clear cache/cookies)

### Test Design

- **Page Object Model (POM)**: Encapsulate page elements and actions in page classes to separate UI locators from test logic
- **Maintainable locators**: Use stable, descriptive locators for UI elements
  - Preferred order: `data-testid` > stable `id` > accessible attributes > CSS > XPath (last resort)
- **Explicit waits**: Use explicit waits (e.g., WebDriverWait for element visibility) instead of fixed sleeps
- **Avoid brittle selectors**: Avoid brittle XPaths or IDs that change frequently

### Execution Strategy

- **Headless mode**: Run in headless mode for CI to speed up non-UI validations
- **Parallel execution**: Design tests to run in parallel to reduce execution time
- **Cross-browser testing**: Verify key flows on all supported browsers/versions
- **Tagging and grouping**: Label tests (e.g., smoke, regression, sanity) so subsets can be run selectively

### Reporting and Debugging

- **Screenshots on failure**: Capture screenshots or videos on failures
- **Detailed logging**: Instrument tests with detailed logs
- **Actionable failures**: Failures MUST be actionable with clear error messages

---

## General Best Practices

### CI/CD Integration

- **Version control**: Keep all test code under source control
- **CI integration**: Integrate tests with CI/CD so tests run on every build
- **Fail fast**: Automated builds should trigger tests, and failures should generate alerts
- **Headless execution**: Tests MUST run headless in CI
- **Local mirrors CI**: Local execution should mirror CI environment

### Data Management

- **No shared mutable data**: Avoid shared state between tests
- **Environment isolation**: Environment isolation is mandatory
- **Secrets management**: Secrets MUST be managed externally
- **Test data cleanup**: Reset or clean up test data after execution

### Reporting and Visibility

- **Failures MUST be actionable**: Error messages should clearly indicate what failed and why
- **Evidence MUST be attached**: Screenshots, logs, and request/response data should be captured
- **Results MUST be visible**: Test results should be visible to stakeholders
- **Detailed logging**: Enable detailed logging of requests, responses, and actions

### Maintainability

- **Tests are production code**: Apply the same quality standards to test code
- **Refactoring is expected**: Update tests when implementation changes
- **Dead tests MUST be deleted**: Remove duplicate or obsolete tests regularly
- **Review and prune**: Regularly review the suite to remove duplicate or obsolete tests

### Governance

- **Standards are enforced**: Follow established testing patterns and conventions
- **Deviations require approval**: Document and justify any deviations from standards
- **Flaky tests are defects**: Flaky tests SHOULD be fixed or removed immediately

---

## Behavior-Driven Development (BDD)

### Principles

- **Early scenario definition**: Write Gherkin scenarios as soon as requirements are clear
- **Business-readable language**: Write scenarios in declarative, business-readable style (Given/When/Then)
- **Clear structure**: Organize feature files by functionality
- **Reusable steps**: Reuse step definition code wherever possible

### Best Practices

- **Feature and scenario structure**: Use Background steps for common preconditions to avoid repetition
- **Focused scenarios**: Keep each scenario focused on one behavior
- **Data tables**: Use data tables or scenario outlines for varying inputs
- **Tags for organization**: Use tags to categorize BDD scenarios (e.g., @smoke, @regression)
- **Mapping to requirements**: Ensure each scenario ties back to a specific user story or requirement

---

## Tool-Specific Sections

> **Note**: The following sections contain tool-specific guidance for Postman and Selenium. These will be moved to separate `.mdc` files in the future, but are retained here for reference.

### Postman-Specific Guidelines

- **Collections and reuse**: Organize API tests into logical collections per feature or service
- **Mock servers**: Use mock servers or simulators if dependent services aren't ready
- **Newman CLI**: Execute Postman collections via Newman (CLI) in the CI pipeline
- **Shared workspaces**: Keep API tests and documentation in shared team workspaces
- **Data files**: Use Data Files or collection variables for parameterization

### Selenium-Specific Guidelines

- **Preferred stack**: TypeScript + Jest, Selenium WebDriver, npm + Jenkins, Page Object Model, Jest HTML Reporter (or Allure)
- **Project structure**: Organize tests into `tests/ui/src/` with `base`, `pages`, and `tests` subdirectories
- **Accessibility**: Use axe-core for accessibility testing
- **Continuous execution**: Trigger Selenium tests automatically on commits or nightly builds via Jenkins

---

## Summary Checklist

When creating a test plan, ensure:

- [ ] Test pyramid strategy is defined (unit > integration > UI)
- [ ] High-value scenarios are prioritized for automation
- [ ] Tests are independent and can run in isolation
- [ ] Test data is managed externally and cleaned up after execution
- [ ] Environment isolation is configured
- [ ] CI/CD integration is planned
- [ ] Reporting and logging strategy is defined
- [ ] Tests are mapped to requirements/user stories
- [ ] Tool-specific guidelines are documented (if applicable)

# Test Definition of Done (DoD)

A test effort is considered **done** when all of the following criteria are met:

### 1. Requirements & Intent
- Every requirement has documented **quality questions**.
- **Business intent** and **user impact** are explicit for each test.
- **Success and failure conditions** are clearly defined.

### 2. Risk-Based Coverage
- **High-risk paths** have strong coverage with multiple layers if needed.
- **Medium-risk paths** have intentional, sufficient coverage.
- **Low-risk gaps** are documented and accepted.
- No **high-impact risks** remain unexplained.

### 3. Test Quality
- Each test validates **one clear behavior or risk**.
- **Success and failure criteria** (oracles) are explicit and stable.
- Tests fail for **one clear reason** only.

### 4. Architecture & Maintainability
- Tests follow agreed **guardrails and standards**.
- **Data strategies** are intentional and consistent.
- No **unnecessary duplication** across test layers.

### 5. Confidence Check
- No important **quality questions remain unanswered**.
- Remaining **gaps are explicitly acknowledged and accepted**.
- The suite **increases confidence**, not noise.

