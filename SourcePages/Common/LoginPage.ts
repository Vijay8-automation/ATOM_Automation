import { Page, expect } from '@playwright/test';
import { CommonPaths } from './CommonPaths';
import { WaitHelper } from '../../Utils/WaitHelper';
import { ExceptionHandler } from '../../Utils/ExceptionHandler';
import {
  getUICredentials,
  getUIBaseUrl,
  UIUserCredential,
} from '../../TestData/Excel_Reader/uiExcelReader';

/**
 * Reusable Centralized Login Page Object.
 * Handles Authentication, Input Synchronization, 1s Delays, and Error Validations across all modules.
 */
export class LoginPage {
  readonly page: Page;
  readonly paths = CommonPaths.login;
  readonly wait: WaitHelper;

  constructor(page: Page) {
    this.page = page;
    this.wait = new WaitHelper(page);
  }

  /**
   * Navigates to the Application Login page.
   * Auto-detects Base URL from Excel or defaults to https://dev.omone.in/login.
   */
  public async gotoLoginPage(customUrl?: string): Promise<void> {
    const baseUrl = customUrl || getUIBaseUrl() || 'https://dev.omone.in';
    const targetUrl = baseUrl.endsWith('/login') ? baseUrl : `${baseUrl}/login`;

    console.log(`[LoginPage] Navigating to Login URL: ${targetUrl}`);

    // Ensure maximized resolution if viewport is enabled
    try {
      const currentViewport = this.page.viewportSize();
      if (currentViewport) {
        await this.page.setViewportSize({ width: 1920, height: 1080 });
      }
    } catch {
      // Ignored if viewport is null (handled by --start-maximized)
    }

    // Clear browser cookies and session
    try {
      await this.page.context().clearCookies();
      const client = await this.page.context().newCDPSession(this.page);
      await client.send('Network.clearBrowserCache');
      await client.send('Network.clearBrowserCookies');
      await client.send('Network.setCacheDisabled', { cacheDisabled: true });
      console.log('[LoginPage] 🧹 Cleared browser cache & cookies.');
    } catch {
      // Ignored for non-CDP browsers
    }

    await this.page.goto(targetUrl, { waitUntil: 'load', timeout: 45000 });

    // Ensure full page load & all network/resources settled
    console.log('[LoginPage] ⏳ Waiting for Login page resources and DOM to settle completely...');
    await this.wait.waitForPageReady();

    // Explicitly wait for username input to be rendered and editable
    const usernameLocator = this.page.locator(this.paths.usernameInput).first();
    await this.wait.waitForElementReady(usernameLocator, 20000);

    console.log('[LoginPage] ✅ Login page is fully loaded and ready.');
    await this.wait.pause(1000);
  }

  /**
   * Reads credentials from Excel sheet "Credential" (or custom passed params)
   * and completes login with 1-second visual delays and enabled-button checks.
   */
  public async login(customUser?: string, customPass?: string): Promise<void> {
    try {
      let username = customUser;
      let password = customPass;

      if (!username || !password) {
        const creds = getUICredentials('Credential', 0);
        username = creds.username;
        password = creds.password;
        console.log(`[LoginPage] Loaded UI credentials from Excel: Username = "${username}"`);
      }

      // Ensure page is fully rendered and ready before interacting
      console.log('[LoginPage] Ensuring Login form is fully ready...');
      await this.wait.waitForPageReady();

      // 1. Enter Username
      const usernameLocator = this.page.locator(this.paths.usernameInput).first();
      await this.wait.waitForElementReady(usernameLocator, 15000);
      await this.wait.pause(500);
      await usernameLocator.click();
      await usernameLocator.fill(username);
      await usernameLocator.dispatchEvent('input').catch(() => {});
      await usernameLocator.dispatchEvent('change').catch(() => {});
      console.log(`[LoginPage] Entered Username: "${username}". Waiting 1 second...`);
      await this.wait.pause(1000);

      // 2. Enter Password
      const passwordLocator = this.page.locator(this.paths.passwordInput).first();
      await this.wait.waitForElementReady(passwordLocator, 10000);
      await this.wait.pause(500);
      await passwordLocator.click();
      await passwordLocator.fill(password);
      await passwordLocator.dispatchEvent('input').catch(() => {});
      await passwordLocator.dispatchEvent('change').catch(() => {});
      console.log(`[LoginPage] Entered Password. Waiting 1 second...`);
      await this.wait.pause(1000);

      // 3. Wait for Login button to become enabled
      console.log(`[LoginPage] Waiting for Login button to become enabled...`);
      const submitBtn = this.page.locator(this.paths.submitButton).first();
      await submitBtn.waitFor({ state: 'visible', timeout: 10000 });

      await this.wait.waitForCondition(
        () => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Login'));
          return btn && !btn.disabled && !btn.hasAttribute('disabled') && !btn.classList.contains('cursor-not-allowed');
        },
        10000
      ).catch(() => {});

      await this.wait.pause(500);

      // 4. Click Login button
      console.log(`[LoginPage] Clicking Login button...`);
      try {
        await submitBtn.click({ timeout: 5000 });
      } catch {
        console.log(`[LoginPage] Direct click failed, pressing Enter key to submit login...`);
        await passwordLocator.press('Enter');
      }

      // 5. Wait for navigation / dashboard load
      await this.page.waitForLoadState('load').catch(() => {});
      await this.wait.waitForPageReady().catch(() => {});
      await this.wait.pause(2000);
      console.log(`[LoginPage] Current URL after login: ${this.page.url()}`);
    } catch (error: any) {
      return await ExceptionHandler.handleStepFailure(this.page, 'LoginPage.login', error);
    }
  }

  /**
   * Checks if user has successfully logged in and navigated away from login page.
   */
  public async isLoggedIn(): Promise<boolean> {
    await this.page.waitForFunction(
      () => !window.location.href.toLowerCase().includes('/login') || window.location.href.toLowerCase().includes('dashboard'),
      null,
      { timeout: 15000 }
    ).catch(() => {});

    const currentUrl = this.page.url().toLowerCase();
    const hasDashboard = currentUrl.includes('dashboard') || !currentUrl.includes('/login');
    return hasDashboard;
  }

  /**
   * Returns any login error message displayed on screen (e.g. invalid credentials).
   */
  public async getErrorMessage(): Promise<string> {
    const errorLoc = this.page.locator(this.paths.errorMessage).first();
    if (await errorLoc.isVisible({ timeout: 4000 }).catch(() => false)) {
      return (await errorLoc.innerText()).trim();
    }
    return '';
  }

  /**
   * Checks whether the submit button is currently disabled (e.g. blank form validation).
   */
  public async isLoginButtonDisabled(): Promise<boolean> {
    const submitBtn = this.page.locator(this.paths.submitButton).first();
    if (!await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) return true;
    const isDisabledAttr = await submitBtn.getAttribute('disabled');
    const classes = (await submitBtn.getAttribute('class')) || '';
    return isDisabledAttr !== null || classes.includes('cursor-not-allowed') || classes.includes('bg-gray-300');
  }

  /**
   * Clears username and password fields.
   */
  public async clearFields(): Promise<void> {
    const usernameLocator = this.page.locator(this.paths.usernameInput).first();
    if (await usernameLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usernameLocator.clear();
    }
    const passwordLocator = this.page.locator(this.paths.passwordInput).first();
    if (await passwordLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passwordLocator.clear();
    }
  }
}
