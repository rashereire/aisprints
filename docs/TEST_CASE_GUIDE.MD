# TESTING_GUIDE.md

---
title: Project Testing Guide
version: 0.1
last_updated: 2026-01-22
tiers: [required, recommended]
---

# Purpose & Scope
This guide defines conventions, structure, and strategies for AI-assisted test automation. It applies to Unit, Integration, and UI tests. It is intended to be referenced by both engineers and LLMs when generating or maintaining test cases.

# How the LLM should use this doc
- Map requirements to risk levels and test types.
- Generate test skeletons with metadata headers.
- Obey `REQUIRED` rules; suggest exceptions for `RECOMMENDED` rules with justification.
- Include explicit assumptions and success/failure criteria.

# Rule Tiers
- **REQUIRED**: Must follow; violations require human-approved exceptions.
- **RECOMMENDED**: Should follow unless justified; LLM can propose exceptions.

# Global Conventions
- Folder structure: Unit tests colocated with source files; Integration tests in `/tests/integration/`; UI tests in `/tests/ui/` with feature-based subfolders.
- File naming: Use meaningful, descriptive names (e.g., `auth-service.test.ts`, `password.test.ts`). Test files should be colocated next to the files they test.
- Header metadata: `@type`, `@module`, `@risk`, `@requirement`, `@assumptions`, `@success_criteria`, `@tags`
- Tagging: `@unit`, `@integration`, `@ui`; risk: `low`, `medium`, `high`

# Unit Tests
**Folder:** Colocate test files next to the files they test (e.g., `utils/format.test.ts` next to `utils/format.ts`)  `REQUIRED`
**Naming:** `Method_Scenario_ExpectedResult` or `should_<doX>_when_<condition>`; file names should be meaningful and descriptive (e.g., `auth-service.test.ts`)  
**Rules:**
- Isolation: fully isolate; use mocks/stubs.  `REQUIRED`
- Data: use factories/builders; no network or DB.  `REQUIRED`
- Assertion: assert observable output, not internal state.  `REQUIRED`
- Test size: small, single-behavior per test.  `RECOMMENDED`
- Exclusions: do not test integration or UI behavior.  `REQUIRED`

# Integration Tests
**Folder:** `/tests/integration/<feature>/` or tool-specific locations (e.g., `/tests/postman/collections/post-build/` for Postman collections)  
**Naming:** Use meaningful, descriptive names that clearly indicate the feature and test type (e.g., "Post-Build Auth Integration Tests", "MCQ CRUD Integration Tests")  
**Rules:**
- Scope: test interactions between two or more components.  `REQUIRED`
- Environment: use staging or controlled; virtualize external services.  `RECOMMENDED`
- Data: seed disposable test data; cleanup after test.  `REQUIRED`
- Assertions: end-to-end outcomes, not internal logic.  `RECOMMENDED`
- Isolation: be explicit about mocks vs real components.  `REQUIRED`
- Exclusions: avoid re-testing UI rendering or unit logic.  `REQUIRED`

# UI Tests
**Folder:** `/tests/ui/`  
**Naming:** `should_<user_journey>_when_<scenario>`  
**Rules:**
- Locator strategy: stable IDs/data-qa; fallback documented.  `REQUIRED`
- Data: seeded test users/accounts; reset state; no production data.  `REQUIRED`
- Assertions: behavioral outcomes, not internal DOM state.  `REQUIRED`
- Isolation: manage flakiness, use retries sparingly, capture logs/screenshots.  `RECOMMENDED`
- Exclusions: do not assert low-level logic; handled in unit/integration.  `REQUIRED`

# Establish Test Guardrails Upfront
- Define structure, conventions, and data strategies before automation.  `REQUIRED`
- Explicitly state exclusions per test type.  `REQUIRED`
- Use micro-sprint planning to enforce guardrails incrementally.  `RECOMMENDED`

# Example Test Header
```yaml
# ---
# test_type: unit
# module: payments
# risk: high
# requirement: REQ-1234
# assumptions:
#   - payment service available
# success_criteria: Payment record created in DB and receipt emailed
# tags: [payments, critical]
# ---
```
# LLM Guide — Generate UI Test Cases

> A practical, step‑by‑step recipe for an LLM to read requirements and produce human‑readable UI test cases (user‑perspective), split into **General UI Functionality** and **Critical Workflows (End‑to‑End / Smoke)**.

---

## Goals of this guide

1. Give an LLM a clear algorithm to review requirements, acceptance criteria, and designs, then produce a prioritized list of test cases written **from an end‑user perspective**.  
2. Ensure each test case contains precise **preconditions**, **data/environment assumptions**, **step‑by‑step actions**, **expected result(s)**, and **clear pass/fail criteria** (including examples of historical failures where useful).  
3. Separate test cases into two buckets: **General UI Functionality** (visual/interaction checks across browsers) and **Critical Workflows** (core business end‑to‑end scenarios that form the smoke suite).

---

## High‑level workflow (what the LLM must do)

