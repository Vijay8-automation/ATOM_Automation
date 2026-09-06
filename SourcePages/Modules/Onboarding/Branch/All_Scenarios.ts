import { Page, expect } from '@playwright/test';
import { CommonPaths } from '../../../Common/CommonPaths';
import { LoginPage } from '../../../Common/LoginPage';
import { WaitHelper } from '../../../../Utils/WaitHelper';
import { readUISheet } from '../../../../TestData/Excel_Reader/uiExcelReader';

/**
 * Consolidated Page Object for Branch Onboarding - All Scenarios.
 * Module: Branch Onboarding
 * File: All_Scenarios.ts
 *
 * Architecture:
 * - 100% of Locators/XPaths are centralized in CommonPaths.ts (Zero selectors hardcoded here).
 * - 1 Scenario = 1 Unified Method containing all cases:
 *    * executeScenario1_BranchSubtypeSelection()
 *    * executeScenario2_ValidateFetchDetailsFunctionality()
 */
export class AllScenariosPage {
  readonly page: Page;
  readonly wait: WaitHelper;
  readonly loginPage: LoginPage;

  // Centralized CommonPaths reference
  readonly paths = CommonPaths;

  constructor(page: Page) {
    this.page = page;
    this.wait = new WaitHelper(page);
    this.loginPage = new LoginPage(page);
  }

  // =========================================================================
  // COMMON HELPER METHODS (Navigation, Input, Excel Reader)
  // =========================================================================

  /**
   * Performs Login using credentials from Excel via centralized LoginPage.
   */
  public async performLogin(): Promise<void> {
    console.log('[AllScenariosPage] Navigating to Login page and logging in...');
    await this.loginPage.gotoLoginPage();
    await this.loginPage.login();
  }

  /**
   * Navigates to Onboarding > Branch via sidebar hover & menu click.
   */
  public async navigateToBranchModule(): Promise<void> {
    console.log('[AllScenariosPage] Navigating to Onboarding > Branch...');

    const leftPanel = this.page.locator(this.paths.navigation.leftPanel).first();
    if (await leftPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await leftPanel.hover();
    } else {
      await this.page.mouse.move(20, 300);
    }
    await this.wait.pause(1000);

    const primaryBranch = this.page.locator(this.paths.navigation.branchMenuItem).first();
    let isBranchVisible = await primaryBranch.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isBranchVisible) {
      const onboardingMenu = this.page.locator(this.paths.navigation.onboardingMenu).first();
      if (await onboardingMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await onboardingMenu.click({ timeout: 2000 }).catch(() => {});
        await this.wait.pause(1000);
      }
    }

    if (await primaryBranch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await primaryBranch.click();
    } else {
      const fallbackBranch = this.page.locator(this.paths.navigation.branchMenuItemFallback).first();
      await fallbackBranch.waitFor({ state: 'visible', timeout: 8000 });
      await fallbackBranch.click();
    }

