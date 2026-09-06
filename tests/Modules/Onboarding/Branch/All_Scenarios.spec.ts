import { test, expect } from '@playwright/test';
import { AllScenariosPage } from '../../../../SourcePages/Modules/Onboarding/Branch/All_Scenarios';
import { ReportHelper } from '../../../../Utils';

/**
 * Consolidated Test Suite: Branch Onboarding - All Scenarios
 * Module: Branch Onboarding
 * File: All_Scenarios.spec.ts
 *
 * Architecture:
 * - 1 Scenario = 1 Single Test Method (covering all cases of that scenario)
 * - Scenario 1: Branch Subtype Selection (TC_01)
 * - Scenario 2: Validate "Fetch Details" Button Functionality (TC_02.1, TC_02.2, TC_02.3)
 */
test.describe('Branch Onboarding - All Scenarios', () => {
  let allScenariosPage: AllScenariosPage;

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await context.clearPermissions();
    allScenariosPage = new AllScenariosPage(page);

    // Pre-condition: User logged in with Admin credentials and on Dashboard
    console.log('\n[Pre-condition] Authenticating Admin user in Incognito session...');
    await allScenariosPage.performLogin();
  });

  // =========================================================================
  // SCENARIO 1: BRANCH SUBTYPE SELECTION (ALL CASES)
  // Run standalone: npx playwright test tests/Modules/Onboarding/Branch/All_Scenarios.spec.ts -g "Scenario 1" --project=chromium --headed
  // =========================================================================
  test('Scenario 1 - Branch Subtype Selection (All Cases)', async ({ page }, testInfo) => {
    test.setTimeout(60000);
    console.log('\n--- Running Scenario 1: Branch Subtype Selection (All Cases) ---');

    // 1 Scenario Method call executing the complete flow & validations
    const { expectedOptions, actualOptions, isMatch, missingInUI, extraInUI } =
      await allScenariosPage.executeScenario1_BranchSubtypeSelection();

    // Assertions
    expect(
      expectedOptions.length,
      'Excel sheet "BranchCreation" (Column: "Branch Sub-Type dropdown option") must contain options'
    ).toBeGreaterThan(0);

    expect(
      actualOptions.length,
      'UI Dropdown must display options'
    ).toBeGreaterThan(0);

    expect(
      missingInUI,
      `All options from Excel must be present in UI dropdown. Missing: [${missingInUI.join(', ')}]`
    ).toEqual([]);

    expect(
      isMatch,
      `Dropdown options must match Excel sheet options. Missing: [${missingInUI.join(', ')}], Extra: [${extraInUI.join(', ')}]`
    ).toBeTruthy();

    // Record HTML Report
    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Scenario 1 - Branch Subtype Selection (TC_01)',
      expected: `All ${expectedOptions.length} subtype options from Excel (BranchCreation) must be displayed: [${expectedOptions.join(', ')}]`,
      actualResult: `Verified all ${actualOptions.length} dropdown options in UI: [${actualOptions.join(', ')}]`,
    });

    console.log(`\n✅ Scenario 1 Passed Successfully! All ${actualOptions.length} options verified.`);
    await page.waitForTimeout(3000);
  });

  // =========================================================================
  // SCENARIO 2: VALIDATE "FETCH DETAILS" BUTTON FUNCTIONALITY (ALL CASES)
  // Run standalone: npx playwright test tests/Modules/Onboarding/Branch/All_Scenarios.spec.ts -g "Scenario 2" --project=chromium --headed
  // =========================================================================
  test('Scenario 2 - Validate "Fetch Details" Button Functionality (All Cases)', async ({ page }, testInfo) => {
    test.setTimeout(90000);
    console.log('\n--- Running Scenario 2: Validate "Fetch Details" Button Functionality (All Cases) ---');

    // 1 Scenario Method call executing all 3 cases:
    // - Case 1 (TC_02.1): Fetch Details disabled when GSTIN blank
    // - Case 2 (TC_02.2): Fetch Details enabled when GSTIN entered
    // - Case 3 (TC_02.3): Office Address Details popup opens on valid GSTIN
    const {
      case1_isDisabledWhenBlank,
      case2_isEnabledWhenEntered,
      case3_isOfficeAddressPopupOpened,
      gstinUsed,
    } = await allScenariosPage.executeScenario2_ValidateFetchDetailsFunctionality();

    // Assertions for Case 1 (TC_02.1)
    expect(
      case1_isDisabledWhenBlank,
      'Case 1 (TC_02.1) Failed: "Fetch Details" button should remain disabled when GSTIN is blank'
    ).toBeTruthy();

    // Assertions for Case 2 (TC_02.2)
    expect(
      case2_isEnabledWhenEntered,
      'Case 2 (TC_02.2) Failed: "Fetch Details" button should become enabled once GSTIN is entered'
    ).toBeTruthy();

    // Assertions for Case 3 (TC_02.3)
    expect(
      case3_isOfficeAddressPopupOpened,
      'Case 3 (TC_02.3) Failed: "Office Address Details" popup must open upon fetching valid GSTIN'
    ).toBeTruthy();

    // Record HTML Report Details
    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Scenario 2 - Validate "Fetch Details" Button Functionality (TC_02.1, TC_02.2, TC_02.3)',
      expected: '1. Button disabled when GSTIN blank. 2. Button enabled after GSTIN entered. 3. Office Address Details popup opens on click.',
      actualResult: `All 3 cases passed! TC_02.1 (Disabled when blank: ${case1_isDisabledWhenBlank}), TC_02.2 (Enabled with GSTIN "${gstinUsed}": ${case2_isEnabledWhenEntered}), TC_02.3 (Office Address popup opened: ${case3_isOfficeAddressPopupOpened}).`,
    });

    console.log('\n✅ Scenario 2 Passed Successfully! All 3 test cases verified.');
    await page.waitForTimeout(3000);
  });
});
