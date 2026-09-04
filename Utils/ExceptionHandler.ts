import { Page, TestInfo } from '@playwright/test';

/**
 * Standardized Exception Handling Utility for Playwright Automation.
 * Mirrors resilient C# patterns (IgnoreExceptionTypes, Safe Execution, Step Failure Logging).
 */
export class ExceptionHandler {

  /**
   * Safely executes an action. If it fails with an ignored or transient exception,
   * it returns a fallback value without crashing the test (similar to C# IgnoreExceptionTypes).
   */
  public static async executeSafe<T>(
    action: () => Promise<T>,
    fallbackValue: T,
    actionName: string = 'SafeAction',
    logWarning: boolean = true
  ): Promise<T> {
    try {
      return await action();
    } catch (error: any) {
      if (logWarning) {
        console.warn(`⚠️ [ExceptionHandler] Non-blocking exception in "${actionName}": ${error?.message || error}`);
      }
      return fallbackValue;
    }
  }

  /**
   * Retries an async action multiple times before throwing the error.
   * Useful for handling transient DOM re-renders, animation latencies, or network blips.
   */
  public static async retry<T>(
    action: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    actionName: string = 'RetryAction'
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await action();
      } catch (error: any) {
        lastError = error;
        console.warn(`[ExceptionHandler] Attempt ${attempt}/${maxRetries} failed for "${actionName}". Retrying in ${delayMs}ms...`);
        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, delayMs));
        }
      }
    }
    throw new Error(`[ExceptionHandler] All ${maxRetries} attempts failed for "${actionName}": ${lastError?.message || lastError}`);
  }

  /**
   * Handles critical step failures:
   * 1. Logs clear contextual error details (Step name, URL, Error message).
   * 2. Captures a full-page failure screenshot and attaches it to the Playwright report.
   * 3. Rethrows a well-formatted Error for clean test failure reporting.
   */
  public static async handleStepFailure(
    page: Page,
    stepName: string,
    error: any,
    testInfo?: TestInfo
  ): Promise<never> {
    const currentUrl = page ? page.url() : 'Unknown';

    console.error(`\n❌ =================== [STEP EXCEPTION] ===================`);
    console.error(`Step Name    : ${stepName}`);
    console.error(`Current URL  : ${currentUrl}`);
    console.error(`Error Message: ${error?.message || error}`);
    console.error(`Stack Trace  :\n${error?.stack || 'No stack trace available'}`);
    console.error(`==========================================================\n`);

    // Capture failure screenshot if page is available and not closed
    if (page && !page.isClosed()) {
      try {
        const screenshot = await page.screenshot({ fullPage: true });
        if (testInfo) {
          await testInfo.attach(`${stepName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Failure_Screenshot`, {
            body: screenshot,
            contentType: 'image/png',
          });
          console.log(`📸 [ExceptionHandler] Failure screenshot attached to HTML report for "${stepName}".`);
        }
      } catch (screenshotErr: any) {
        console.warn(`[ExceptionHandler] Could not capture failure screenshot: ${screenshotErr?.message || screenshotErr}`);
      }
    }

    throw new Error(`[${stepName} Failed] ${error?.message || error}`);
  }
}
