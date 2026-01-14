/**
 * Jenkins Pipeline for QuizMaker Application
 * 
 * This pipeline handles:
 * - Unit test execution (Vitest)
 * - Application build (Next.js + OpenNext)
 * - Integration test execution (Postman/Newman) - optional
 * - Deployment to Cloudflare Workers - optional
 * - Test report generation and archiving
 * 
 * Usage:
 * - Run manually: Jenkins UI → Build with Parameters
 * - Schedule: Configure in Jenkins job settings (Build Triggers → Build periodically)
 * - Example schedule: H 2 * * * (runs daily at 2 AM)
 * 
 * Prerequisites:
 * - Node.js installed on Jenkins agent (configure via NodeJS Plugin)
 * - Wrangler CLI installed globally or via npm
 * - Cloudflare credentials configured (wrangler login)
 * - Newman CLI installed (for integration tests) - optional
 */

pipeline {
    agent any

    // Pipeline parameters for flexible execution
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'stage', 'prod'],
            description: 'Target deployment environment'
        )
        booleanParam(
            name: 'RUN_INTEGRATION_TESTS',
            defaultValue: false,
            description: 'Run Postman integration tests (requires running application)'
        )
        booleanParam(
            name: 'DEPLOY_TO_CLOUDFLARE',
            defaultValue: false,
            description: 'Deploy to Cloudflare Workers after successful build'
        )
        booleanParam(
            name: 'SKIP_UNIT_TESTS',
            defaultValue: false,
            description: 'Skip unit tests (not recommended)'
        )
        string(
            name: 'BRANCH',
            defaultValue: 'main',
            description: 'Git branch to build'
        )
    }

    // Environment variables available to all stages
    environment {
        // Node.js version (configure via NodeJS Plugin)
        NODEJS_VERSION = '20'
        
        // Project directories
        WORKSPACE_DIR = "${WORKSPACE}"
        TEST_RESULTS_DIR = "${WORKSPACE}/test-results"
        COVERAGE_DIR = "${WORKSPACE}/coverage"
        
        // Test report paths
        UNIT_TEST_REPORT = "${TEST_RESULTS_DIR}/unit-tests.xml"
        INTEGRATION_TEST_REPORT = "${TEST_RESULTS_DIR}/integration-tests.xml"
        
        // Build artifacts
        BUILD_DIR = "${WORKSPACE}/.next"
        OPENNEXT_DIR = "${WORKSPACE}/.open-next"
    }

    // Pipeline stages
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "Checking out branch: ${params.BRANCH}"
                }
                // Checkout the specified branch
                // Note: The branch is configured in Jenkins job settings (SCM section)
                // This will checkout the branch specified in the job configuration
                checkout scm
                
                // Display git information
                script {
                    def gitCommit = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    def gitBranch = sh(
                        script: 'git rev-parse --abbrev-ref HEAD',
                        returnStdout: true
                    ).trim()
                    echo "Git Commit: ${gitCommit}"
                    echo "Git Branch: ${gitBranch}"
                }
            }
        }

        stage('Setup') {
            steps {
                script {
                    echo "Setting up build environment..."
                    echo "Environment: ${params.ENVIRONMENT}"
                    echo "Node.js Version: ${NODEJS_VERSION}"
                }
                
                // Use Node.js from Jenkins NodeJS Plugin
                sh '''
                    node --version
                    npm --version
                '''
                
                // Create test results directory
                sh 'mkdir -p ${TEST_RESULTS_DIR}'
                sh 'mkdir -p ${COVERAGE_DIR}'
                
                // Install dependencies
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                script {
                    echo "Running ESLint..."
                }
                sh 'npm run lint || true' // Don't fail build on lint warnings
            }
        }

        stage('Unit Tests') {
            when {
                expression { !params.SKIP_UNIT_TESTS }
            }
            steps {
                script {
                    echo "Running unit tests with Vitest..."
                }
                
                // Run unit tests (Vitest outputs to console by default)
                // Note: To generate JUnit XML, install @vitest/ui or vitest-junit-reporter
                // For now, we capture console output and parse results
                sh '''
                    npm run test:run 2>&1 | tee ${TEST_RESULTS_DIR}/unit-tests-output.txt
                    TEST_EXIT_CODE=${PIPESTATUS[0]}
                    if [ $TEST_EXIT_CODE -ne 0 ]; then
                        echo "Unit tests failed with exit code: $TEST_EXIT_CODE"
                        exit $TEST_EXIT_CODE
                    fi
                '''
            }
            post {
                always {
                    // Archive test output
                    archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
                    
                    // Parse test results from console output (basic)
                    script {
                        // If JUnit XML exists, publish it
                        if (fileExists("${TEST_RESULTS_DIR}/unit-tests.xml")) {
                            junit testResults: 'test-results/unit-tests.xml', allowEmptyResults: true
                        } else {
                            echo "JUnit XML not found. Install vitest-junit-reporter for XML reports."
                            echo "Test results available in: test-results/unit-tests-output.txt"
                        }
                    }
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    echo "Building Next.js application..."
                }
                
                // Build Next.js (includes prebuild which runs tests)
                sh 'npm run build'
                
                // Build OpenNext bundle for Cloudflare Workers
                sh 'npm run opennext-build'
                
                script {
                    echo "Build completed successfully"
                    echo "Build artifacts:"
                    sh 'ls -la ${BUILD_DIR} || echo "Build directory not found"'
                    sh 'ls -la ${OPENNEXT_DIR} || echo "OpenNext directory not found"'
                }
            }
            post {
                success {
                    echo "Build stage completed successfully"
                }
                failure {
                    echo "Build stage failed"
                }
            }
        }

        stage('Integration Tests') {
            when {
                expression { params.RUN_INTEGRATION_TESTS }
            }
            steps {
                script {
                    echo "Running Postman integration tests..."
                    echo "Note: This requires a running application instance"
                }
                
                // Check if Newman is installed
                sh '''
                    if ! command -v newman &> /dev/null; then
                        echo "Newman CLI not found. Installing..."
                        npm install -g newman
                    fi
                    newman --version
                '''
                
                // Run Postman collections (if they exist)
                script {
                    def collections = [
                        'tests/postman/collections/auth.json',
                        'tests/postman/collections/mcq.json'
                    ]
                    
                    collections.each { collection ->
                        def collectionName = collection.split('/').last().replace('.json', '')
                        if (fileExists(collection)) {
                            echo "Running collection: ${collectionName}"
                            sh """
                                newman run ${collection} \
                                    -e tests/postman/environments/${params.ENVIRONMENT}.json \
                                    --reporters junit,cli \
                                    --reporter-junit-export ${TEST_RESULTS_DIR}/integration-${collectionName}.xml \
                                    || echo "Integration tests failed for ${collectionName}"
                            """
                        } else {
                            echo "Collection not found: ${collection} (skipping)"
                        }
                    }
                }
            }
            post {
                always {
                    // Archive integration test results
                    junit testResults: 'test-results/integration-*.xml', allowEmptyResults: true
                }
            }
        }

        stage('Deploy to Cloudflare') {
            when {
                expression { params.DEPLOY_TO_CLOUDFLARE }
            }
            steps {
                script {
                    echo "Deploying to Cloudflare Workers..."
                    echo "Environment: ${params.ENVIRONMENT}"
                }
                
                // Verify Wrangler is installed
                sh '''
                    if ! command -v wrangler &> /dev/null; then
                        echo "Wrangler CLI not found. Installing..."
                        npm install -g wrangler
                    fi
                    wrangler --version
                '''
                
                // Verify Cloudflare authentication
                sh 'wrangler whoami || echo "Warning: Not authenticated with Cloudflare. Run: wrangler login"'
                
                // Deploy to Cloudflare Workers
                script {
                    try {
                        sh 'npm run deploy'
                        echo "Deployment to Cloudflare Workers completed successfully"
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.getMessage()}"
                        error("Deployment failed")
                    }
                }
            }
            post {
                success {
                    echo "Deployment completed successfully"
                    // You can add notifications here (email, Slack, etc.)
                }
                failure {
                    echo "Deployment failed"
                    // You can add failure notifications here
                }
            }
        }
    }

    // Post-build actions
    post {
        always {
            script {
                echo "Pipeline execution completed"
                echo "Environment: ${params.ENVIRONMENT}"
                echo "Unit Tests: ${params.SKIP_UNIT_TESTS ? 'SKIPPED' : 'EXECUTED'}"
                echo "Integration Tests: ${params.RUN_INTEGRATION_TESTS ? 'EXECUTED' : 'SKIPPED'}"
                echo "Deployment: ${params.DEPLOY_TO_CLOUDFLARE ? 'EXECUTED' : 'SKIPPED'}"
            }
            
            // Cleanup (optional - remove old build artifacts)
            // sh 'rm -rf ${BUILD_DIR} ${OPENNEXT_DIR} || true'
            
            // Archive build artifacts
            archiveArtifacts artifacts: '.next/**/*', allowEmptyArchive: true
            archiveArtifacts artifacts: '.open-next/**/*', allowEmptyArchive: true
            
            // Archive test results
            archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
            archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
        }
        success {
            echo "Pipeline succeeded!"
        }
        failure {
            echo "Pipeline failed!"
        }
        unstable {
            echo "Pipeline is unstable (tests failed but build succeeded)"
        }
    }
}
