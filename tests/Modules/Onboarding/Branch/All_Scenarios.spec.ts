import { test, expect, Page } from '@playwright/test';
import { AllScenariosPage } from '../../../../SourcePages/Modules/Onboarding/Branch/All_Scenarios';
import { ReportHelper } from '../../../../Utils';
import {
  getBranchCreationRow,
  getFieldValue,
} from '../../../../TestData/Excel_Reader/uiExcelReader';

/**
 * Consolidated Test Suite: Branch Onboarding - All Scenarios
 * Module: Branch Onboarding
 * File: All_Scenarios.spec.ts
 *
 * Architecture:
 * - Runs in Serial Mode (Single Shared Browser Session)
 * - Supports: Single scenario, Multiple scenarios (-g "Scenario 1|Scenario 3"), and All scenarios
 */
test.describe.serial('Branch Onboarding - All Scenarios', () => {
  let page: Page;
  let allScenariosPage: AllScenariosPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    allScenariosPage = new AllScenariosPage(page);

    try {
      await page.setViewportSize({ width: 1920, height: 1080 });
    } catch {}

    // Pre-condition: Login once in this single browser session
    console.log('\n[Pre-condition] Authenticating Admin user in Single Shared Browser Session...');
    await allScenariosPage.performLogin();
  });

  test.beforeEach(async () => {
    // Ensure clean state on Branch module before each scenario
    await allScenariosPage.navigateToBranchModule();
  });

  test.afterEach(async () => {
    try {
      await page.keyboard.press('Escape').catch(() => {});
      const dialogClose = page.locator("//div[contains(@class,'fixed') or @role='dialog']//button[.//svg or @aria-label='Close' or contains(.,'×')]").first();
      if (await dialogClose.isVisible({ timeout: 1000 }).catch(() => false)) {
        await dialogClose.click().catch(() => {});
      }
      const cancelBtn = page.locator("//button[normalize-space()='Cancel'] | //button[contains(.,'Cancel')] | //button[normalize-space()='Back']").first();
      if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelBtn.click().catch(() => {});
      }
      await page.waitForTimeout(500);
    } catch {}
  });

  test.afterAll(async () => {
    if (page && !page.isClosed()) {
      await page.close();
    }
  });

  // =========================================================================
  // SCENARIO 1: BRANCH SUBTYPE SELECTION (ALL CASES)
  // Run standalone: npx playwright test tests/Modules/Onboarding/Branch/All_Scenarios.spec.ts -g "Scenario 1" --project=chromium --headed
  // =========================================================================
  test('Scenario 1 - Branch Subtype Selection (All Cases)', async ({}, testInfo) => {
    test.setTimeout(60000);
    console.log('\n--- Running Scenario 1: Branch Subtype Selection (All Cases) ---');

    const { expectedOptions, actualOptions, isMatch, missingInUI, extraInUI } =
      await allScenariosPage.executeScenario1_BranchSubtypeSelection();

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
  test('Scenario 2 - Validate "Fetch Details" Button Functionality (All Cases)', async ({}, testInfo) => {
    test.setTimeout(90000);
    console.log('\n--- Running Scenario 2: Validate "Fetch Details" Button Functionality (All Cases) ---');

    const {
      case1_isDisabledWhenBlank,
      case2_isEnabledWhenEntered,
      case3_isOfficeAddressPopupOpened,
      gstinUsed,
    } = await allScenariosPage.executeScenario2_ValidateFetchDetailsFunctionality();

    // Case 1 (TC_02.1)
    expect(
      case1_isDisabledWhenBlank,
      'Case 1 (TC_02.1) Failed: "Fetch Details" button should remain disabled when GSTIN is blank'
    ).toBeTruthy();

    // Case 2 (TC_02.2)
    expect(
      case2_isEnabledWhenEntered,
      'Case 2 (TC_02.2) Failed: "Fetch Details" button should become enabled once GSTIN is entered'
    ).toBeTruthy();

    // Case 3 (TC_02.3)
    expect(
      case3_isOfficeAddressPopupOpened,
      'Case 3 (TC_02.3) Failed: "Office Address Details" popup must open upon fetching valid GSTIN'
    ).toBeTruthy();

    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Scenario 2 - Validate "Fetch Details" Button Functionality (TC_02.1, TC_02.2, TC_02.3)',
      expected: '1. Button disabled when GSTIN blank. 2. Button enabled after GSTIN entered. 3. Office Address Details popup opens on click.',
      actualResult: `All 3 cases passed! TC_02.1 (Disabled when blank: ${case1_isDisabledWhenBlank}), TC_02.2 (Enabled with GSTIN "${gstinUsed}": ${case2_isEnabledWhenEntered}), TC_02.3 (Office Address popup opened: ${case3_isOfficeAddressPopupOpened}).`,
    });

    console.log('\n✅ Scenario 2 Passed Successfully! All 3 test cases verified.');
    await page.waitForTimeout(3000);
  });

  // =========================================================================
  // SCENARIO 3: VALIDATE "NEXT" BUTTON DISABLED WHEN MANDATORY FIELDS ARE BLANK (ALL CASES)
  // Run standalone: npx playwright test tests/Modules/Onboarding/Branch/All_Scenarios.spec.ts -g "Scenario 3" --project=chromium --headed
  // =========================================================================
  test('Scenario 3 - Validate "Next" Button Disabled When Mandatory Fields Are Blank (All Cases)', async ({}, testInfo) => {
    test.setTimeout(180000);
    console.log('\n--- Running Scenario 3: Validate "Next" Button Disabled When Mandatory Fields Are Blank (Option B) ---');

    const {
      case_TC_03_1,
      case_TC_03_2,
      case_TC_03_3,
      case_TC_03_4,
      case_TC_03_5,
      case_TC_03_6,
      case_TC_03_7,
    } = await allScenariosPage.executeScenario3_ValidateNextButtonDisabledMandatoryFields();

    // TC_03.1: Effective Start Date Blank
    expect(
      case_TC_03_1,
      'TC_03.1 Failed: "Next" button should remain disabled when Effective Start Date is blank'
    ).toBeTruthy();

    // TC_03.2: Contact Person Name Blank
    expect(
      case_TC_03_2,
      'TC_03.2 Failed: "Next" button should remain disabled when Contact Person Name is blank'
    ).toBeTruthy();

    // TC_03.3: Contact Person Phone Blank
    expect(
      case_TC_03_3,
      'TC_03.3 Failed: "Next" button should remain disabled when Contact Person Phone is blank'
    ).toBeTruthy();

    // TC_03.4: Branch Name Blank
    expect(
      case_TC_03_4,
      'TC_03.4 Failed: "Next" button should remain disabled when Branch Name is blank'
    ).toBeTruthy();

    // TC_03.5: Branch Email Blank
    expect(
      case_TC_03_5,
      'TC_03.5 Failed: "Next" button should remain disabled when Branch Email is blank'
    ).toBeTruthy();

    // TC_03.6: Operation Type Blank
    expect(
      case_TC_03_6,
      'TC_03.6 Failed: "Next" button should remain disabled when Operation Type is blank'
    ).toBeTruthy();

    // TC_03.7: Is Controlling Blank
    expect(
      case_TC_03_7,
      'TC_03.7 Failed: "Next" button should remain disabled when Is Controlling is blank'
    ).toBeTruthy();

    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Scenario 3 - Validate "Next" Button Disabled When Mandatory Fields Are Blank (TC_03.1 - TC_03.7)',
      expected: 'The "Next" button must remain disabled when any mandatory field is blank.',
      actualResult: `All 7 mandatory fields validated successfully! TC_03.1 (Date blank: ${case_TC_03_1}), TC_03.2 (Contact Name blank: ${case_TC_03_2}), TC_03.3 (Phone blank: ${case_TC_03_3}), TC_03.4 (Branch Name blank: ${case_TC_03_4}), TC_03.5 (Email blank: ${case_TC_03_5}), TC_03.6 (Operation Type blank: ${case_TC_03_6}), TC_03.7 (Is Controlling blank: ${case_TC_03_7}).`,
    });

    console.log('\n✅ Scenario 3 Passed Successfully! All 7 mandatory field test cases verified.');
    await page.waitForTimeout(3000);
  });

  // =========================================================================
  // SCENARIO 4: VALIDATE "SAVE" BUTTON DISABLED ON INFRA INFO PAGE (TC_04.1 - TC_04.6)
  // Run standalone: npx playwright test tests/Modules/Onboarding/Branch/All_Scenarios.spec.ts -g "Scenario 4" --project=chromium --headed
  // =========================================================================
  test('Scenario 4 - Validate "Save" Button Disabled on Infra Info Page (All Cases)', async ({}, testInfo) => {
    test.setTimeout(180000);
    console.log('\n--- Running Scenario 4: Validate "Save" Button Disabled on Infra Info Page ---');

    // 1. Read test data from Excel sheet 'BranchCreation'
    const excelRow = getBranchCreationRow('BranchCreation', 0);
    const noOfGates = getFieldValue(excelRow, ['No of Gates', 'NoOfGates', 'Gates'], '2');
    const totalDocks = getFieldValue(excelRow, ['Total No of Docks', 'TotalNoOfDocks', 'No of Docks', 'Docks'], '2');
    const openYardArea = getFieldValue(excelRow, ['Open Yard Area', 'OpenYardArea', 'Open Yard'], '1000');
    const whFloorArea = getFieldValue(excelRow, ['Warehouse Floor Area', 'WarehouseFloorArea', 'Warehouse Area'], '2000');
    const storageCapacity = getFieldValue(excelRow, ['Material Storage Capacity', 'MaterialStorageCapacity', 'Storage Capacity'], '500');
    const branchFloor = getFieldValue(excelRow, ['Branch Floor', 'BranchFloor', 'Floor'], '');

    // Step 1: Reach Screen 2 ("Infra info" tab)
    await allScenariosPage.navigateToInfraInfoPage(excelRow);

    // Step 2: Fill 5 text fields from Excel, leave "Branch Floor" dropdown unselected
    await allScenariosPage.fillNoOfGates(String(noOfGates));
    await allScenariosPage.fillTotalNoOfDocks(String(totalDocks));
    await allScenariosPage.fillOpenYardArea(String(openYardArea));
    await allScenariosPage.fillWarehouseFloorArea(String(whFloorArea));
    await allScenariosPage.fillMaterialStorageCapacity(String(storageCapacity));

    // =======================================================================
    // VALIDATION TC_04.6: "Branch Floor" dropdown unselected -> Save must be disabled
    // =======================================================================
    await page.waitForTimeout(1000);
    const isSaveDisabled_TC04_6 = await allScenariosPage.isSaveButtonDisabled();
    expect(isSaveDisabled_TC04_6, 'TC_04.6 Failed: "Save" button should remain disabled when Branch Floor is not selected').toBeTruthy();
    console.log(`[Validation Passed] TC_04.6: Save disabled when Branch Floor unselected = ${isSaveDisabled_TC04_6}`);

    // Now select Branch Floor from Excel -> Now all 6 fields are filled!
    await allScenariosPage.selectBranchFloor(branchFloor);
    await page.waitForTimeout(1000);

    // =======================================================================
    // VALIDATION TC_04.1: "No of Gates" blank -> Save must be disabled
    // =======================================================================
    await allScenariosPage.clearNoOfGates();
    await page.waitForTimeout(1000);
    const isSaveDisabled_TC04_1 = await allScenariosPage.isSaveButtonDisabled();
    expect(isSaveDisabled_TC04_1, 'TC_04.1 Failed: "Save" button should remain disabled when No of Gates is blank').toBeTruthy();
    console.log(`[Validation Passed] TC_04.1: Save disabled when No of Gates blank = ${isSaveDisabled_TC04_1}`);
    await allScenariosPage.fillNoOfGates(String(noOfGates)); // re-fill
    await page.waitForTimeout(500);

    // =======================================================================
    // VALIDATION TC_04.2: "Total No of Docks" blank -> Save must be disabled
    // =======================================================================
    await allScenariosPage.clearTotalNoOfDocks();
    await page.waitForTimeout(1000);
    const isSaveDisabled_TC04_2 = await allScenariosPage.isSaveButtonDisabled();
    expect(isSaveDisabled_TC04_2, 'TC_04.2 Failed: "Save" button should remain disabled when Total No of Docks is blank').toBeTruthy();
    console.log(`[Validation Passed] TC_04.2: Save disabled when Total No of Docks blank = ${isSaveDisabled_TC04_2}`);
    await allScenariosPage.fillTotalNoOfDocks(String(totalDocks)); // re-fill
    await page.waitForTimeout(500);

    // =======================================================================
    // VALIDATION TC_04.3: "Open Yard Area" blank -> Save must be disabled
    // =======================================================================
    await allScenariosPage.clearOpenYardArea();
    await page.waitForTimeout(1000);
    const isSaveDisabled_TC04_3 = await allScenariosPage.isSaveButtonDisabled();
    expect(isSaveDisabled_TC04_3, 'TC_04.3 Failed: "Save" button should remain disabled when Open Yard Area is blank').toBeTruthy();
    console.log(`[Validation Passed] TC_04.3: Save disabled when Open Yard Area blank = ${isSaveDisabled_TC04_3}`);
    await allScenariosPage.fillOpenYardArea(String(openYardArea)); // re-fill
    await page.waitForTimeout(500);

    // =======================================================================
    // VALIDATION TC_04.4: "Warehouse Floor Area" blank -> Save must be disabled
    // =======================================================================
    await allScenariosPage.clearWarehouseFloorArea();
    await page.waitForTimeout(1000);
    const isSaveDisabled_TC04_4 = await allScenariosPage.isSaveButtonDisabled();
    expect(isSaveDisabled_TC04_4, 'TC_04.4 Failed: "Save" button should remain disabled when Warehouse Floor Area is blank').toBeTruthy();
    console.log(`[Validation Passed] TC_04.4: Save disabled when Warehouse Floor Area blank = ${isSaveDisabled_TC04_4}`);
    await allScenariosPage.fillWarehouseFloorArea(String(whFloorArea)); // re-fill
    await page.waitForTimeout(500);

    // =======================================================================
    // VALIDATION TC_04.5: "Material Storage Capacity" blank -> Save must be disabled
    // =======================================================================
    await allScenariosPage.clearMaterialStorageCapacity();
    await page.waitForTimeout(1000);
    const isSaveDisabled_TC04_5 = await allScenariosPage.isSaveButtonDisabled();
    expect(isSaveDisabled_TC04_5, 'TC_04.5 Failed: "Save" button should remain disabled when Material Storage Capacity is blank').toBeTruthy();
    console.log(`[Validation Passed] TC_04.5: Save disabled when Material Storage Capacity blank = ${isSaveDisabled_TC04_5}`);
    await allScenariosPage.fillMaterialStorageCapacity(String(storageCapacity)); // re-fill
    await page.waitForTimeout(500);

    // Record HTML Report Details
    ReportHelper.recordTestResult(testInfo, {
      caseDetails: 'Scenario 4 - Validate "Save" Button Disabled on Infra Info Page (TC_04.1 - TC_04.6)',
      expected: 'The "Save" button must remain disabled when any mandatory field on Infra info page is blank or unselected.',
      actualResult: 'All 6 test cases validated successfully in Test Method! Save button properly disabled for Gates, Docks, Open Yard, Warehouse Area, Storage Capacity, and unselected Branch Floor.',
    });

    console.log('\n✅ Scenario 4 All Validations Passed Successfully in Test Method!');
    await page.waitForTimeout(3000);
  });
});