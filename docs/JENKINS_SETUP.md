# Jenkins Setup and Configuration Guide

**Last Updated**: 2025-01-13  
**Status**: Active

---

## Overview

This guide covers setting up Jenkins for automated builds, testing, and deployment of the QuizMaker application. Jenkins is used for:

- **Unit Test Execution** (Vitest)
- **Application Build** (Next.js + OpenNext)
- **Integration Test Execution** (Postman/Newman) - optional
- **Deployment to Cloudflare Workers** - optional
- **UI Test Execution** (Selenium) - separate pipeline

---

## Prerequisites

### Jenkins Installation

1. **Install Jenkins** on your local machine:
   - Download from: https://www.jenkins.io/download/
   - Follow installation instructions for your OS
   - Start Jenkins service

2. **Access Jenkins**:
   - Open browser to `http://localhost:8080`
   - Complete initial setup wizard
   - Install suggested plugins

### Required Jenkins Plugins

Install the following plugins via **Manage Jenkins → Manage Plugins**:

- **NodeJS Plugin** (`nodejs`) - For Node.js support
- **JUnit Plugin** (`junit`) - For test result reporting
- **Git Plugin** (`git`) - For Git integration
- **Pipeline Plugin** (`workflow-aggregator`) - For pipeline support
- **HTML Publisher Plugin** (`htmlpublisher`) - For test report publishing (optional)

### System Requirements

- **Node.js**: Version 20+ (configured via NodeJS Plugin)
- **npm**: Comes with Node.js
- **Wrangler CLI**: For Cloudflare deployment (can be installed via npm)
- **Newman CLI**: For Postman integration tests (can be installed via npm)
- **Git**: For source control

---

## Jenkins Job Configuration

### Step 1: Create Pipeline Job

1. **Create New Item**:
   - Click "New Item" in Jenkins dashboard
   - Enter job name: `quizmaker-pipeline`
   - Select "Pipeline" as job type
   - Click "OK"

2. **Configure Pipeline**:
   - **Pipeline Definition**: Select "Pipeline script from SCM"
   - **SCM**: Select "Git"
   - **Repository URL**: `https://github.com/rashereire/aisprints.git`
   - **Credentials**: Add if repository is private
   - **Branches to build**: `*/main` or `*/feature/*` (as needed)
   - **Script Path**: `Jenkinsfile` (default)
   - Click "Save"

### Step 2: Configure Node.js

1. **Install Node.js Plugin** (if not already installed):
   - Manage Jenkins → Manage Plugins → Available
   - Search "NodeJS Plugin"
   - Install and restart Jenkins

2. **Configure Node.js Installation**:
   - Manage Jenkins → Global Tool Configuration
   - Find "NodeJS" section
   - Click "Add NodeJS"
   - Name: `NodeJS-20`
   - Version: Select Node.js 20.x
   - Click "Save"

### Step 3: Configure Cloudflare Credentials (Optional)

If deploying to Cloudflare Workers:

1. **Authenticate Wrangler**:
   ```bash
   # On Jenkins agent machine
   wrangler login
   ```

2. **Verify Authentication**:
   ```bash
   wrangler whoami
   ```

3. **Set Cloudflare Secrets** (if needed):
   ```bash
   wrangler secret put OPENAI_API_KEY
   # Enter secret when prompted
   ```

---

## Pipeline Parameters

The Jenkins pipeline supports the following parameters:

### Environment Selection
- **ENVIRONMENT**: `dev`, `stage`, or `prod`
- Default: `dev`

### Test Execution
- **RUN_INTEGRATION_TESTS**: Enable Postman integration tests
- Default: `false`
- **SKIP_UNIT_TESTS**: Skip unit tests (not recommended)
- Default: `false`

### Deployment
- **DEPLOY_TO_CLOUDFLARE**: Deploy to Cloudflare Workers after build
- Default: `false`

### Branch Selection
- **BRANCH**: Git branch to build
- Default: `main`

---

## Running the Pipeline

### Manual Execution

1. **Open Pipeline Job**:
   - Navigate to `quizmaker-pipeline` job
   - Click "Build with Parameters"
   - Select parameters:
     - Environment: `dev`
     - Run Integration Tests: `false` (unless app is running)
     - Deploy to Cloudflare: `false` (for test runs)
     - Skip Unit Tests: `false`
     - Branch: `main`
   - Click "Build"

