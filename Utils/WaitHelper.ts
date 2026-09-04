import { Page, Locator } from '@playwright/test';

/**
 * Standardized Explicit Wait and Interaction Utility for Playwright UI Automation.
 * Eliminates flaky hardcoded sleeps and ensures resilient element interaction.
 */
export class WaitHelper {
  readonly page: Page;
  readonly defaultTimeout: number;

  constructor(page: Page, defaultTimeout: number = 10000) {
    this.page = page;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Resolves selector string or Locator to a Locator instance.
   */
  public getLocator(target: string | Locator): Locator {
    return typeof target === 'string' ? this.page.locator(target).first() : target.first();
  }

  /**
   * Waits for an element to be attached to DOM and visible on screen.
   */
  public async waitForVisible(target: string | Locator, timeout: number = this.defaultTimeout): Promise<Locator> {
    const loc = this.getLocator(target);
    await loc.waitFor({ state: 'visible', timeout });
    return loc;
  }

  /**
   * Waits for an element to become hidden or removed from the DOM.
   * Useful for modals, backdrops, loaders, and spinners.
   */
  public async waitForHidden(target: string | Locator, timeout: number = this.defaultTimeout): Promise<void> {
    const loc = this.getLocator(target);
    await loc.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Scrolls an element into view if needed and waits for it to be visible & enabled.
   */
  public async waitForClickable(target: string | Locator, timeout: number = this.defaultTimeout): Promise<Locator> {
    const loc = this.getLocator(target);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    return loc;
  }

  /**
   * Safely scrolls into view, waits for element readiness, and executes click.
   */
  public async clickWhenReady(target: string | Locator, timeout: number = this.defaultTimeout): Promise<void> {
    const loc = await this.waitForClickable(target, timeout);
    await loc.click();
  }

  /**
   * Safely scrolls into view, waits for element readiness, clears and fills text.
   */
  public async fillWhenReady(target: string | Locator, value: string, timeout: number = this.defaultTimeout): Promise<void> {
    const loc = this.getLocator(target);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await loc.fill(value);
  }

  /**
   * Waits for any modal or overlay backdrop to disappear.
   */
  public async waitForModalBackdropClosed(timeout: number = 10000): Promise<void> {
    const backdrop = this.page.locator(
      "div.fixed.inset-0, div[class*='fixed'][class*='bg-black'], div[class*='bg-black/'], div[class*='MuiBackdrop-root']"
    );
    const count = await backdrop.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      await backdrop.nth(i).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  /**
   * Ensures no modal or fixed overlay intercepts pointer events.
   */
  public async waitForNoPointerInterception(timeout: number = 10000): Promise<void> {
    await this.page.waitForFunction(() => {
      const overlays = document.querySelectorAll("div.fixed.inset-0, div[class*='bg-black/'], div.MuiBackdrop-root");
      for (const el of Array.from(overlays)) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          return false;
        }
      }
      return true;
    }, null, { timeout }).catch(() => {});
  }

  /**
   * Waits for page DOM content to be loaded and stable.
   */
  public async waitForDomStable(timeout: number = 15000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout }).catch(() => {});
  }

  /**
   * Waits for an arbitrary condition function in browser context.
   */
  public async waitForCondition(conditionFn: () => boolean | Promise<boolean>, timeout: number = this.defaultTimeout): Promise<boolean> {
    try {
      await this.page.waitForFunction(conditionFn, null, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Waits for complete page load: document.readyState === 'complete',
   * load event, network idle, and any global loaders/spinners to disappear.
   */
  public async waitForPageReady(timeout: number = 30000): Promise<void> {
    // 1. Wait for document.readyState complete
    await this.page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 15000 }).catch(() => {});
    // 2. Wait for standard load state
    await this.page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    // 3. Wait for network to settle
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    // 4. Wait for any global loaders or spinners to disappear
    await this.waitForGlobalSpinnerHidden(timeout);
  }

  /**
   * Waits for any global spinners, loading bars, or progress indicators to be hidden.
   */
  public async waitForGlobalSpinnerHidden(timeout: number = 10000): Promise<void> {
    const spinners = this.page.locator(
      '.spinner, .loading, div[role="progressbar"], .loader, div[class*="loading" i], div[class*="spinner" i]'
    );
    const count = await spinners.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      await spinners.nth(i).waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }
  }

  /**
   * Ensures an element is visible, stable, enabled, and editable before interaction.
   */
  public async waitForElementReady(target: string | Locator, timeout: number = this.defaultTimeout): Promise<Locator> {
    const loc = this.getLocator(target);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.scrollIntoViewIfNeeded().catch(() => {});

    // Ensure element is enabled and editable
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const isEditable = await loc.isEditable().catch(() => false);
      const isEnabled = await loc.isEnabled().catch(() => false);
      if (isEditable && isEnabled) {
        break;
      }
      await this.page.waitForTimeout(100);
    }
    return loc;
  }

  /**
   * Controlled brief pause for UI animations/transitions to settle.
   */
  public async pause(ms: number = 500): Promise<void> {
    await this.page.waitForTimeout(ms);
  }
}
