import { WebDriver, By, until } from 'selenium-webdriver';
import { seleniumConfig } from '../../../config/selenium.config';

/**
 * Page Object for Login Page
 */
export class LoginPage {
  constructor(private driver: WebDriver) {}

  /**
   * Navigate to login page
   */
  async navigate(): Promise<void> {
    await this.driver.get(`${seleniumConfig.baseUrl}/login`);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.css('form')),
      10000
    );
  }

  /**
   * Enter username or email
   */
  async enterUsernameOrEmail(usernameOrEmail: string): Promise<void> {
    const input = await this.driver.findElement(By.id('usernameOrEmail'));
    await input.clear();
    await input.sendKeys(usernameOrEmail);
  }

  /**
   * Enter password
   */
  async enterPassword(password: string): Promise<void> {
    const input = await this.driver.findElement(By.id('password'));
    await input.clear();
    await input.sendKeys(password);
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Login')]")
    );
    await button.click();
  }

  /**
   * Login with credentials
   */
  async login(usernameOrEmail: string, password: string): Promise<void> {
    await this.enterUsernameOrEmail(usernameOrEmail);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      const errorElement = await this.driver.findElement(
        By.css('[role="alert"], .text-destructive')
      );
      return await errorElement.getText();
    } catch {
      return null;
    }
  }

  /**
   * Check if password field is masked (type="password")
   */
  async isPasswordMasked(): Promise<boolean> {
    const passwordInput = await this.driver.findElement(By.id('password'));
    const type = await passwordInput.getAttribute('type');
    return type === 'password';
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return await this.driver.getCurrentUrl();
  }

  /**
   * Check if login form is visible
   */
  async isLoginFormVisible(): Promise<boolean> {
    try {
      const form = await this.driver.findElement(By.css('form'));
      return await form.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Click signup link
   */
  async clickSignupLink(): Promise<void> {
    const link = await this.driver.findElement(
      By.xpath("//a[contains(text(), 'Sign up')]")
    );
    await link.click();
  }
}
