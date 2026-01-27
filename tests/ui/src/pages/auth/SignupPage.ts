import { WebDriver, By, until } from 'selenium-webdriver';
import { seleniumConfig } from '../../../config/selenium.config';

/**
 * Page Object for Signup Page
 */
export class SignupPage {
  constructor(private driver: WebDriver) {}

  /**
   * Navigate to signup page
   */
  async navigate(): Promise<void> {
    await this.driver.get(`${seleniumConfig.baseUrl}/signup`);
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
   * Enter first name
   */
  async enterFirstName(firstName: string): Promise<void> {
    const input = await this.driver.findElement(By.id('firstName'));
    await input.clear();
    await input.sendKeys(firstName);
  }

  /**
   * Enter last name
   */
  async enterLastName(lastName: string): Promise<void> {
    const input = await this.driver.findElement(By.id('lastName'));
    await input.clear();
    await input.sendKeys(lastName);
  }

  /**
   * Enter username
   */
  async enterUsername(username: string): Promise<void> {
    const input = await this.driver.findElement(By.id('username'));
    await input.clear();
    await input.sendKeys(username);
  }

  /**
   * Enter email
   */
  async enterEmail(email: string): Promise<void> {
    const input = await this.driver.findElement(By.id('email'));
    await input.clear();
    await input.sendKeys(email);
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
   * Enter confirm password
   */
  async enterConfirmPassword(password: string): Promise<void> {
    const input = await this.driver.findElement(By.id('confirmPassword'));
    await input.clear();
    await input.sendKeys(password);
  }

  /**
   * Click signup button
   */
  async clickSignup(): Promise<void> {
    // Try multiple selectors for the submit button
    try {
      const button = await this.driver.findElement(
        By.css('button[type="submit"]')
      );
      await button.click();
    } catch {
      // Fallback to text-based selector
      const button = await this.driver.findElement(
        By.xpath("//button[contains(text(), 'Create Account') or contains(text(), 'Creating Account')]")
      );
      await button.click();
    }
  }

  /**
   * Fill signup form with all fields
   */
  async fillSignupForm(data: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
  }): Promise<void> {
    await this.enterFirstName(data.firstName);
    await this.enterLastName(data.lastName);
    await this.enterUsername(data.username);
    await this.enterEmail(data.email);
    await this.enterPassword(data.password);
    await this.enterConfirmPassword(data.password);
  }

  /**
   * Submit signup form
   */
  async submitSignupForm(data: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
  }): Promise<void> {
    await this.fillSignupForm(data);
    await this.clickSignup();
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
   * Get field error message
   */
  async getFieldError(fieldId: string): Promise<string | null> {
    try {
      // Try to find error message near the field (could be sibling or parent's sibling)
      // Look for elements with error-related classes or roles
      const errorSelectors = [
        `//input[@id="${fieldId}"]/following-sibling::*[contains(@class, "error") or contains(@role, "alert")]`,
        `//input[@id="${fieldId}"]/ancestor::div[contains(@class, "field")]//*[contains(@class, "error") or contains(@role, "alert")]`,
        `//label[@for="${fieldId}"]/following-sibling::*//*[contains(@class, "error")]`,
      ];
      
      for (const selector of errorSelectors) {
        try {
          const errorElement = await this.driver.findElement(By.xpath(selector));
          const text = await errorElement.getText();
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        } catch {
          continue;
        }
      }
      
      // Also check for data-invalid attribute on the input
      const input = await this.driver.findElement(By.id(fieldId));
      const invalid = await input.getAttribute('data-invalid');
      if (invalid === 'true') {
        // If marked as invalid, try to find error text nearby
        return 'Validation error'; // Generic message if we can't find specific text
      }
      
      return null;
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
   * Check if signup form is visible
   */
  async isSignupFormVisible(): Promise<boolean> {
    try {
      const form = await this.driver.findElement(By.css('form'));
      return await form.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Click login link
   */
  async clickLoginLink(): Promise<void> {
    const link = await this.driver.findElement(
      By.xpath("//a[contains(text(), 'Login')]")
    );
    await link.click();
  }
}
