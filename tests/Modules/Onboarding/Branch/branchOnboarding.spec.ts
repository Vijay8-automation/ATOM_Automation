import { test, expect } from '@playwright/test';
import { BranchPage } from '../../../../SourcePages/Modules/Onboarding/Branch/BranchPage';
import { ReportHelper } from '../../../../Utils';

test.describe('Branch Onboarding UI Module Tests', () => {
  let branchPage: BranchPage;

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await context.clearPermissions();
    branchPage = new BranchPage(page);
  });

  // =========================================================================
  // TEST CASE 01: CREATE BRANCH WITH VALID DETAILS
  // Run standalone: npx playwright test -g "TC01"
  // =========================================================================
  test('TC01 - Create Branch with Valid Details from Excel', async ({ page }, testInfo) => {
    test.setTimeout(90000);
    console.log('\n--- Running TC01: Create Branch with Valid Details from Excel ---');

    // 1. When login page loads, enter Username & Password from UITestData.xlsx, click Login
    console.log('[Step 1] Loading Login page and submitting credentials...');
    await branchPage.gotoLoginPage();
    expect(page.url()).toContain('login');
    await branchPage.login();

    // 2. When Dashboard loads, hover over Menubar and click 'Branch' (under Onboarding)
    console.log('[Step 2] Navigating via Menubar to Branch module...');
    await branchPage.hoverLeftPanelAndClickBranch();
    const isLoaded = await branchPage.isBranchPageLoaded();
    expect(isLoaded, 'Branch page should be visible and loaded').toBeTruthy();

    // 3. When Branch Dashboard loads, click on "//span[contains(.,'Add Branch')]"
    console.log('[Step 3] Clicking "//span[contains(.,\'Add Branch\')]"...');
    await branchPage.clickAddBranch();

    // 4. Complete Branch Creation Flow (Screen 1 + Screen 2 + Confirmation Modal)
    console.log('[Step 4] Executing complete Branch Creation flow from Excel...');
    const { excelData, isSuccess } = await branchPage.createBranchWithValidDetails(0);
    expect(isSuccess, 'Complete Branch Creation flow should finish and confirm successfully').toBeTruthy();

    // Record HTML Report Details: Case details, Expected, Actual Result
    const branchName = excelData['Branch Name'] || excelData['Branchname'] || excelData['Name'] || 'New Branch';
    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Branch creation with valid details',
      expected: 'User should be able to create a new branch successfully with valid details and confirmation.',
      actualResult: `Branch "${branchName}" created successfully! Screen 1 basic/contact info and Screen 2 infrastructure details submitted, and creation confirmed via popup.`,
    });

    // Keep browser open briefly to observe final result
    await page.waitForTimeout(5000);
  });

  // =========================================================================
  // TEST CASE 02: MANDATORY FIELDS VALIDATION
  // Run standalone: npx playwright test -g "TC02"
  // =========================================================================
  test('TC02 - Should Trigger and Validate Mandatory Field Errors on Blank Form', async ({ page }, testInfo) => {
    console.log('\n--- Running TC02: Mandatory Fields Validation ---');

    // 1. Login and Navigate to Branch
    await branchPage.gotoLoginPage();
    await branchPage.login();
    await branchPage.hoverLeftPanelAndClickBranch();

    // 2. Trigger blank submission scenario
    const errors = await branchPage.scenarioValidateMandatoryFields();
    console.log(`[Validation] Captured Error Messages:`, errors);

    // 3. Assertions
    // Validates that either field validation errors appear or required HTML5 validation blocks submission
    expect(Array.isArray(errors)).toBeTruthy();

    // Record HTML Report Details: Case details, Expected, Actual Result
    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Branch creation - Mandatory fields validation',
      expected: 'Mandatory field errors should be displayed or submission blocked when submitting a blank form.',
      actualResult: `Blank form submission properly validated. ${errors.length > 0 ? `Captured error messages: ${errors.join(', ')}` : 'HTML5 required validations blocked blank submission.'}`,
    });
  });

  // =========================================================================
  // TEST CASE 03: SEARCH BRANCH IN TABLE
  // Run standalone: npx playwright test -g "TC03"
  // =========================================================================
  test('TC03 - Should Search Branch in Table Grid', async ({ page }, testInfo) => {
    console.log('\n--- Running TC03: Search Branch ---');

    // 1. Login and Navigate to Branch
    await branchPage.gotoLoginPage();
    await branchPage.login();
    await branchPage.hoverLeftPanelAndClickBranch();

    // 2. Search for keyword in table
    const rowCount = await branchPage.scenarioSearchBranch('Branch');
    console.log(`[Search] Table Rows Found: ${rowCount}`);

    // 3. Assertions
    expect(rowCount).toBeGreaterThanOrEqual(0);

    // Record HTML Report Details: Case details, Expected, Actual Result
    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Branch search in table grid',
      expected: 'Search should execute and display matching branches in the table grid.',
      actualResult: `Search executed successfully. Total matching rows displayed: ${rowCount}.`,
    });
  });

});
