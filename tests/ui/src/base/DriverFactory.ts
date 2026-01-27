import { Builder, WebDriver, Capabilities } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { seleniumConfig } from '../../config/selenium.config';

/**
 * Factory class for creating and managing WebDriver instances
 */
export class DriverFactory {
  private static driver: WebDriver | null = null;

  /**
   * Creates a new WebDriver instance with Chrome
   */
  static async createDriver(): Promise<WebDriver> {
    if (this.driver) {
      return this.driver;
    }

    const options = new chrome.Options();
    
    // Add Chrome options for better stability
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    
    // Run headless in CI environments
    if (process.env.CI === 'true' || process.env.HEADLESS === 'true') {
      options.addArguments('--headless');
      // Set window size for headless mode to ensure responsive elements are visible
      // This ensures md:inline elements (medium screens and up) are displayed
      options.addArguments('--window-size=1920,1080');
    }

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Set window size based on mode
    // Headless mode: Set explicit size for consistent rendering
    // Visible mode: Maximize window to fit display (prevents zoom issues)
    if (process.env.CI === 'true' || process.env.HEADLESS === 'true') {
      await this.driver.manage().window().setRect({ width: 1920, height: 1080 });
    } else {
      // For visible mode, maximize window to prevent zoom/scaling issues
      await this.driver.manage().window().maximize();
    }

    // Set timeouts
    await this.driver.manage().setTimeouts({
      implicit: seleniumConfig.timeouts.implicit,
      pageLoad: seleniumConfig.timeouts.pageLoad,
      script: seleniumConfig.timeouts.script,
    });

    return this.driver;
  }

  /**
   * Gets the current WebDriver instance
   */
  static getDriver(): WebDriver {
    if (!this.driver) {
      throw new Error('WebDriver not initialized. Call createDriver() first.');
    }
    return this.driver;
  }

  /**
   * Quits the WebDriver instance
   */
  static async quitDriver(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }

  /**
   * Navigates to a URL
   */
  static async navigateTo(url: string): Promise<void> {
    const driver = this.getDriver();
    const fullUrl = url.startsWith('http') ? url : `${seleniumConfig.baseUrl}${url}`;
    await driver.get(fullUrl);
  }
}
