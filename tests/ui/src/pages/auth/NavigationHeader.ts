import { WebDriver, By, until } from 'selenium-webdriver';
import { seleniumConfig } from '../../../config/selenium.config';

/**
 * Page Object for Navigation Header
 */
export class NavigationHeader {
  constructor(private driver: WebDriver) {}

  /**
   * Wait for navigation header to load
   */
  async waitForHeader(): Promise<void> {
    try {
      await this.driver.wait(
        until.elementLocated(By.css('header')),
        10000
      );
    } catch {
      // Header might not be present on login/signup pages
    }
  }

  /**
   * Get user display name from header
   */
  async getUserDisplayName(): Promise<string | null> {
    try {
      await this.waitForHeader();
      const nameElement = await this.driver.findElement(
        By.css('header span.text-muted-foreground')
      );
      return await nameElement.getText();
    } catch {
      return null;
    }
  }

  /**
   * Check if user is logged in (header shows user name)
   */
  async isUserLoggedIn(): Promise<boolean> {
    const userName = await this.getUserDisplayName();
    return userName !== null && userName.trim().length > 0;
  }

  /**
   * Click logout button
   */
  async clickLogout(): Promise<void> {
    await this.waitForHeader();
    const logoutButton = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Logout') or contains(text(), 'Log out')]")
    );
    await logoutButton.click();
  }

  /**
   * Click MCQs link
   */
  async clickMcqsLink(): Promise<void> {
    await this.waitForHeader();
    const link = await this.driver.findElement(
      By.xpath("//a[contains(text(), 'MCQs')]")
    );
    await link.click();
  }

  /**
   * Click login link (when not authenticated)
   */
  async clickLoginLink(): Promise<void> {
    await this.waitForHeader();
    const link = await this.driver.findElement(
      By.xpath("//a[contains(text(), 'Login')]")
    );
    await link.click();
  }

  /**
   * Click signup link (when not authenticated)
   */
  async clickSignupLink(): Promise<void> {
    await this.waitForHeader();
    const link = await this.driver.findElement(
      By.xpath("//a[contains(text(), 'Sign Up') or contains(text(), 'Sign up')]")
    );
    await link.click();
  }

  /**
   * Check if header is visible
   */
  async isHeaderVisible(): Promise<boolean> {
    try {
      const header = await this.driver.findElement(By.css('header'));
      return await header.isDisplayed();
    } catch {
      return false;
    }
  }
}