2. **Monitor Execution**:
   - Click on build number in "Build History"
   - View "Console Output" for real-time logs
   - Check "Test Results" after completion

### Scheduled Execution

1. **Configure Schedule**:
   - Open pipeline job configuration
   - Scroll to "Build Triggers"
   - Check "Build periodically"
   - Enter cron expression:
     - **Daily at 2 AM**: `H 2 * * *`
     - **Every 6 hours**: `H */6 * * *`
     - **Every Monday at 9 AM**: `H 9 * * 1`
   - Click "Save"

2. **Cron Expression Examples**:
   ```
   H 2 * * *        # Daily at 2 AM
   H */6 * * *      # Every 6 hours
   H 9 * * 1        # Every Monday at 9 AM
   H 0 * * 0        # Every Sunday at midnight
   H 2 * * 1-5      # Weekdays at 2 AM
   ```

### Trigger on Git Push (Optional)

1. **Configure Webhook** (if using GitHub):
   - GitHub repository → Settings → Webhooks
   - Add webhook:
     - Payload URL: `http://your-jenkins-url/github-webhook/`
     - Content type: `application/json`
     - Events: `Just the push event`
   - Click "Add webhook"

2. **Configure Jenkins**:
   - Pipeline job → Configure
   - Build Triggers → Check "GitHub hook trigger for GITScm polling"
   - Click "Save"

---

## Pipeline Stages

### 1. Checkout
- Checks out code from Git repository
- Displays git commit and branch information

### 2. Setup
- Sets up Node.js environment
- Creates test results directories
- Installs npm dependencies (`npm ci`)

### 3. Lint
- Runs ESLint
- Does not fail build on warnings

### 4. Unit Tests
- Runs Vitest unit tests
- Generates JUnit XML report for Jenkins
- Archives test results
- **Blocks build on failure** (unless skipped)

### 5. Build
- Builds Next.js application (`npm run build`)
- Builds OpenNext bundle (`npm run opennext-build`)
- Archives build artifacts

### 6. Integration Tests (Optional)
- Runs Postman collections via Newman
- Requires running application instance
- Generates JUnit XML reports
- Archives test results

### 7. Deploy to Cloudflare (Optional)
- Verifies Wrangler CLI installation
- Verifies Cloudflare authentication
- Deploys to Cloudflare Workers (`npm run deploy`)
- Archives deployment artifacts

---

## Test Reports

### Unit Test Reports

**Location**: `test-results/unit-tests-output.txt`  
**View**: Jenkins → Build → Console Output or Artifacts  
**Format**: Console output (text)

**Optional JUnit XML Reports**:
To generate JUnit XML reports for better Jenkins integration:

1. **Install JUnit Reporter** (optional):
   ```bash
   npm install --save-dev vitest-junit-reporter
   ```

2. **Update `vitest.config.ts`**:
   ```typescript
   import { defineConfig } from 'vitest/config';
   
   export default defineConfig({
     test: {
       reporters: ['default', 'junit'],
       outputFile: {
         junit: 'test-results/unit-tests.xml'
       }
     }
   });
   ```

3. **Update Jenkinsfile** (if using JUnit reporter):
   ```groovy
   junit testResultsPattern: 'test-results/unit-tests.xml', allowEmptyResults: true
   ```

**Metrics** (from console output):
- Total tests executed
- Pass/fail counts
- Test execution time
- Individual test results

### Integration Test Reports

**Location**: `test-results/integration-*.xml`  
**View**: Jenkins → Build → Test Results  
**Format**: JUnit XML (via Newman)

**Metrics**:
- Request/response details
- Assertion results
- Execution time per request
- Pass/fail summary

### Build Artifacts

**Archived**:
- `.next/` - Next.js build output
- `.open-next/` - OpenNext bundle
- `test-results/` - Test result files
- `coverage/` - Code coverage reports (if generated)

**Access**: Jenkins → Build → Artifacts

---

## Troubleshooting

### Issue: Node.js Not Found

**Error**: `node: command not found`

**Solution**:
1. Install NodeJS Plugin
2. Configure Node.js in Global Tool Configuration
3. Ensure Node.js version is set in pipeline environment

