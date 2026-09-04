import { test, expect } from '@playwright/test';
import { LoginPage } from '../SourcePages/Common/LoginPage';
import { ReportHelper } from '../Utils';

test.describe('Authentication & Login UI Module Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await context.clearPermissions();
    loginPage = new LoginPage(page);
  });

  // =========================================================================
  // TEST CASE 01: VALID LOGIN FROM EXCEL
  // Run standalone: npx playwright test tests/login.spec.ts -g "TC01"
  // =========================================================================
  test('TC01 - Successful Login with Valid Credentials from Excel', async ({ page }, testInfo) => {
    test.setTimeout(45000);
    console.log('\n--- Running TC01: Valid User Login from Excel ---');

    // 1. Navigate to Login Page
    await loginPage.gotoLoginPage();
    expect(page.url()).toContain('login');

    // 2. Perform Login with Credentials from Excel
    await loginPage.login();

    // 3. Assert user is logged in and redirected to Dashboard
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn, 'User should be redirected away from login to Dashboard').toBeTruthy();

    // 4. Record HTML Report Details
    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Authentication - Successful Login with Valid Credentials',
      expected: 'User should be authenticated successfully and redirected to Dashboard.',
      actualResult: `Login successful! User reached Dashboard at URL: ${page.url()}`,
    });

    await page.waitForTimeout(3000);
  });

  // =========================================================================
  // TEST CASE 02: MANDATORY FIELDS VALIDATION (BLANK FORM)
  // Run standalone: npx playwright test tests/login.spec.ts -g "TC02"
  // =========================================================================
  test('TC02 - Should Disable Login Button When Fields Are Blank', async ({ page }, testInfo) => {
    console.log('\n--- Running TC02: Mandatory Fields Blank Login Validation ---');

    // 1. Navigate to Login Page
    await loginPage.gotoLoginPage();
    expect(page.url()).toContain('login');

    // 2. Ensure fields are blank
    await loginPage.clearFields();

    // 3. Assert that the Login button is disabled
    const isButtonDisabled = await loginPage.isLoginButtonDisabled();
    expect(isButtonDisabled, 'Login button should remain disabled when fields are blank').toBeTruthy();

    // 4. Record HTML Report Details
    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Authentication - Blank fields validation',
      expected: 'Login button must be disabled and not clickable when username/password are empty.',
      actualResult: 'Login button verified to be disabled with cursor-not-allowed style.',
    });
  });

  // =========================================================================
  // TEST CASE 03: INVALID CREDENTIALS VALIDATION
  // Run standalone: npx playwright test tests/login.spec.ts -g "TC03"
  // =========================================================================
  test('TC03 - Should Reject Login with Invalid Credentials', async ({ page }, testInfo) => {
    console.log('\n--- Running TC03: Invalid Credentials Login Validation ---');

    // 1. Navigate to Login Page
    await loginPage.gotoLoginPage();

    // 2. Attempt login with invalid user and password
    const invalidUser = 'NON_EXISTING_USER_99';
    const invalidPass = 'WrongPassword@123';
    await loginPage.login(invalidUser, invalidPass);

    // 3. Assert user is NOT logged in and still on login page
    const currentUrl = page.url().toLowerCase();
    expect(currentUrl).toContain('login');

    const errorMessage = await loginPage.getErrorMessage();
    console.log(`[Validation] Error message displayed: "${errorMessage}"`);

    // 4. Record HTML Report Details
    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Authentication - Invalid credentials validation',
      expected: 'System should reject login with invalid credentials and keep user on login page.',
      actualResult: `Invalid credentials rejected successfully. Page remained at login.${errorMessage ? ` Error displayed: "${errorMessage}"` : ''}`,
    });
  });

});