1. **Ingest inputs**: requirements, user stories, acceptance criteria, designs (images/wireframes), API contracts, and any known non‑functional constraints (browsers, screen sizes, localization rules).  
2. **Normalize language**: extract actors (user roles), user goals, preconditions, success criteria, and invariants (things that must never change).  
3. **Map acceptance criteria → test objectives**: convert each acceptance criterion into one or more measurable test objectives. If acceptance criteria are missing or ambiguous, flag the specific gaps (don’t invent missing business rules).  
4. **Generate scenarios**: for each objective, produce: positive/«happy path» scenario(s), negative/error path(s), and at least one edge/limit case where applicable.  
5. **Annotate each scenario** with: priority (smoke/critical, high/medium/low), cross‑browser requirement, expected performance thresholds (if given), and automation feasibility notes.  
6. **Group and dedupe**: merge scenarios that duplicate coverage; cluster similar UI checks to avoid noisy duplicates across pages.  
7. **Output**: a human‑readable test case list and a compact machine‑friendly format (JSON or Gherkin) suitable for quick automation conversion.

---

## Test case template (required fields)

Each generated test case must include the following fields and be written in plain language a non‑technical product manager or tester can read and understand.

- **Test Case ID**: `TC-{feature}-{sequential}` (e.g., `TC-Login-001`)  
- **Title (user perspective)**: short sentence describing what the user is doing (e.g., "User logs in with valid credentials").  
- **Type**: `General UI` or `Critical Workflow`  
- **Priority/Tag**: e.g., `smoke`, `regression`, `sanity`, `visual`, `accessibility`  
- **Related requirement / acceptance criterion**: copy or reference the exact acceptance criterion text that this test covers.  
- **Preconditions / Setup**: exactly what state or data must exist before the test runs (accounts, feature flags, environment, cookies/cache state). Be explicit: include API calls, database fixtures, and the exact account role (e.g., `user@example.com, role=standard`) if relevant.  
- **Test data**: sample values or a pointer to fixtures (e.g., `user: user+ui1@example.com, pass: Password1!`).  
- **Steps (end‑user language)**: numbered steps describing what the user does, written as actions (clicks, types, selects), not implementation details. Keep them deterministic.  
- **Expected result(s)**: exact, testable outcomes after each step or at the end of the flow (UI text, element visibility, navigation, server response code if relevant).  
- **Pass/Fail criteria (explicit)**: concrete rules where test is considered failed (e.g., "Fail if confirmation message does not contain reference number or if status code ≠ 200"). Include tolerance for minor rendering differences only when acceptable.  
- **Known/Example failure modes**: historical or likely failures tied to this object (e.g., "form submission silently fails with no message", "button is off‑screen on 320px width").  
- **Cross‑browser / platform notes**: browsers and devices where this must run (e.g., Chrome Win, Safari iOS 16, Firefox Linux).  
- **Accessibility checks**: any A11y expectations (focus order, aria attributes, keyboard operability).  
- **Automation notes**: stable locators to use (`data-testid`, `id`, accessible names), suggested retry/wait strategy, and whether to run headless or with headed browser for visual debugging.  
- **Maintenance guidance**: how often to run (on PR, nightly), who owns it, and any flaky flags.

---

## How to review requirements (LLM checklist)

For each requirement or user story, the LLM should run the following checklist and either produce tests or produce a short list of clarification requests:

1. **Does the story include acceptance criteria?** If yes → proceed. If no → emit a minimal set of candidate acceptance criteria and label them `needs-clarification`.  
2. **Actors & roles identified?** List user roles affected.  
3. **Happy path defined?** If not, synthesize the most-likely happy path and label as `assumption` with the explicit text of the assumption.  
4. **Error states defined?** If not, enumerate plausible error states (validation errors, server errors, network timeouts).  
5. **Data dependencies enumerated?** For each dependency (external service, payment gateway), create a test double strategy (mock, contract test, sandbox).  
6. **UI expectations present?** If designs exist, extract pixel‑agnostic expectations (layout order, required fields, labels, messages).  
7. **Non‑functional constraints captured?** (performance thresholds, browser support, localization).  

> **Important**: when the LLM synthesizes anything (assumptions, missing acceptance criteria), it must highlight those items as `ASSUMPTION` so a human can validate them easily.

---

## Producing General UI Functionality tests

These are tests that verify component behavior, rendering, and interactions across supported browsers. Guidelines:

- Write from the user's perspective and keep each test focused on a single UI control or small set of related controls (e.g., a form or a modal).  
- Include a visual/UX expectation: placement, label, truncated text rules, responsive breakpoint behavior.  
- Use deterministic checks for UI state (isVisible, hasText, isEnabled) rather than pixel matching. Reserve pixel‑diff visual tests for approved screens only (e.g., homepage hero).  
- Include accessibility checks where applicable.  

**Examples of General UI tests the LLM should output** (the full examples are in the canvas document):

- Verify required+optional field markers and inline validation for the checkout address form.  
- Verify table column resize and sort persistence for an account list.  

---

## Producing Critical Workflow (End‑to‑End) tests

