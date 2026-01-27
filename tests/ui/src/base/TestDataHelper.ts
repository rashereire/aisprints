import { seleniumConfig } from '../../config/selenium.config';

/**
 * Helper class for test data management
 */
export class TestDataHelper {
  /**
   * Generates a unique username for testing
   */
  static generateUniqueUsername(prefix: string = 'testuser'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Generates a unique email for testing
   */
  static generateUniqueEmail(prefix: string = 'testuser'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${timestamp}_${random}@example.com`;
  }

  /**
   * Gets test user credentials
   */
  static getTestUser(type: 'primary' | 'alternative' = 'primary') {
    return seleniumConfig.testUsers[type];
  }

  /**
   * Gets security test user
   */
  static getSecurityTestUser(userNumber: 1 | 2 = 1) {
    const key = userNumber === 1 ? 'user1' : 'user2';
    return seleniumConfig.testUsers.security[key];
  }
}
