/**
 * Selenium WebDriver Configuration
 * Centralized configuration for UI tests
 */

export const seleniumConfig = {
  // Base URL for the application
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  // Browser configuration
  browser: process.env.BROWSER || 'chrome',

  // Timeouts (in milliseconds)
  timeouts: {
    implicit: 5000, // Implicit wait timeout
    pageLoad: 30000, // Page load timeout
    script: 30000, // Script execution timeout
  },

  // Test user credentials
  testUsers: {
    primary: {
      username: 'integration_teacher_1',
      email: 'integration.teacher1@example.com',
      password: 'IntegrationTestPassword123!',
      firstName: 'Integration',
      lastName: 'Teacher',
    },
    alternative: {
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'TestPassword123',
      firstName: 'Test',
      lastName: 'User',
    },
    security: {
      user1: {
        username: 'security_test_user_1',
        email: 'security.test.user1@example.com',
        password: 'SecurityTestPassword123!',
      },
      user2: {
        username: 'security_test_user_2',
        email: 'security.test.user2@example.com',
        password: 'SecurityTestPassword123!',
      },
    },
  },

  // Screenshot configuration
  screenshots: {
    enabled: true,
    directory: 'reports/screenshots',
    onFailure: true,
  },
};