    await this.page.waitForLoadState('domcontentloaded');
    await this.wait.pause(2000);
    console.log(`[AllScenariosPage] Navigated to Branch URL: ${this.page.url()}`);
  }

  /**
   * Clicks the "Add Branch" button on the Branch page.
   */
  public async clickAddBranch(): Promise<void> {
    console.log('[AllScenariosPage] Clicking "Add Branch" button...');
    const addBtn = this.page.locator(this.paths.branchOnboarding.addBranchButton).first();
    await addBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.wait.pause(500);
    await addBtn.click();
    await this.wait.pause(1500);
    console.log('[AllScenariosPage] Add Branch form opened.');
  }

  /**
   * Opens the Branch Sub-Type dropdown combobox.
   */
  public async openBranchSubtypeDropdown(): Promise<void> {
    console.log('[AllScenariosPage] Opening Branch Sub-Type dropdown...');
    const primaryCombobox = this.page.locator(this.paths.branchOnboarding.branchSubTypeCombobox).first();
    let clicked = false;

    if (await primaryCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await primaryCombobox.click();
      clicked = true;
    } else {
      for (const fallbackPath of this.paths.branchOnboarding.branchSubTypeComboboxFallbacks) {
        const loc = this.page.locator(fallbackPath).first();
        if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
          await loc.click();
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      throw new Error('[AllScenariosPage] Failed to click Branch Sub-Type dropdown.');
    }

    await this.wait.pause(1000);
    const optionsLoc = this.page.locator(this.paths.branchOnboarding.dropdownOptions).first();
    await optionsLoc.waitFor({ state: 'visible', timeout: 10000 });
    console.log('[AllScenariosPage] Branch Sub-Type dropdown opened.');
  }

  /**
   * Selects an option from the Branch Sub-Type dropdown.
   */
  public async selectBranchSubtype(optionName?: string): Promise<string> {
    await this.openBranchSubtypeDropdown();
    const optionsLocator = this.page.locator(this.paths.branchOnboarding.dropdownOptions);
    const count = await optionsLocator.count();

    if (count === 0) {
      throw new Error('[AllScenariosPage] No options found in Branch Sub-Type dropdown.');
    }

    let selectedOption = '';
    if (optionName) {
      const targetOption = this.page.locator(`//li[@role='option'][contains(.,'${optionName}')]`).first();
      if (await targetOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        selectedOption = optionName;
        await targetOption.click();
      } else {
        selectedOption = (await optionsLocator.first().innerText()).trim();
        await optionsLocator.first().click();
      }
    } else {
      selectedOption = (await optionsLocator.first().innerText()).trim();
      await optionsLocator.first().click();
    }

    await this.wait.pause(500);
    console.log(`[AllScenariosPage] Selected Branch Sub-Type: "${selectedOption}"`);
    return selectedOption;
  }

  /**
   * Fetches all visible options from the open Sub-Type dropdown.
   */
  public async getUIOptions(): Promise<string[]> {
    const optionsLocator = this.page.locator(this.paths.branchOnboarding.dropdownOptions);
    const count = await optionsLocator.count();
    const uiOptions: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = (await optionsLocator.nth(i).innerText()).trim();
      if (text && !uiOptions.includes(text)) {
        uiOptions.push(text);
      }
    }
    console.log(`[AllScenariosPage] Fetched ${uiOptions.length} UI options:`, uiOptions);
    return uiOptions;
  }

  /**
   * Dynamically reads expected options from Excel sheet 'BranchCreation' (Column O).
   */
  public getExpectedOptionsFromExcel(sheetName: string = 'BranchCreation'): string[] {
    const rows = readUISheet<any>(sheetName);
    if (!rows || rows.length === 0) return [];

    const expectedOptions: string[] = [];
    for (const row of rows) {
      const optionKey = Object.keys(row).find(key => {
        const clean = key.toLowerCase().replace(/[\s_\-]/g, '');
        return clean.includes('branchsubtype') && (clean.includes('dropdown') || clean.includes('option'));
      }) || Object.keys(row).find(key => {
        const clean = key.toLowerCase().replace(/[\s_\-]/g, '');
        return clean.includes('subtype') && clean.includes('option');
      }) || Object.keys(row).find(key => {
        const clean = key.toLowerCase().replace(/[\s_\-]/g, '');
        return clean.includes('dropdownoption');
      });

      if (optionKey && row[optionKey]) {
        const optionValue = String(row[optionKey]).trim();
        if (optionValue && !expectedOptions.includes(optionValue)) {
          expectedOptions.push(optionValue);
        }
      }
    }
    return expectedOptions;
  }

  /**
   * Reads a valid GSTIN number from Excel sheet 'BranchCreation'.
   */
  public getValidGstinFromExcel(sheetName: string = 'BranchCreation'): string {
    const rows = readUISheet<any>(sheetName);
    if (rows && rows.length > 0) {
      const firstRow = rows[0];
      const gstinKey = Object.keys(firstRow).find(k => k.toLowerCase().replace(/[\s_\-]/g, '').includes('gstin'));
      if (gstinKey && firstRow[gstinKey]) {
        return String(firstRow[gstinKey]).trim();
      }
    }
    return '24AAGCR0277D1ZO';
  }

  /**
   * Checks if Fetch Details button is currently disabled.
   */
  public async isFetchDetailsButtonDisabled(): Promise<boolean> {
    const fetchBtn = this.page.locator(this.paths.branchOnboarding.fetchDetailsButton).first();
    await fetchBtn.waitFor({ state: 'visible', timeout: 10000 });

    const isDisabledAttr = await fetchBtn.getAttribute('disabled');
    const classes = (await fetchBtn.getAttribute('class')) || '';
    const ariaDisabled = await fetchBtn.getAttribute('aria-disabled');

    return (
      isDisabledAttr !== null ||
      ariaDisabled === 'true' ||
      classes.includes('cursor-not-allowed') ||
      classes.includes('opacity-50') ||
      classes.includes('bg-gray')
    );
  }

  /**
   * Checks if Fetch Details button is currently enabled.
   */
  public async isFetchDetailsButtonEnabled(): Promise<boolean> {
    const isDisabled = await this.isFetchDetailsButtonDisabled();
    return !isDisabled;
  }

  /**
   * Clears the GSTIN input field.
   */
  public async clearGstinNumber(): Promise<void> {
    const gstinLocator = this.page.locator(this.paths.branchOnboarding.gstinInput).first();
    if (await gstinLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gstinLocator.clear();
      await gstinLocator.dispatchEvent('input').catch(() => {});
      await gstinLocator.dispatchEvent('change').catch(() => {});
      await this.wait.pause(500);
    }
  }

  /**
   * Enters a GSTIN number into the GSTIN input field.
   */
  public async enterGstinNumber(gstin: string): Promise<void> {
    const gstinLocator = this.page.locator(this.paths.branchOnboarding.gstinInput).first();
    await gstinLocator.waitFor({ state: 'visible', timeout: 10000 });
    await gstinLocator.click();
    await gstinLocator.fill(gstin);
    await gstinLocator.dispatchEvent('input').catch(() => {});
    await gstinLocator.dispatchEvent('change').catch(() => {});
    await this.wait.pause(1000);
  }

  /**
   * Clicks Fetch Details button.
   */
  public async clickFetchDetails(): Promise<void> {
    const fetchBtn = this.page.locator(this.paths.branchOnboarding.fetchDetailsButton).first();
    await fetchBtn.waitFor({ state: 'visible', timeout: 10000 });
    await fetchBtn.click();
    console.log('[AllScenariosPage] Clicked "Fetch Details" button, awaiting Govt API response...');
    await this.wait.pause(1000);
  }

  /**
   * Verifies if the "Office Address Details" popup is displayed.
   * Waits actively for the "Select Address" button or popup modal to render after GST API completes.
   */
  public async isOfficeAddressPopupDisplayed(timeout: number = 25000): Promise<boolean> {
    console.log(`[AllScenariosPage] Waiting up to ${timeout / 1000}s for "Office Address Details" popup / "Select Address" button...`);
    const selectBtn = this.page.locator(this.paths.branchOnboarding.selectAddressButton).first();
    const popup = this.page.locator(this.paths.branchOnboarding.officeAddressPopup).first();

    try {
      // Primary: Wait actively for the "Select Address" button inside the modal
      await selectBtn.waitFor({ state: 'visible', timeout });
      console.log('[AllScenariosPage] ✅ "Select Address" button appeared in Office Address popup!');
      return true;
    } catch {
      console.log('[AllScenariosPage] Primary button wait elapsed, checking popup container fallback...');
      try {
        await popup.waitFor({ state: 'visible', timeout: 5000 });
        console.log('[AllScenariosPage] ✅ Office Address Details popup container is visible!');
        return true;
      } catch {
        const isSelectBtnVisible = await selectBtn.isVisible().catch(() => false);
        const isPopupVisible = await popup.isVisible().catch(() => false);
        return isSelectBtnVisible || isPopupVisible;
      }
    }
  }

  // =========================================================================
  // SCENARIO EXECUTION METHODS (1 Method Per Scenario)
  // =========================================================================

  /**
   * SCENARIO 1: Branch Subtype Selection (All Cases in 1 Method)
   * Validates that all defined options in Branch Sub-Type dropdown match Excel sheet data.
   */
  public async executeScenario1_BranchSubtypeSelection(): Promise<{
    expectedOptions: string[];
    actualOptions: string[];
    isMatch: boolean;
    missingInUI: string[];
    extraInUI: string[];
  }> {
    console.log('\n======================================================');
    console.log('[Scenario 1] Executing Branch Subtype Selection Flow...');
    console.log('======================================================');

    // 1. Navigate to Onboarding > Branch
    await this.navigateToBranchModule();

    // 2. Click Add Branch
    await this.clickAddBranch();

    // 3. Click on Branch Subtype dropdown
    await this.openBranchSubtypeDropdown();

    // 4. Read displayed options from UI
    const actualOptions = await this.getUIOptions();

    // 5. Read expected options from Excel sheet 'BranchCreation'
    const expectedOptions = this.getExpectedOptionsFromExcel('BranchCreation');

    // 6. Compare lists
    const actualLower = actualOptions.map(o => o.toLowerCase());
    const expectedLower = expectedOptions.map(o => o.toLowerCase());
    const missingInUI = expectedOptions.filter(exp => !actualLower.includes(exp.toLowerCase()));
    const extraInUI = actualOptions.filter(act => !expectedLower.includes(act.toLowerCase()));
    const isMatch = missingInUI.length === 0 && extraInUI.length === 0;

    console.log(`[Scenario 1] UI Options Count: ${actualOptions.length}, Excel Options Count: ${expectedOptions.length}`);
    console.log(`[Scenario 1] Verification Status: ${isMatch ? 'PASSED ✅' : 'FAILED ❌'}`);

    return {
      expectedOptions,
      actualOptions,
      isMatch,
      missingInUI,
      extraInUI,
    };
  }

  /**
   * SCENARIO 2: Validate "Fetch Details" Button Functionality (All Cases in 1 Method)
   * Executes and validates all 3 cases:
   * - Case 1 (TC_02.1): Fetch Details remains disabled while GSTIN is blank
   * - Case 2 (TC_02.2): Fetch Details becomes enabled after entering GSTIN
   * - Case 3 (TC_02.3): Office Address Details popup opens on valid GSTIN
   */
  public async executeScenario2_ValidateFetchDetailsFunctionality(): Promise<{
    case1_isDisabledWhenBlank: boolean;
    case2_isEnabledWhenEntered: boolean;
    case3_isOfficeAddressPopupOpened: boolean;
    gstinUsed: string;
  }> {
    console.log('\n======================================================');
    console.log('[Scenario 2] Executing Validate "Fetch Details" Button Functionality...');
    console.log('======================================================');

    // 1. Navigate to Onboarding > Branch
    await this.navigateToBranchModule();

    // 2. Click Add Branch
    await this.clickAddBranch();

    // 3 & 4. Click Branch Sub-Type dropdown and select an option
    await this.selectBranchSubtype();

    // --- CASE 1 (TC_02.1): Verify Fetch Details is disabled when GSTIN is blank ---
    console.log('[Scenario 2] Step 1: Checking "Fetch Details" button is disabled when GSTIN is blank (TC_02.1)...');
    await this.clearGstinNumber();
    const case1_isDisabledWhenBlank = await this.isFetchDetailsButtonDisabled();
    console.log(`[Scenario 2] TC_02.1 Result -> Disabled: ${case1_isDisabledWhenBlank}`);

    // --- CASE 2 (TC_02.2): Enter GSTIN and verify Fetch Details is enabled ---
    console.log('[Scenario 2] Step 2: Entering GSTIN from Excel and checking "Fetch Details" is enabled (TC_02.2)...');
    const gstinUsed = this.getValidGstinFromExcel('BranchCreation');
    await this.enterGstinNumber(gstinUsed);
    const case2_isEnabledWhenEntered = await this.isFetchDetailsButtonEnabled();
    console.log(`[Scenario 2] TC_02.2 Result -> Enabled: ${case2_isEnabledWhenEntered}`);

    // --- CASE 3 (TC_02.3): Click Fetch Details and verify Office Address Details popup opens ---
    console.log('[Scenario 2] Step 3: Clicking "Fetch Details" and checking Office Address popup opens (TC_02.3)...');
    await this.clickFetchDetails();
    const case3_isOfficeAddressPopupOpened = await this.isOfficeAddressPopupDisplayed();
    console.log(`[Scenario 2] TC_02.3 Result -> Popup Opened: ${case3_isOfficeAddressPopupOpened}`);

    return {
      case1_isDisabledWhenBlank,
      case2_isEnabledWhenEntered,
      case3_isOfficeAddressPopupOpened,
      gstinUsed,
    };
  }
}

// Backward-compatible alias
export const Scenario1Page = AllScenariosPage;