### Issue: Wrangler Not Authenticated

**Error**: `Error: Not authenticated with Cloudflare`

**Solution**:
1. SSH into Jenkins agent machine
2. Run `wrangler login`
3. Verify with `wrangler whoami`

### Issue: Integration Tests Fail

**Error**: `Connection refused` or `ECONNREFUSED`

**Solution**:
1. Ensure application is running before running integration tests
2. Verify `baseUrl` in Postman environment matches running application
3. Check firewall rules if Jenkins agent is remote

### Issue: Build Fails on Unit Tests

**Error**: Tests failing in Jenkins but passing locally

**Solution**:
1. Check Node.js version matches local environment
2. Verify `npm ci` installs dependencies correctly
3. Check for environment-specific issues (file paths, permissions)
4. Review test output in Jenkins console

### Issue: Deployment Fails

**Error**: `Deployment failed` or Cloudflare API errors

**Solution**:
1. Verify Wrangler authentication: `wrangler whoami`
2. Check Cloudflare account permissions
3. Verify `wrangler.jsonc` configuration
4. Check Cloudflare API status
5. Review deployment logs in Jenkins console

---

## Best Practices

### 1. Test Before Deploy

Always run unit tests before deploying:
- Set `SKIP_UNIT_TESTS` to `false`
- Review test results before enabling deployment

### 2. Use Parameters

Use pipeline parameters for flexibility:
- Test-only runs: `DEPLOY_TO_CLOUDFLARE = false`
- Full pipeline: Enable all parameters as needed

### 3. Monitor Builds

- Set up email notifications for build failures
- Review test results regularly
- Monitor build execution time

### 4. Keep Secrets Secure

- Never commit secrets to repository
- Use Jenkins Credentials for sensitive data
- Use Cloudflare secrets for production API keys

### 5. Schedule Wisely

- Run full test suite nightly
- Run smoke tests on every commit
- Run deployment tests before releases

---

## Advanced Configuration

### Email Notifications

1. **Install Email Extension Plugin**:
   - Manage Jenkins → Manage Plugins
   - Install "Email Extension Plugin"

2. **Configure SMTP**:
   - Manage Jenkins → Configure System
   - Find "Extended E-mail Notification"
   - Configure SMTP server settings

3. **Add to Pipeline**:
   ```groovy
   post {
       failure {
           emailext (
               subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
               body: "Build failed. Check console output: ${env.BUILD_URL}",
               to: "team@example.com"
           )
       }
   }
   ```

### Slack Notifications

1. **Install Slack Plugin**:
   - Manage Jenkins → Manage Plugins
   - Install "Slack Notification Plugin"

2. **Configure Slack**:
   - Manage Jenkins → Configure System
   - Find "Slack"
   - Configure workspace and credentials

3. **Add to Pipeline**:
   ```groovy
   post {
       success {
           slackSend(
               channel: '#dev-team',
               color: 'good',
               message: "Build succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
           )
       }
   }
   ```

### Parallel Test Execution

To run tests in parallel:

```groovy
stage('Unit Tests') {
    parallel {
        stage('Auth Tests') {
            steps {
                sh 'npm run test:run -- src/lib/services/auth-service.test.ts'
            }
        }
        stage('MCQ Tests') {
            steps {
                sh 'npm run test:run -- src/lib/services/mcq-service.test.ts'
            }
        }
    }
}
```

---

## UI Test Pipeline (Separate Job)

For Selenium UI tests, create a separate Jenkins job:

1. **Create New Job**: `quizmaker-ui-tests`
2. **Configure**: Similar to main pipeline but focused on UI tests
3. **Trigger**: Post-deployment or scheduled
4. **See**: `docs/TEST_PLAN.md` for UI test setup details

---

## References

- **Jenkins Pipeline Documentation**: https://www.jenkins.io/doc/book/pipeline/
- **NodeJS Plugin**: https://plugins.jenkins.io/nodejs/
- **JUnit Plugin**: https://plugins.jenkins.io/junit/
- **Test Plan**: `docs/TEST_PLAN.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`

---

## Support

For issues or questions:
1. Check Jenkins console output
2. Review test plan documentation
3. Check Cloudflare deployment guide
4. Review pipeline logs in Jenkins

---

**End of Jenkins Setup Guide**