Critical workflows are business priorities (signup + purchase, submit claim, publish content). They should be written as complete outcomes rather than component checks: "Given X, when Y, then Z (user achieves outcome)."

Guidelines:

- Keep them robust: prefer asserting final outcomes (order recorded with ID + confirmation) over intermediate UI states unless intermediate states are business‑critical.  
- Minimize brittle assertions: avoid checking temporary messages that are UI‑specific unless they are part of the acceptance criteria.  
- Make data cleanup explicit: the test must either use disposable test accounts or include teardown steps that remove created artifacts.  

**Examples of Critical Workflow tests the LLM should output** (the full examples are in the canvas document):

- End‑to‑end order placement: from product selection → checkout → payment (sandbox) → order confirmation + DB row exists.  
- Password reset: request reset → receive token via test email endpoint → set new password → login with new password.

---

## Fail criteria — concrete examples the LLM must include

Every test must include specific fail criteria. Examples the LLM should add when relevant:

- "Fail if the server returns an HTTP 5xx for any API call that the UI requires to complete the action."  
- "Fail if a success confirmation is not displayed within X seconds (where X is an agreed acceptable limit)."  
- "Fail if text content differs from agreed message catalog entry by more than the allowed variance (e.g., variable tokens are permitted, but core sentence must match)."  
- "Fail if required field does not show inline validation on blur or submit."  

---

## Data‑environment and test data guidelines (assumptions)

- Prefer dedicated test accounts and isolated test tenants.  
- State exact fixture creation commands or API calls where possible; prefer idempotent setup so tests can run in parallel.  
- When relying on third‑party sandboxes, assert that sandbox is available and otherwise fall back to mocks.  
- If tests require precise dates/times, always use a fixed timezone and clock‑freeze strategy in the test environment.

---

## Automation considerations (for the automation engineer)

- **Selectors**: recommend `data-testid` or stable `id` first, then accessible names; avoid brittle XPaths.  
- **Waits**: prefer explicit waits for element states (visible, clickable) and API responses over arbitrary sleeps.  
- **Parallelization**: ensure tests are isolated (unique test data) and use independent fixtures.  
- **Screenshots**: capture on failure and attach DOM snapshot where feasible.  
- **Retry policy**: only for flakiness known and documented; otherwise fix the root cause.  

---

## Prompt templates the LLM should use (examples)

1. **Short prompt to generate test cases from a user story**

```
Input: [User story text]
Designs: [URL or description]
Acceptance criteria: [list]
Browsers: [list]
Output format: JSON array of test cases with fields (ID, Title, Type, Priority, Preconditions, Steps, ExpectedResults, FailCriteria, Selectors, Tags)

Produce: 1) A prioritized list of test cases (brief). 2) For each test case, full human‑readable description using the test case template.
```

2. **Full prompt for a feature that spans pages (E2E)**

```
You are a QA engineer. Read the following feature description + acceptance criteria. Generate 8 candidate test cases, mark 3 as smoke. For each smoke test, provide: Test Case ID, Title (user perspective), Preconditions, Test Data, Steps, Expected Results, Pass/Fail criteria, and Automation notes (preferred locators). Any assumptions you made — mark them ASSUMPTION.
```

---

## Prioritization rules (how LLM chooses smoke vs general)

- Mark `smoke` if the scenario: 1) delivers critical business value (purchase, signup, payment), 2) is a dependency for many other features (auth), or 3) was recently flaky in production.  
- Mark `visual` if the check is rendering/branding critical (landing page hero, marketing banner) and must be validated across viewports.  

---

## Maintenance & versioning guidance

- Include a `lastReviewedDate` and a `source` pointer for every test case pointing to the original requirement or design.  
- When requirements change, update the test case `changeLog` with: `what changed`, `who approved`, and `date`.  
- For tests generated by LLMs, include a `confidence` score (low/medium/high) and a short human verification checklist for a reviewer.

---

## Deliverables the LLM should produce

1. Compact prioritized list (CSV/CSV‑like) of test case IDs + short titles + tags.  
2. Full human‑readable test cases in the template above (MD or JSON).  
3. A separate automated‑friendly export (Gherkin, Playwright snippets, or JSON) for quick automation kick‑off.  
4. A short `ASSUMPTIONS` section listing anything the LLM invented.

---

## Quick heuristics & reminders for the LLM

- Always prefer clarity over cleverness.  
- Don’t invent unknown business rules; mark them ASSUMPTION.  
- Keep steps deterministic and idempotent.  
- Include explicit teardown instructions for tests that create persistent data.  

---

## Appendix: short examples

> See the included example test cases for both a General UI test and a Critical Workflow test in the examples section below. (These are written in the same template.)


*End of document.*


# Quality Checks & CI Signals
- Group tests by type and risk.
- Define time budgets per test type.
- Quarantine flaky tests; triage root causes.

# Change Management
- Update this doc when patterns change; version and approve required rule changes.
- Document exceptions explicitly for both REQUIRED and RECOMMENDED rules.

# Appendix: Glossary & References
- Oracle → success/failure criteria.
- References: Microsoft, IBM, Selenium, Cypress, Testing Best Practices Guides.

