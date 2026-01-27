import { WebDriver } from 'selenium-webdriver';
import { DriverFactory } from './DriverFactory';
import { seleniumConfig } from '../../config/selenium.config';

/**
 * Base test class with common setup and teardown
 * All test classes should extend this
 */
export class BaseTest {
  protected driver!: WebDriver;

  /**
   * Setup before each test
   */
  async beforeEach(): Promise<void> {
    this.driver = await DriverFactory.createDriver();
    // Navigate to base URL
    await DriverFactory.navigateTo('/');
  }

  /**
   * Cleanup after each test
   */
  async afterEach(): Promise<void> {
    // Take screenshot on failure (if enabled)
    if (seleniumConfig.screenshots.onFailure) {
      try {
        // Screenshot logic can be added here if needed
      } catch (error) {
        console.error('Failed to take screenshot:', error);
      }
    }
    
    // Clear cookies and local storage
    try {
      await this.driver.manage().deleteAllCookies();
      await this.driver.executeScript('window.localStorage.clear();');
      await this.driver.executeScript('window.sessionStorage.clear();');
    } catch (error) {
      console.error('Failed to clear browser data:', error);
    }
  }

  /**
   * Cleanup after all tests
   */
  async afterAll(): Promise<void> {
    await DriverFactory.quitDriver();
  }
}
