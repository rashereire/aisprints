**ARCHIVED**: This file is archived for historical reference only.  
All content has been incorporated into [TEST_PLAN.md](../../docs/TEST_PLAN.md).  
Do not update this file going forward.

---

# Postman Integration Tests

This directory contains Postman collections for integration testing of the QuizMaker API.

## Directory Structure

```
tests/postman/
├── collections/
│   ├── pre-build/          # Mocked tests that run before build
│   │   ├── api-contracts.json
│   │   ├── error-responses.json
│   │   └── input-validation.json
│   └── post-build/         # Real integration tests (to be implemented)
│       ├── auth.json
│       ├── mcq.json
│       ├── teks.json
│       └── security.json
└── environments/
    ├── dev.json
    ├── stage.json
    └── prod.json
```

## Pre-Build Integration Tests

These tests validate API contracts, schemas, and input validation **without** requiring a running application. They use mocked responses and run before the build process.

### Collections

1. **api-contracts.json** - Validates request/response schemas, HTTP methods, Content-Type headers
2. **error-responses.json** - Validates error response structures and HTTP status codes (OWASP ERR-001, ERR-004)
3. **input-validation.json** - Validates input length limits and special character handling (OWASP INPVAL-009, INPVAL-010)

### Running Pre-Build Tests

**Note**: Pre-build tests validate request schemas **without making HTTP requests**. Connection errors (`ECONNREFUSED`) are expected and normal - the tests validate schemas before the HTTP call fails.

#### Using Newman CLI

```bash
# Run all pre-build tests (recommended)
npm run test:integration:pre-build

# Run specific collection
newman run tests/postman/collections/pre-build/api-contracts.json \
  -e tests/postman/environments/dev.json \
  --reporters cli,junit \
  --reporter-junit-export test-results/postman/api-contracts.xml \
  --suppress-exit-code

# Run with HTML report
newman run tests/postman/collections/pre-build/api-contracts.json \
  -e tests/postman/environments/dev.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export reports/postman/api-contracts.html \
  --suppress-exit-code
```

**Important**: Use `--suppress-exit-code` flag to prevent test failures due to expected connection errors. The tests still validate request schemas successfully.

#### Using Postman App

1. Import collections into Postman:
   - File → Import → Select collection JSON files
2. Import environment:
   - File → Import → Select `environments/dev.json`
3. Select environment: "Development"
4. Run collections:
   - Click on collection → Run → Run collection

## Post-Build Integration Tests

These tests require a running application and real database. They validate end-to-end API functionality.

**Status**: ⏳ Planned - Not yet implemented

## Environment Variables

### Development (`dev.json`)

- `baseUrl`: `http://localhost:3000`
- `testUsername`: Test user username
- `testPassword`: Test user password
- `sessionToken`: Set automatically after login
- `testMcqId`: Set automatically after MCQ creation
- `testChoiceId`: Set automatically after MCQ creation
- `openaiApiKey`: OpenAI API key (for TEKS tests)

## CI/CD Integration

### Jenkins Pipeline

Pre-build tests run automatically in the Jenkins pipeline before the build stage:

```groovy
stage('Pre-Build Integration Tests') {
    steps {
        sh 'npm run test:integration:pre-build'
    }
    post {
        always {
            junit 'test-results/postman/**/*.xml'
            archiveArtifacts 'test-results/postman/**/*'
        }
    }
}
```

### Test Reports

- **JUnit XML**: `test-results/postman/*.xml` - For CI/CD integration
- **HTML Reports**: `reports/postman/*.html` - For local viewing

## Test Principles

Following [APITesting-Postman.mdc](../../.cursor/rules/APITesting-Postman.mdc) guidelines:

- ✅ APIs tested independently of UI
- ✅ Schema validation enforced
- ✅ Tests run via CI/CD
- ✅ OWASP security tests included
- ✅ JUnit XML reports for Jenkins integration

## OWASP Security Tests

Pre-build collections include OWASP WSTG v4.2 aligned tests:

- **ERR-001**: Generic error messages without internals
- **ERR-004**: Appropriate HTTP status codes
- **INPVAL-009**: Input length limits enforcement
- **INPVAL-010**: Special character handling

All security tests are marked with `🔒 OWASP` prefix in test names.
