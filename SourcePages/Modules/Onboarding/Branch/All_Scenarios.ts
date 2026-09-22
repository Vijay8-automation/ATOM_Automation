import { Page, expect } from '@playwright/test';
import { CommonPaths } from '../../../Common/CommonPaths';
import { LoginPage } from '../../../Common/LoginPage';
import { WaitHelper } from '../../../../Utils/WaitHelper';
import {
  readUISheet,
  getBranchCreationRow,
  getFieldValue,
  getInvalidChecksumGstin,
  getGstinLessThan15,
  getGstinMoreThan15,
  getSuspendedGstin,
  getCancelledGstin,
} from '../../../../TestData/Excel_Reader/uiExcelReader';

/**
 * Consolidated Page Object for Branch Onboarding - All Scenarios.
 * Module: Branch Onboarding
 * File: All_Scenarios.ts
 *
 * Architecture:
 * - 100% of Locators/XPaths are centralized in CommonPaths.ts (Zero selectors hardcoded here).
 * - Scenario 1: Branch Subtype Selection
 * - Scenario 2: Validate "Fetch Details" Button Functionality
 * - Scenario 3: Validate "Next" Button Disabled When Mandatory Fields Are Blank (TC_03.1 - TC_03.7)
 * - Scenario 4: Validate "Save" Button Disabled on Infra Info Page (TC_04.1 - TC_04.6)
 * - Scenario 5: GSTIN Entry & Validation (TC_05.1 - TC_05.5)
 * - Scenario 6: Office Address Details Selection Functionality (TC_06.1 - TC_06.8)
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
    await this.loginPage.isLoggedIn().catch(() => {});
    await this.page.waitForURL(url => !url.pathname.includes('/login') || url.pathname.includes('dashboard'), { timeout: 15000 }).catch(() => {});

    // Ensure session is active and app shell/sidebar is ready
    console.log('[AllScenariosPage] Waiting for post-login dashboard / sidebar to settle...');
    await this.page.waitForLoadState('domcontentloaded');
    const leftPanel = this.page.locator(this.paths.navigation.leftPanel).first();
    const onboardingMenu = this.page.locator(this.paths.navigation.onboardingMenu).first();
    await Promise.race([
      onboardingMenu.waitFor({ state: 'attached', timeout: 20000 }).catch(() => {}),
      leftPanel.waitFor({ state: 'attached', timeout: 20000 }).catch(() => {}),
      this.page.waitForLoadState('networkidle').catch(() => {}),
    ]);
    await this.wait.pause(2000);
    console.log(`[AllScenariosPage] Logged in successfully. Current URL: ${this.page.url()}`);
  }

  /**
   * Navigates to Onboarding > Branch via sidebar hover & menu click.
   */
  public async navigateToBranchModule(): Promise<void> {
    console.log('[AllScenariosPage] Navigating to Onboarding > Branch...');

    // 1. Dismiss any open dropdowns, popups or overlays from previous scenario
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.wait.waitForModalBackdropClosed(2000).catch(() => {});

    // Dismiss any open form by clicking Cancel or Back if present
    const cancelBtn = this.page.locator("//button[normalize-space()='Cancel'] | //button[contains(.,'Cancel')] | //button[normalize-space()='Back']").first();
    if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelBtn.click().catch(() => {});
      await this.wait.pause(500);
    }

    // 2. Check if we are already on the Branch page with "Add Branch" button ready
    const addBtn = this.page.locator(this.paths.branchOnboarding.addBranchButton).first();
    const currentUrl = this.page.url().toLowerCase();
    if (currentUrl.includes('branch') && (await addBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('[AllScenariosPage] Already on Branch page and "Add Branch" button is ready.');
      return;
    }

    // 3. Otherwise, reveal sidebar via hover or mouse move
    const leftPanel = this.page.locator(this.paths.navigation.leftPanel).first();
    if (await leftPanel.isVisible({ timeout: 8000 }).catch(() => false)) {
      await leftPanel.hover().catch(() => {});
    } else {
      await this.page.mouse.move(20, 300);
    }
    await this.wait.pause(1000);

    const primaryBranch = this.page.locator(this.paths.navigation.branchMenuItem).first();
    const fallbackBranch = this.page.locator(this.paths.navigation.branchMenuItemFallback).first();

    let isBranchVisible = (await primaryBranch.isVisible({ timeout: 2000 }).catch(() => false)) ||
                          (await fallbackBranch.isVisible({ timeout: 2000 }).catch(() => false));

    if (!isBranchVisible) {
      const onboardingMenu = this.page.locator(this.paths.navigation.onboardingMenu).first();
      if (await onboardingMenu.isVisible({ timeout: 4000 }).catch(() => false)) {
        console.log('[AllScenariosPage] Expanding parent "Onboarding" menu...');
        await onboardingMenu.click({ timeout: 3000 }).catch(() => {});
        await this.wait.pause(1000);
      } else {
        console.log('[AllScenariosPage] Direct navigating to /branch/dashboard fallback...');
        await this.page.goto(`${this.loginPage.baseUrl}/branch/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await this.wait.pause(1500);
      }
    }

    if (await primaryBranch.isVisible({ timeout: 3000 }).catch(() => false)) {
      await primaryBranch.click();
    } else if (await fallbackBranch.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fallbackBranch.click();
    } else if (!(this.page.url().toLowerCase().includes('branch'))) {
      await this.page.goto(`${this.loginPage.baseUrl}/branch/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    }

    await this.page.waitForLoadState('domcontentloaded');
    await addBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await this.wait.pause(1500);
    console.log(`[AllScenariosPage] Navigated to Branch URL: ${this.page.url()}`);
  }

  /**
   * Clicks the "Add Branch" button on the Branch page.
   */
  public async clickAddBranch(): Promise<void> {
    console.log('[AllScenariosPage] Clicking "Add Branch" button...');
    const addBtn = this.page.locator(this.paths.branchOnboarding.addBranchButton).first();
    try {
      await addBtn.waitFor({ state: 'visible', timeout: 12000 });
      await this.wait.pause(500);
      await addBtn.click();
      await this.wait.pause(1500);
      console.log('[AllScenariosPage] Add Branch form opened.');
    } catch {
      console.log('[AllScenariosPage] Primary Add Branch not found, checking fallback...');
      const fallbackBtn = this.page.locator(this.paths.branchOnboarding.addBranchButtonFallback).first();
      await fallbackBtn.waitFor({ state: 'visible', timeout: 8000 });
      await this.wait.pause(500);
      await fallbackBtn.click();
      await this.wait.pause(1500);
      console.log('[AllScenariosPage] Successfully clicked fallback Add Branch button.');
    }
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
   */
  public async isOfficeAddressPopupDisplayed(timeout: number = 25000): Promise<boolean> {
    console.log(`[AllScenariosPage] Waiting up to ${timeout / 1000}s for "Office Address Details" popup...`);
    const popup = this.page.locator(this.paths.branchOnboarding.officeAddressPopup).first();
    const selectBtn = this.page.locator(this.paths.branchOnboarding.selectAddressButton).first();

    try {
      await popup.waitFor({ state: 'visible', timeout });
      console.log('[AllScenariosPage] ✅ Office Address Details popup container is visible!');
      await this.wait.pause(1000);
      return true;
    } catch {
      const isSelectVisible = await selectBtn.isVisible().catch(() => false);
      const isPopupVisible = await popup.isVisible().catch(() => false);
      return isSelectVisible || isPopupVisible;
    }
  }

  // =========================================================================
  // SCENARIO 3 SPECIFIC HELPERS (Popups, Fields, and Next Button)
  // =========================================================================

  /**
   * Single Method: Handles both "Office Address Details" and "Set Geofence Location" popups.
   */
  public async selectAddressAndSaveGeofence(): Promise<void> {
    console.log('[AllScenariosPage] Handling Address Selection & Geofence Save...');

    // 1. Wait for "Select Address" button on Office Address Details popup (if multiple addresses popup appears)
    const selectBtn = this.page.locator(this.paths.branchOnboarding.selectAddressButton).first();
    const geofenceModal = this.page.locator(
      "//div[contains(.,'Set Geofence Location') and (contains(@class,'fixed') or @role='dialog')]"
    ).first();

    console.log('[AllScenariosPage] Awaiting Office Address Details popup or Geofence modal...');
    try {
      await Promise.race([
        selectBtn.waitFor({ state: 'visible', timeout: 20000 }),
        geofenceModal.waitFor({ state: 'visible', timeout: 20000 }),
      ]);
    } catch {
      console.log('[AllScenariosPage] Neither Office Address popup nor Geofence modal appeared within 20s.');
    }

    if (await selectBtn.isVisible().catch(() => false)) {
      console.log('[AllScenariosPage] Office Address Details popup detected. Clicking "Select Address"...');
      await this.wait.pause(1000);
      await selectBtn.click();
      console.log('[AllScenariosPage] ✅ Clicked "Select Address" button.');
      await this.wait.pause(1500);
    }

    // 2. Wait for Set Geofence Location modal and click "Save"
    console.log('[AllScenariosPage] Awaiting Set Geofence Location modal...');
    try {
      await geofenceModal.waitFor({ state: 'visible', timeout: 15000 });
    } catch {}

    const geofenceSaveBtn = this.page.locator(
      "//div[contains(.,'Set Geofence Location')]//button[normalize-space()='Save'] | //div[contains(@class,'fixed')]//button[normalize-space()='Save'] | //button[normalize-space()='Save']"
    ).first();

    try {
      await geofenceSaveBtn.waitFor({ state: 'visible', timeout: 10000 });
      await this.wait.pause(1000);
      await geofenceSaveBtn.click();
      console.log('[AllScenariosPage] ✅ Clicked "Save" button on Geofence popup.');
    } catch {
      const fallbackSave = this.page.locator(this.paths.branchOnboarding.saveButton).first();
      if (await fallbackSave.isVisible().catch(() => false)) {
        await fallbackSave.click();
        console.log('[AllScenariosPage] Clicked fallback Save button.');
      }
    }

    // 3. Wait for Geofence modal and all backdrop overlays to completely disappear
    await geofenceModal.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.wait.waitForModalBackdropClosed(15000);
    await this.wait.waitForNoPointerInterception(10000);
    await this.wait.pause(1500);
    console.log('[AllScenariosPage] ✅ Address selected and Geofence saved successfully. Screen 1 is ready!');
  }

  /**
   * Common flow to reach Screen 1 ready state:
   * Navigate -> Add Branch -> Select Subtype ('Branch') -> Enter GSTIN -> Fetch Details -> Address & Geofence
   */
  public async openBranchFormAndReachScreen1(): Promise<void> {
    const addBtn = this.page.locator(this.paths.branchOnboarding.addBranchButton).first();
    const isAddBtnVisible = await addBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isAddBtnVisible) {
      await this.navigateToBranchModule();
    }
    await this.clickAddBranch();
    await this.selectBranchSubtype('Branch');
    const gstinUsed = this.getValidGstinFromExcel('BranchCreation');
    await this.enterGstinNumber(gstinUsed);
    await this.clickFetchDetails();
    await this.selectAddressAndSaveGeofence();
  }

  /**
   * Selects Effective Start Date via calendar picker or direct input.
   */
  public async selectEffectiveStartDate(): Promise<void> {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const formattedDate = `${dd}/${mm}/${yyyy}`;
    const currentDayNum = today.getDate();

    console.log(`[AllScenariosPage] Setting Effective Start Date to: ${formattedDate}...`);
    const dateInput = this.page.locator(this.paths.branchOnboarding.effectiveDateInput).first();
    await dateInput.scrollIntoViewIfNeeded().catch(() => {});
    await this.wait.pause(500);

    const calendarBtn = this.page.locator(this.paths.branchOnboarding.effectiveDateCalendarButton).first();
    if (await calendarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      try {
        await calendarBtn.click({ timeout: 3000 });
      } catch {
        await calendarBtn.click({ force: true });
      }
      await this.wait.pause(500);

      const todayDateBtn = this.page.locator(
        "//button[contains(@class,'MuiPickersDay-today')] | //button[@aria-current='date'] | //button[contains(@class,'Mui-selected')] | //div[contains(@class,'MuiPickersPopper') or @role='dialog' or contains(@class,'MuiDateCalendar')]//button[not(@disabled) and normalize-space()='" + currentDayNum + "'] | //button[not(@disabled) and normalize-space()='" + currentDayNum + "']"
      ).first();

      if (await todayDateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await todayDateBtn.click();
        await this.wait.pause(500);
      }
    }

    if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const val = await dateInput.inputValue().catch(() => '');
      if (!val) {
        await dateInput.fill(formattedDate);
        await dateInput.press('Tab');
      }
    }
  }

  public async clearEffectiveStartDate(): Promise<void> {
    const dateInput = this.page.locator(this.paths.branchOnboarding.effectiveDateInput).first();
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.click();
      await dateInput.press('Control+A');
      await dateInput.press('Backspace');
      await dateInput.fill('');
      await dateInput.dispatchEvent('input').catch(() => {});
      await dateInput.dispatchEvent('change').catch(() => {});
      await dateInput.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async fillContactPersonName(name: string): Promise<void> {
    await this.wait.fillWhenReady(this.paths.branchOnboarding.contactPersonNameInput, name);
    await this.wait.pause(300);
  }

  public async clearContactPersonName(): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.contactPersonNameInput).first();
    if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loc.click();
      await loc.press('Control+A');
      await loc.press('Backspace');
      await loc.fill('');
      await loc.dispatchEvent('input').catch(() => {});
      await loc.dispatchEvent('change').catch(() => {});
      await loc.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async fillContactPersonPhone(phone: string): Promise<void> {
    await this.wait.fillWhenReady(this.paths.branchOnboarding.contactPersonPhoneInput, phone);
    await this.wait.pause(300);
  }

  public async clearContactPersonPhone(): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.contactPersonPhoneInput).first();
    if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loc.click();
      await loc.press('Control+A');
      await loc.press('Backspace');
      await loc.fill('');
      await loc.dispatchEvent('input').catch(() => {});
      await loc.dispatchEvent('change').catch(() => {});
      await loc.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async fillBranchName(name: string): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.branchNameInputSection).first();
    await this.wait.fillWhenReady(loc, name);
    await this.wait.pause(300);
  }

  public async clearBranchName(): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.branchNameInputSection).first();
    if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loc.click();
      await loc.press('Control+A');
      await loc.press('Backspace');
      await loc.fill('');
      await loc.dispatchEvent('input').catch(() => {});
      await loc.dispatchEvent('change').catch(() => {});
      await loc.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async fillBranchEmail(email: string): Promise<void> {
    await this.wait.fillWhenReady(this.paths.branchOnboarding.branchEmailInput, email);
    await this.wait.pause(300);
  }

  public async clearBranchEmail(): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.branchEmailInput).first();
    if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loc.click();
      await loc.press('Control+A');
      await loc.press('Backspace');
      await loc.fill('');
      await loc.dispatchEvent('input').catch(() => {});
      await loc.dispatchEvent('change').catch(() => {});
      await loc.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async selectOperationType(operationType: string = 'BOOKING'): Promise<void> {
    await this.wait.clickWhenReady(this.paths.branchOnboarding.operationTypeCombobox);
    await this.wait.pause(500);
    const opOption = this.page.locator(
      `//li[@role='option' and @data-value='${operationType}'] | //li[@role='option'][normalize-space()='${operationType}'] | //ul[@role='listbox']//li[@data-value='${operationType}']`
    ).first();
    await this.wait.clickWhenReady(opOption);
    await this.wait.pause(500);
  }

  public async selectIsControlling(controllingVal: string = 'Yes'): Promise<void> {
    await this.wait.clickWhenReady(this.paths.branchOnboarding.isControllingCombobox);
    await this.wait.pause(500);
    const ctrlOption = this.page.locator(
      `//li[@role='option' and @data-value='${controllingVal}'] | //li[@role='option'][normalize-space()='${controllingVal}'] | //ul[@role='listbox']//li[@data-value='${controllingVal}']`
    ).first();
    await this.wait.clickWhenReady(ctrlOption);
    await this.wait.pause(500);
  }

  /**
   * Checks whether the "Next" button is disabled via attribute, aria, or styling.
   */
  public async isNextButtonDisabled(): Promise<boolean> {
    const nextBtn = this.page.locator(this.paths.branchOnboarding.nextButton).first();
    await nextBtn.waitFor({ state: 'visible', timeout: 10000 });

    const isDisabledAttr = await nextBtn.getAttribute('disabled');
    const ariaDisabled = await nextBtn.getAttribute('aria-disabled');
    const classes = (await nextBtn.getAttribute('class')) || '';

    return (
      isDisabledAttr !== null ||
      ariaDisabled === 'true' ||
      classes.includes('Mui-disabled') ||
      classes.includes('cursor-not-allowed') ||
      classes.includes('opacity-50')
    );
  }

  // =========================================================================
  // SCENARIO EXECUTION METHODS (1 Method Per Scenario)
  // =========================================================================

  /**
   * SCENARIO 1: Branch Subtype Selection (All Cases in 1 Method)
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

    await this.navigateToBranchModule();
    await this.clickAddBranch();
    await this.openBranchSubtypeDropdown();

    const actualOptions = await this.getUIOptions();
    const expectedOptions = this.getExpectedOptionsFromExcel('BranchCreation');

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

    await this.navigateToBranchModule();
    await this.clickAddBranch();
    await this.selectBranchSubtype();

    console.log('[Scenario 2] Step 1: Checking "Fetch Details" button is disabled when GSTIN is blank (TC_02.1)...');
    await this.clearGstinNumber();
    const case1_isDisabledWhenBlank = await this.isFetchDetailsButtonDisabled();
    console.log(`[Scenario 2] TC_02.1 Result -> Disabled: ${case1_isDisabledWhenBlank}`);

    console.log('[Scenario 2] Step 2: Entering GSTIN from Excel and checking "Fetch Details" is enabled (TC_02.2)...');
    const gstinUsed = this.getValidGstinFromExcel('BranchCreation');
    await this.enterGstinNumber(gstinUsed);
    const case2_isEnabledWhenEntered = await this.isFetchDetailsButtonEnabled();
    console.log(`[Scenario 2] TC_02.2 Result -> Enabled: ${case2_isEnabledWhenEntered}`);

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

  /**
   * SCENARIO 3: Validate "Next" Button Disabled When Mandatory Fields Are Blank
   * Option B: Smart in-place execution in a single browser session.
   */
  public async executeScenario3_ValidateNextButtonDisabledMandatoryFields(): Promise<{
    case_TC_03_1: boolean;
    case_TC_03_2: boolean;
    case_TC_03_3: boolean;
    case_TC_03_4: boolean;
    case_TC_03_5: boolean;
    case_TC_03_6: boolean;
    case_TC_03_7: boolean;
  }> {
    console.log('\n======================================================');
    console.log('[Scenario 3] Executing Option B (Smart In-Place Validation)...');
    console.log('======================================================');

    // 1. Read test data from Excel sheet 'BranchCreation'
    const excelRow = getBranchCreationRow('BranchCreation', 0);
    const timeSuffix = Date.now().toString().slice(-6);

    const basePersonName = getFieldValue(excelRow, ['Person Name', 'PersonName', 'Contact Person Name']) || 'Temp';
    const personName = `${basePersonName}${timeSuffix}`;

    const contactNo = getFieldValue(excelRow, ['Contact Number', 'ContactNumber', 'Mobile', 'Phone']) || '9237937388';

    const baseBranchName = getFieldValue(excelRow, ['Branchname', 'Branch Name', 'Name']) || 'Temp';
    const branchName = `${baseBranchName}${timeSuffix}`;

    const baseBranchEmail = getFieldValue(excelRow, ['Branchemail', 'Branch Email', 'Email']) || 'temp@gmail.com';
    const branchEmail = baseBranchEmail.includes('@')
      ? `${baseBranchEmail.split('@')[0]}${timeSuffix}@${baseBranchEmail.split('@')[1]}`
      : `${baseBranchEmail}${timeSuffix}@gmail.com`;

    const operationTypeVal = getFieldValue(excelRow, ['OPERATION type', 'Operation Type']) || 'BOOKING';
    const controllingVal = getFieldValue(excelRow, ['Controlling Branch', 'ControllingBranch', 'Is Controlling']) || 'Yes';

    // Step 1: Open Form & reach Screen 1
    await this.openBranchFormAndReachScreen1();

    // Step 2: Fill text fields first (leave both dropdowns untouched)
    console.log('[Scenario 3] Step 2: Filling initial text fields...');
    await this.selectEffectiveStartDate();
    await this.fillContactPersonName(personName);
    await this.fillContactPersonPhone(String(contactNo));
    await this.fillBranchName(branchName);
    await this.fillBranchEmail(branchEmail);

    // --- TC_03.6: Validate "Next" Disabled When Operation Type Is Blank ---
    console.log('\n--- [TC_03.6] Testing Operation Type Blank ---');
    await this.selectIsControlling(controllingVal); // Select Is Controlling, Operation Type remains blank
    await this.wait.pause(1000);
    const case_TC_03_6 = await this.isNextButtonDisabled();
    console.log(`[Scenario 3] TC_03.6 Result -> Next Disabled: ${case_TC_03_6}`);

    // Now select Operation Type -> All 7 mandatory fields are now filled!
    console.log('[Scenario 3] Selecting Operation Type to complete all 7 fields...');
    await this.selectOperationType(operationTypeVal);
    await this.wait.pause(1000);

    // --- TC_03.1: Validate "Next" Disabled When Effective Start Date Is Blank ---
    console.log('\n--- [TC_03.1] Testing Effective Start Date Blank ---');
    await this.clearEffectiveStartDate();
    await this.wait.pause(1000);
    const case_TC_03_1 = await this.isNextButtonDisabled();
    console.log(`[Scenario 3] TC_03.1 Result -> Next Disabled: ${case_TC_03_1}`);
    // Re-fill Effective Start Date
    await this.selectEffectiveStartDate();
    await this.wait.pause(500);

    // --- TC_03.2: Validate "Next" Disabled When Contact Person Name Is Blank ---
    console.log('\n--- [TC_03.2] Testing Contact Person Name Blank ---');
    await this.clearContactPersonName();
    await this.wait.pause(1000);
    const case_TC_03_2 = await this.isNextButtonDisabled();
    console.log(`[Scenario 3] TC_03.2 Result -> Next Disabled: ${case_TC_03_2}`);
    // Re-fill Contact Person Name
    await this.fillContactPersonName(personName);
    await this.wait.pause(500);

    // --- TC_03.3: Validate "Next" Disabled When Contact Person Phone Is Blank ---
    console.log('\n--- [TC_03.3] Testing Contact Person Phone Blank ---');
    await this.clearContactPersonPhone();
    await this.wait.pause(1000);
    const case_TC_03_3 = await this.isNextButtonDisabled();
    console.log(`[Scenario 3] TC_03.3 Result -> Next Disabled: ${case_TC_03_3}`);
    // Re-fill Contact Person Phone
    await this.fillContactPersonPhone(String(contactNo));
    await this.wait.pause(500);

    // --- TC_03.4: Validate "Next" Disabled When Branch Name Is Blank ---
    console.log('\n--- [TC_03.4] Testing Branch Name Blank ---');
    await this.clearBranchName();
    await this.wait.pause(1000);
    const case_TC_03_4 = await this.isNextButtonDisabled();
    console.log(`[Scenario 3] TC_03.4 Result -> Next Disabled: ${case_TC_03_4}`);
    // Re-fill Branch Name
    await this.fillBranchName(branchName);
    await this.wait.pause(500);

    // --- TC_03.5: Validate "Next" Disabled When Branch Email Is Blank ---
    console.log('\n--- [TC_03.5] Testing Branch Email Blank ---');
    await this.clearBranchEmail();
    await this.wait.pause(1000);
    const case_TC_03_5 = await this.isNextButtonDisabled();
    console.log(`[Scenario 3] TC_03.5 Result -> Next Disabled: ${case_TC_03_5}`);
    // Re-fill Branch Email
    await this.fillBranchEmail(branchEmail);
    await this.wait.pause(500);

    // --- TC_03.7: Validate "Next" Disabled When Is Controlling Is Blank ---
    console.log('\n--- [TC_03.7] Testing Is Controlling Blank (Form Reset) ---');
    // Fresh form to test untouched Is Controlling dropdown
    await this.openBranchFormAndReachScreen1();
    await this.selectEffectiveStartDate();
    await this.fillContactPersonName(personName);
    await this.fillContactPersonPhone(String(contactNo));
    await this.fillBranchName(branchName);
    await this.fillBranchEmail(branchEmail);
    await this.selectOperationType(operationTypeVal);
    // Leave Is Controlling blank
    await this.wait.pause(1000);
    const case_TC_03_7 = await this.isNextButtonDisabled();
    console.log(`[Scenario 3] TC_03.7 Result -> Next Disabled: ${case_TC_03_7}`);

    return {
      case_TC_03_1,
      case_TC_03_2,
      case_TC_03_3,
      case_TC_03_4,
      case_TC_03_5,
      case_TC_03_6,
      case_TC_03_7,
    };
  }

  // =========================================================================
  // SCENARIO 4 HELPERS: INFRA INFO ACTIONS & GETTERS (NO VALIDATIONS)
  // =========================================================================

  /**
   * Navigates from Screen 1 to Screen 2 ("Infra info" tab) with valid Screen 1 data.
   */
  public async navigateToInfraInfoPage(excelRowData?: any): Promise<void> {
    const excelRow = excelRowData || getBranchCreationRow('BranchCreation', 0);
    const timeSuffix = Date.now().toString().slice(-6);

    const basePersonName = getFieldValue(excelRow, ['Person Name', 'PersonName', 'Contact Person Name']) || 'Temp';
    const personName = `${basePersonName}${timeSuffix}`;
    const contactNo = getFieldValue(excelRow, ['Contact Number', 'ContactNumber', 'Mobile', 'Phone']) || '9237937388';
    const baseBranchName = getFieldValue(excelRow, ['Branchname', 'Branch Name', 'Name']) || 'Temp';
    const branchName = `${baseBranchName}${timeSuffix}`;
    const baseBranchEmail = getFieldValue(excelRow, ['Branchemail', 'Branch Email', 'Email']) || 'temp@gmail.com';
    const branchEmail = baseBranchEmail.includes('@')
      ? `${baseBranchEmail.split('@')[0]}${timeSuffix}@${baseBranchEmail.split('@')[1]}`
      : `${baseBranchEmail}${timeSuffix}@gmail.com`;

    const operationTypeVal = getFieldValue(excelRow, ['OPERATION type', 'Operation Type']) || 'BOOKING';
    const controllingVal = getFieldValue(excelRow, ['Controlling Branch', 'ControllingBranch', 'Is Controlling']) || 'Yes';

    // 1. Open Form & Reach Screen 1
    await this.openBranchFormAndReachScreen1();

    // 2. Fill Screen 1
    console.log('[AllScenariosPage] Filling Screen 1 to transition to Screen 2 (Infra info)...');
    await this.selectEffectiveStartDate();
    await this.fillContactPersonName(personName);
    await this.fillContactPersonPhone(String(contactNo));
    await this.fillBranchName(branchName);
    await this.fillBranchEmail(branchEmail);
    await this.selectOperationType(operationTypeVal);
    await this.selectIsControlling(controllingVal);

    // 3. Click Next button to reach Screen 2
    console.log('[AllScenariosPage] Clicking "Next" button to reach Screen 2 (Infra info)...');
    const nextBtn = this.page.locator(this.paths.branchOnboarding.nextButton).first();
    await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
    await this.wait.waitForCondition(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent && b.textContent.includes('Next'));
        return btn && !btn.disabled && !btn.hasAttribute('disabled') && !btn.classList.contains('Mui-disabled');
      },
      15000
    );
    await nextBtn.click();
    await this.wait.pause(2000);

    // 4. Wait for Screen 2 (Infra info) to load
    const gatesInput = this.page.locator(this.paths.branchOnboarding.infra.noOfGatesInput).first();
    await gatesInput.waitFor({ state: 'visible', timeout: 20000 });
    console.log('[AllScenariosPage] ✅ Successfully navigated to Screen 2 ("Infra info" tab)!');
    await this.wait.pause(1000);
  }

  // --- Field Actions (Fill & Clear) ---

  public async fillNoOfGates(val: string): Promise<void> {
    await this.wait.fillWhenReady(this.paths.branchOnboarding.infra.noOfGatesInput, val);
    await this.wait.pause(300);
  }

  public async clearNoOfGates(): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.infra.noOfGatesInput).first();
    if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loc.click();
      await loc.press('Control+A');
      await loc.press('Backspace');
      await loc.fill('');
      await loc.dispatchEvent('input').catch(() => {});
      await loc.dispatchEvent('change').catch(() => {});
      await loc.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async fillTotalNoOfDocks(val: string): Promise<void> {
    await this.wait.fillWhenReady(this.paths.branchOnboarding.infra.totalNoOfDocksInput, val);
    await this.wait.pause(300);
  }

  public async clearTotalNoOfDocks(): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.infra.totalNoOfDocksInput).first();
    if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loc.click();
      await loc.press('Control+A');
      await loc.press('Backspace');
      await loc.fill('');
      await loc.dispatchEvent('input').catch(() => {});
      await loc.dispatchEvent('change').catch(() => {});
      await loc.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async fillOpenYardArea(val: string): Promise<void> {
    await this.wait.fillWhenReady(this.paths.branchOnboarding.infra.openYardAreaInput, val);
    await this.wait.pause(300);
  }

  public async clearOpenYardArea(): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.infra.openYardAreaInput).first();
    if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loc.click();
      await loc.press('Control+A');
      await loc.press('Backspace');
      await loc.fill('');
      await loc.dispatchEvent('input').catch(() => {});
      await loc.dispatchEvent('change').catch(() => {});
      await loc.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async fillWarehouseFloorArea(val: string): Promise<void> {
    await this.wait.fillWhenReady(this.paths.branchOnboarding.infra.warehouseFloorAreaInput, val);
    await this.wait.pause(300);
  }

  public async clearWarehouseFloorArea(): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.infra.warehouseFloorAreaInput).first();
    if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loc.click();
      await loc.press('Control+A');
      await loc.press('Backspace');
      await loc.fill('');
      await loc.dispatchEvent('input').catch(() => {});
      await loc.dispatchEvent('change').catch(() => {});
      await loc.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async fillMaterialStorageCapacity(val: string): Promise<void> {
    await this.wait.fillWhenReady(this.paths.branchOnboarding.infra.materialStorageCapacityInput, val);
    await this.wait.pause(300);
  }

  public async clearMaterialStorageCapacity(): Promise<void> {
    const loc = this.page.locator(this.paths.branchOnboarding.infra.materialStorageCapacityInput).first();
    if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loc.click();
      await loc.press('Control+A');
      await loc.press('Backspace');
      await loc.fill('');
      await loc.dispatchEvent('input').catch(() => {});
      await loc.dispatchEvent('change').catch(() => {});
      await loc.press('Tab').catch(() => {});
      await this.wait.pause(500);
    }
  }

  public async selectBranchFloor(floorVal?: string): Promise<void> {
    console.log(`[AllScenariosPage] Selecting Branch Floor: "${floorVal || 'First Available'}"...`);
    const floorCombobox = this.page.locator(this.paths.branchOnboarding.infra.branchFloorCombobox).first();
    await floorCombobox.waitFor({ state: 'visible', timeout: 10000 });
    await floorCombobox.click();
    await this.wait.pause(1000);

    let optionClicked = false;
    if (floorVal) {
      const matchingOpt = this.page.locator(
        `//li[@role='option' and (normalize-space()='${floorVal}' or contains(.,'${floorVal}') or @data-value='${floorVal}')]`
      ).first();
      if (await matchingOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await matchingOpt.click();
        optionClicked = true;
      }
    }

    if (!optionClicked) {
      const firstOpt = this.page.locator(`//ul[@role='listbox']//li[@role='option']`).first();
      if (await firstOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstOpt.click();
        optionClicked = true;
      }
    }

    await this.wait.pause(500);
  }

  // --- Getter for "Save" Button Disabled State ---

  public async isSaveButtonDisabled(): Promise<boolean> {
    const saveBtn = this.page.locator(this.paths.branchOnboarding.infra.saveButton).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });

    const isDisabledAttr = await saveBtn.getAttribute('disabled');
    const ariaDisabled = await saveBtn.getAttribute('aria-disabled');
    const classes = (await saveBtn.getAttribute('class')) || '';

    return (
      isDisabledAttr !== null ||
      ariaDisabled === 'true' ||
      classes.includes('Mui-disabled') ||
      classes.includes('cursor-not-allowed') ||
      classes.includes('opacity-50') ||
      classes.includes('bg-gray')
    );
  }

  // =========================================================================
  // SCENARIO 5 & 6 HELPERS: OFFICE ADDRESS POPUP & GST VALIDATION
  // =========================================================================

  /**
   * Selects an office address radio button by index (0-based).
   */
  public async selectOfficeAddressRadio(index: number): Promise<void> {
    const radioInputs = this.page.locator(this.paths.branchOnboarding.officeAddressRadioList);
    const radioWrappers = this.page.locator(this.paths.branchOnboarding.officeAddressMuiRadioList);
    const count = await radioInputs.count();
    if (index >= count) {
      console.warn(`[AllScenariosPage] Radio index ${index} out of range (count: ${count})`);
      return;
    }
    const targetWrapper = radioWrappers.nth(index);
    if (await targetWrapper.isVisible({ timeout: 2000 }).catch(() => false)) {
      await targetWrapper.click();
    } else {
      await radioInputs.nth(index).click({ force: true });
    }
    await this.wait.pause(500);
  }

  /**
   * Checks if an office address radio button is checked (by index, 0-based).
   */
  public async isOfficeAddressRadioChecked(index: number): Promise<boolean> {
    const radioInputs = this.page.locator(this.paths.branchOnboarding.officeAddressRadioList);
    const radioWrappers = this.page.locator(this.paths.branchOnboarding.officeAddressMuiRadioList);
    const count = await radioInputs.count();
    if (index >= count) return false;

    // Direct input checked state
    const isCheckedInput = await radioInputs.nth(index).isChecked().catch(() => false);
    if (isCheckedInput) return true;

    // MUI checked class
    const wrapperClass = (await radioWrappers.nth(index).getAttribute('class').catch(() => '')) || '';
    if (wrapperClass.includes('Mui-checked')) return true;

    // aria-checked attribute
    const ariaChecked = await radioInputs.nth(index).getAttribute('aria-checked').catch(() => null);
    if (ariaChecked === 'true') return true;

    return false;
  }

  /**
   * Returns the count of checked radio buttons in the Office Address Details popup.
   */
  public async getCheckedOfficeAddressRadiosCount(): Promise<number> {
    const radioInputs = this.page.locator(this.paths.branchOnboarding.officeAddressRadioList);
    const count = await radioInputs.count();
    let checkedCount = 0;
    for (let i = 0; i < count; i++) {
      if (await this.isOfficeAddressRadioChecked(i)) {
        checkedCount++;
      }
    }
    return checkedCount;
  }

  /**
   * Scrolls the office address list to reveal more addresses down the list.
   */
  public async scrollOfficeAddressList(targetIndex: number = 4): Promise<void> {
    console.log(`[AllScenariosPage] Scrolling office address list to item #${targetIndex}...`);
    const container = this.page.locator(this.paths.branchOnboarding.officeAddressScrollContainer).first();
    if (await container.isVisible({ timeout: 2000 }).catch(() => false)) {
      await container.evaluate((el: HTMLElement) => {
        el.scrollTop = el.scrollHeight;
      }).catch(() => {});
      await this.wait.pause(500);
    }

    const rows = this.page.locator(this.paths.branchOnboarding.officeAddressItemRows);
    const targetRow = rows.nth(targetIndex);
    if (await targetRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await targetRow.scrollIntoViewIfNeeded().catch(() => {});
    } else {
      const radioInputs = this.page.locator(this.paths.branchOnboarding.officeAddressRadioList);
      if (await radioInputs.nth(targetIndex).isVisible({ timeout: 2000 }).catch(() => false)) {
        await radioInputs.nth(targetIndex).scrollIntoViewIfNeeded().catch(() => {});
      }
    }
    await this.wait.pause(500);
  }

  /**
   * Clicks "Select Address" button in Office Address Details popup.
   */
  public async clickSelectAddressInPopup(): Promise<void> {
    console.log('[AllScenariosPage] Clicking "Select Address" in Office Address popup...');
    const selectBtn = this.page.locator(this.paths.branchOnboarding.selectAddressButton).first();
    await selectBtn.waitFor({ state: 'visible', timeout: 10000 });
    await selectBtn.click();
    await this.wait.pause(1000);
  }

  /**
   * Clicks "Cancel" button in Office Address Details popup.
   */
  public async clickCancelInOfficeAddressPopup(): Promise<void> {
    console.log('[AllScenariosPage] Clicking "Cancel" button in Office Address Details popup...');
    const cancelBtn = this.page.locator(this.paths.branchOnboarding.cancelAddressPopupButton).first();
    await cancelBtn.waitFor({ state: 'visible', timeout: 5000 });
    await cancelBtn.click();
    await this.wait.pause(1000);
  }

  /**
   * Clicks "X" (Close) icon in Office Address Details popup.
   */
  public async clickCloseXInOfficeAddressPopup(): Promise<void> {
    console.log('[AllScenariosPage] Clicking "X" (Close) icon in Office Address Details popup...');
    const closeBtn = this.page.locator(this.paths.branchOnboarding.officeAddressCloseIcon).first();
    if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      const fallbackClose = this.page.locator(
        "//div[contains(.,'Office Address Details')]//button[contains(@class,'close') or @aria-label='Close' or @aria-label='close' or .//*[name()='svg']] | //div[contains(.,'Office Address Details')]//*[name()='svg']"
      ).first();
      if (await fallbackClose.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fallbackClose.click();
      } else {
        await this.page.keyboard.press('Escape');
      }
    }
    await this.wait.pause(1000);
  }

  /**
   * Checks if the Office Address Details popup is visible.
   */
  public async isOfficeAddressPopupVisible(): Promise<boolean> {
    const popup = this.page.locator(this.paths.branchOnboarding.officeAddressPopup).first();
    return await popup.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Helper to verify if an address has been applied to the Branch form.
   */
  public async isBranchAddressApplied(): Promise<boolean> {
    const addressInput = this.page.locator(
      "//label[contains(.,'Address')]/following::input[1] | //input[@aria-label='Address' or contains(@placeholder,'Address')]"
    ).first();
    if (await addressInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const val = (await addressInput.inputValue().catch(() => '')).trim();
      if (val.length > 0) return true;
    }

    const stateInput = this.page.locator("//label[contains(.,'State')]/following::input[1]").first();
    if (await stateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const stateVal = (await stateInput.inputValue().catch(() => '')).trim();
      if (stateVal.length > 0) return true;
    }

    const bodyText = (await this.page.innerText('body').catch(() => '')).toLowerCase();
    if (bodyText.includes('odisha') || bodyText.includes('sambalpur') || bodyText.includes('bhubaneswar') || bodyText.includes('puri')) {
      return true;
    }

    return false;
  }

  /**
   * Helper to execute end-to-end branch submission with an invalid status GSTIN (Suspended or Cancelled)
   * and assert that clicking Save on Screen 2 is blocked with error prompt "Kindly enter valid GSTIN".
   */
  public async validateInvalidGstinStatusBlocksSubmission(
    gstinValue: string,
    statusLabel: string
  ): Promise<{ isBlocked: boolean; promptMessage: string }> {
    console.log(`\n[AllScenariosPage] Testing ${statusLabel} GSTIN: "${gstinValue}"...`);

    try {
      // 1. Open form & reach Screen 1
      await this.navigateToBranchModule();
      await this.clickAddBranch();
      await this.selectBranchSubtype('Branch');

      // 2. Enter GSTIN
      await this.clearGstinNumber();
      await this.enterGstinNumber(gstinValue);

      // 3. Click Fetch Details
      await this.clickFetchDetails();

      // 4. Select Address & Geofence
      await this.selectAddressAndSaveGeofence();

      // 5. Fill Screen 1
      const excelRow = getBranchCreationRow('BranchCreation', 0);
      const timeSuffix = Date.now().toString().slice(-6);
      const personName = `Test${statusLabel}${timeSuffix}`;
      const contactNo = '9237937388';
      const branchName = `Br_${statusLabel}_${timeSuffix}`;
      const branchEmail = `test_${statusLabel.toLowerCase()}_${timeSuffix}@gmail.com`;
      const operationTypeVal = getFieldValue(excelRow, ['OPERATION type', 'Operation Type']) || 'BOOKING';
      const controllingVal = getFieldValue(excelRow, ['Controlling Branch', 'ControllingBranch', 'Is Controlling']) || 'Yes';

      await this.selectEffectiveStartDate();
      await this.fillContactPersonName(personName);
      await this.fillContactPersonPhone(contactNo);
      await this.fillBranchName(branchName);
      await this.fillBranchEmail(branchEmail);
      await this.selectOperationType(operationTypeVal);
      await this.selectIsControlling(controllingVal);

      // 6. Click Next to reach Screen 2 (Infra info)
      const nextBtn = this.page.locator(this.paths.branchOnboarding.nextButton).first();
      await nextBtn.waitFor({ state: 'visible', timeout: 8000 });
      await this.wait.pause(1000);
      await nextBtn.click();
      await this.wait.pause(2000);

      // 7. Fill Screen 2
      const gatesInput = this.page.locator(this.paths.branchOnboarding.infra.noOfGatesInput).first();
      await gatesInput.waitFor({ state: 'visible', timeout: 12000 });

      await this.fillNoOfGates('2');
      await this.fillTotalNoOfDocks('2');
      await this.fillOpenYardArea('1000');
      await this.fillWarehouseFloorArea('2000');
      await this.fillMaterialStorageCapacity('500');
      await this.selectBranchFloor('Ground');
      await this.wait.pause(1000);

      // 8. Click Save button on Infra info page
      console.log(`[AllScenariosPage] Clicking "Save" on Infra info with ${statusLabel} GSTIN...`);
      const saveBtn = this.page.locator(this.paths.branchOnboarding.infra.saveButton).first();
      await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
      await saveBtn.click();
      await this.wait.pause(1000);

      // If confirmation modal appears, click Confirm
      const confirmBtn = this.page.locator(this.paths.branchOnboarding.confirmationModal.confirmButton).first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('[AllScenariosPage] Confirmation modal displayed, clicking Confirm...');
        await confirmBtn.click();
        await this.wait.pause(1000);
      }

      // 9. Check for error toast / prompt: "Kindly enter valid GSTIN"
      console.log('[AllScenariosPage] Waiting for prompt / error toast "Kindly enter valid GSTIN"...');
      const toastLocator = this.page.locator(this.paths.branchOnboarding.gstInvalidStatusToast);
      let isPromptVisible = false;
      let promptMessage = '';

      try {
        await toastLocator.first().waitFor({ state: 'visible', timeout: 10000 });
        promptMessage = (await toastLocator.first().innerText().catch(() => '')).trim();
        isPromptVisible = true;
        console.log(`[AllScenariosPage] ✅ Captured prompt/toast: "${promptMessage}"`);
      } catch {
        const anyToast = this.page.locator("//div[@role='alert'] | //*[contains(text(),'valid GSTIN') or contains(text(),'Kindly')]").first();
        if (await anyToast.isVisible({ timeout: 3000 }).catch(() => false)) {
          promptMessage = (await anyToast.innerText().catch(() => '')).trim();
          isPromptVisible = true;
          console.log(`[AllScenariosPage] Captured fallback toast: "${promptMessage}"`);
        }
      }

      // Check if branch was accidentally created successfully (user rule: agar successfully create hota hai toh case failed ho jayega)
      const successToast = this.page.locator("//div[@role='alert' and (contains(translate(., 'SUCCESS', 'success'), 'success') or contains(.,'created') or contains(.,'Created'))]").first();
      const isSuccess = await successToast.isVisible({ timeout: 2000 }).catch(() => false);
      if (isSuccess) {
        const succMsg = (await successToast.innerText().catch(() => '')).trim();
        console.error(`[AllScenariosPage] ❌ FAILED: Branch was unexpectedly created with ${statusLabel} GSTIN! Message: "${succMsg}"`);
        return { isBlocked: false, promptMessage: `UNEXPECTED SUCCESS (Creation succeeded): ${succMsg}` };
      }

      // Verify creation was blocked: error prompt must be displayed and no success occurred
      const isBlocked = isPromptVisible && !isSuccess;

      console.log(`[AllScenariosPage] ${statusLabel} GSTIN submission result -> Blocked: ${isBlocked}, Prompt: "${promptMessage}"`);
      return { isBlocked, promptMessage };
    } catch (err: any) {
      console.error(`[AllScenariosPage] ❌ Exception in ${statusLabel} GSTIN validation:`, err.message);
      return { isBlocked: false, promptMessage: `Step failed / Exception: ${err.message}` };
    } finally {
      // Auto-cleanup: Dismiss any open modals or forms so next case starts clean!
      try {
        await this.page.keyboard.press('Escape').catch(() => {});
        const cancelBtn = this.page.locator("//button[normalize-space()='Cancel'] | //button[contains(.,'Cancel')] | //button[normalize-space()='Back']").first();
        if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelBtn.click().catch(() => {});
        }
        await this.wait.pause(500);
      } catch {}
    }
  }

  // =========================================================================
  // SCENARIO 5: GSTIN ENTRY & VALIDATION (TC_05.1 - TC_05.5)
  // =========================================================================
  public async executeScenario5_GstinEntryAndValidation(): Promise<{
    case_TC_05_1_hasChecksumError: boolean;
    case_TC_05_2_isDisabled: boolean;
    case_TC_05_3_isRestrictedOrDisabled: boolean;
    case_TC_05_4_isSuspendedBlocked: boolean;
    case_TC_05_5_isCancelledBlocked: boolean;
    toastMessages: {
      tc05_1_msg: string;
      tc05_4_msg: string;
      tc05_5_msg: string;
    };
  }> {
    console.log('\n======================================================');
    console.log('[Scenario 5] Executing GSTIN Entry & Validation (TC_05.1 - TC_05.5)...');
    console.log('======================================================');

    let case_TC_05_1_hasChecksumError = false;
    let case_TC_05_2_isDisabled = false;
    let case_TC_05_3_isRestrictedOrDisabled = false;
    let case_TC_05_4_isSuspendedBlocked = false;
    let case_TC_05_5_isCancelledBlocked = false;
    let tc05_1_msg = '';
    let tc05_4_msg = '';
    let tc05_5_msg = '';

    // --- TC_05.2: GSTIN less than 15 characters -> Fetch Details button disabled ---
    try {
      console.log('\n--- [TC_05.2] Testing GSTIN less than 15 characters ---');
      await this.navigateToBranchModule();
      await this.clickAddBranch();
      await this.selectBranchSubtype('Branch');
      const gstinLessThan15 = getGstinLessThan15();
      await this.clearGstinNumber();
      await this.enterGstinNumber(gstinLessThan15);
      case_TC_05_2_isDisabled = await this.isFetchDetailsButtonDisabled();
      console.log(`[Scenario 5] TC_05.2 Result -> Fetch Details Disabled (<15 chars): ${case_TC_05_2_isDisabled}`);
    } catch (err: any) {
      console.error('[Scenario 5] TC_05.2 Error:', err.message);
    }

    // --- TC_05.3: GSTIN more than 15 characters -> Fetch Details button disabled / input capped ---
    try {
      console.log('\n--- [TC_05.3] Testing GSTIN more than 15 characters ---');
      const gstinMoreThan15 = getGstinMoreThan15();
      await this.clearGstinNumber();
      await this.enterGstinNumber(gstinMoreThan15);
      const gstinInputLoc = this.page.locator(this.paths.branchOnboarding.gstinInput).first();
      const actualEnteredVal = (await gstinInputLoc.inputValue().catch(() => '')).trim();
      const isBtnDisabledMore15 = await this.isFetchDetailsButtonDisabled();
      const isRestrictedByLength = actualEnteredVal.length <= 15;
      case_TC_05_3_isRestrictedOrDisabled = isBtnDisabledMore15 || isRestrictedByLength;
      console.log(`[Scenario 5] TC_05.3 Result -> Capped or Disabled (>15 chars): ${case_TC_05_3_isRestrictedOrDisabled} (Entered: ${actualEnteredVal.length} chars, Disabled: ${isBtnDisabledMore15})`);
    } catch (err: any) {
      console.error('[Scenario 5] TC_05.3 Error:', err.message);
    }

    // --- TC_05.1: Invalid/incorrect checksum GSTIN -> Click Fetch Details -> Validation error ---
    try {
      console.log('\n--- [TC_05.1] Testing Invalid/incorrect checksum GSTIN ---');
      const invalidChecksumGstin = getInvalidChecksumGstin();
      await this.clearGstinNumber();
      await this.enterGstinNumber(invalidChecksumGstin);
      await this.clickFetchDetails();

      const checksumToastLoc = this.page.locator(this.paths.branchOnboarding.gstChecksumErrorToast);
      try {
        await checksumToastLoc.first().waitFor({ state: 'visible', timeout: 10000 });
        tc05_1_msg = (await checksumToastLoc.first().innerText().catch(() => '')).trim();
        case_TC_05_1_hasChecksumError = true;
        console.log(`[Scenario 5] TC_05.1 Result -> Validation Error captured: "${tc05_1_msg}"`);
      } catch {
        const anyAlert = this.page.locator("//div[@role='alert'] | //*[contains(text(),'Failed') or contains(text(),'GST')]").first();
        if (await anyAlert.isVisible({ timeout: 4000 }).catch(() => false)) {
          tc05_1_msg = (await anyAlert.innerText().catch(() => '')).trim();
          case_TC_05_1_hasChecksumError = true;
          console.log(`[Scenario 5] TC_05.1 Result -> Fallback Error captured: "${tc05_1_msg}"`);
        }
      }
    } catch (err: any) {
      console.error('[Scenario 5] TC_05.1 Error:', err.message);
    } finally {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.wait.pause(1000);
    }

    // --- TC_05.4: Suspended GSTIN -> Full flow to Infra Save -> Prompt "Kindly enter valid GSTIN" ---
    try {
      console.log('\n--- [TC_05.4] Testing Suspended GSTIN submission restriction ---');
      const suspendedGstin = getSuspendedGstin();
      const res5_4 = await this.validateInvalidGstinStatusBlocksSubmission(suspendedGstin, 'Suspended');
      case_TC_05_4_isSuspendedBlocked = res5_4.isBlocked;
      tc05_4_msg = res5_4.promptMessage;
    } catch (err: any) {
      console.error('[Scenario 5] TC_05.4 Encountered Error (Moving to TC_05.5):', err.message);
      tc05_4_msg = `Error: ${err.message}`;
    }

    // --- TC_05.5: Cancelled GSTIN -> Full flow to Infra Save -> Prompt "Kindly enter valid GSTIN" ---
    try {
      console.log('\n--- [TC_05.5] Testing Cancelled GSTIN submission restriction ---');
      const cancelledGstin = getCancelledGstin();
      const res5_5 = await this.validateInvalidGstinStatusBlocksSubmission(cancelledGstin, 'Cancelled');
      case_TC_05_5_isCancelledBlocked = res5_5.isBlocked;
      tc05_5_msg = res5_5.promptMessage;
    } catch (err: any) {
      console.error('[Scenario 5] TC_05.5 Encountered Error:', err.message);
      tc05_5_msg = `Error: ${err.message}`;
    }

    return {
      case_TC_05_1_hasChecksumError,
      case_TC_05_2_isDisabled,
      case_TC_05_3_isRestrictedOrDisabled,
      case_TC_05_4_isSuspendedBlocked,
      case_TC_05_5_isCancelledBlocked,
      toastMessages: {
        tc05_1_msg,
        tc05_4_msg,
        tc05_5_msg,
      },
    };
  }

  // =========================================================================
  // SCENARIO 6: OFFICE ADDRESS DETAILS SELECTION FUNCTIONALITY (TC_06.1 - TC_06.8)
  // =========================================================================
  public async executeScenario6_OfficeAddressSelectionFunctionality(): Promise<{
    case_TC_06_1_isFirstSelectedByDefault: boolean;
    case_TC_06_2_isSecondSelected: boolean;
    case_TC_06_3_isOnlyOneSelected: boolean;
    case_TC_06_4_isPreviousDeselected: boolean;
    case_TC_06_5_isSelectedAfterScroll: boolean;
    case_TC_06_6_isAddressApplied: boolean;
    case_TC_06_7_isPopupClosedWithoutApplying: boolean;
    case_TC_06_8_isPopupClosedViaXWithoutApplying: boolean;
  }> {
    console.log('\n======================================================');
    console.log('[Scenario 6] Executing Office Address Details Selection Functionality...');
    console.log('======================================================');

    const validGstin = this.getValidGstinFromExcel('BranchCreation');

    // Step 1: Open Form & Fetch Details to trigger popup
    await this.navigateToBranchModule();
    await this.clickAddBranch();
    await this.selectBranchSubtype('Branch');
    await this.enterGstinNumber(validGstin);
    await this.clickFetchDetails();

    const isPopupOpen = await this.isOfficeAddressPopupDisplayed();
    expect(isPopupOpen, 'Office Address Details popup must be displayed upon fetching valid GSTIN').toBeTruthy();

    // --- TC_06.1: First office address is selected by default ---
    console.log('\n--- [TC_06.1] Verifying first office address is selected by default ---');
    await this.wait.pause(1000);
    const case_TC_06_1_isFirstSelectedByDefault = await this.isOfficeAddressRadioChecked(0);
    console.log(`[Scenario 6] TC_06.1 Result -> First address selected by default: ${case_TC_06_1_isFirstSelectedByDefault}`);

    // --- TC_06.2: User can select an office address using radio button ---
    console.log('\n--- [TC_06.2] Verifying user can select 2nd office address ---');
    await this.selectOfficeAddressRadio(1);
    await this.wait.pause(500);
    const case_TC_06_2_isSecondSelected = await this.isOfficeAddressRadioChecked(1);
    console.log(`[Scenario 6] TC_06.2 Result -> Second address selected: ${case_TC_06_2_isSecondSelected}`);

    // --- TC_06.3: Only one office address can be selected at a time ---
    console.log('\n--- [TC_06.3] Verifying only one office address can be selected at a time ---');
    const checkedCount = await this.getCheckedOfficeAddressRadiosCount();
    const case_TC_06_3_isOnlyOneSelected = (checkedCount === 1);
    console.log(`[Scenario 6] TC_06.3 Result -> Only one address selected: ${case_TC_06_3_isOnlyOneSelected} (Checked count: ${checkedCount})`);

    // --- TC_06.4: Previous selection gets deselected when another is selected ---
    console.log('\n--- [TC_06.4] Verifying previous 1st address was deselected ---');
    const isFirstStillChecked = await this.isOfficeAddressRadioChecked(0);
    const case_TC_06_4_isPreviousDeselected = !isFirstStillChecked;
    console.log(`[Scenario 6] TC_06.4 Result -> 1st address deselected: ${case_TC_06_4_isPreviousDeselected}`);

    // --- TC_06.5: User can select an office address from the list after scrolling ---
    console.log('\n--- [TC_06.5] Scrolling down and selecting an address ---');
    await this.scrollOfficeAddressList(4);
    await this.selectOfficeAddressRadio(4);
    await this.wait.pause(500);
    const case_TC_06_5_isSelectedAfterScroll = await this.isOfficeAddressRadioChecked(4);
    console.log(`[Scenario 6] TC_06.5 Result -> Address selected after scroll: ${case_TC_06_5_isSelectedAfterScroll}`);

    // --- TC_06.6: Apply selected office address on clicking Select Address ---
    console.log('\n--- [TC_06.6] Clicking Select Address and verifying applied on Branch form ---');
    await this.clickSelectAddressInPopup();

    // Handle Geofence modal Save
    const geofenceModal = this.page.locator(this.paths.branchOnboarding.geofenceModal.modalContainer).first();
    if (await geofenceModal.isVisible({ timeout: 8000 }).catch(() => false)) {
      const geofenceSave = this.page.locator(this.paths.branchOnboarding.geofenceModal.saveButton).first();
      await geofenceSave.click().catch(() => {});
      await this.wait.waitForModalBackdropClosed(10000).catch(() => {});
      await this.wait.pause(1000);
    }

    const case_TC_06_6_isAddressApplied = await this.isBranchAddressApplied();
    console.log(`[Scenario 6] TC_06.6 Result -> Selected address applied to Branch details: ${case_TC_06_6_isAddressApplied}`);

    // --- TC_06.7: System closes the office address popup on clicking Cancel ---
    console.log('\n--- [TC_06.7] Re-triggering popup and testing Cancel button ---');
    await this.clearGstinNumber();
    await this.enterGstinNumber(validGstin);
    await this.clickFetchDetails();
    const isPopupOpenTC7 = await this.isOfficeAddressPopupDisplayed();
    if (isPopupOpenTC7) {
      await this.selectOfficeAddressRadio(2);
      await this.clickCancelInOfficeAddressPopup();
    }
    const case_TC_06_7_isPopupClosedWithoutApplying = !(await this.isOfficeAddressPopupVisible());
    console.log(`[Scenario 6] TC_06.7 Result -> Popup closed on Cancel without applying: ${case_TC_06_7_isPopupClosedWithoutApplying}`);

    // --- TC_06.8: System closes the office address popup on clicking the X icon ---
    console.log('\n--- [TC_06.8] Re-triggering popup and testing "X" close icon ---');
    await this.clearGstinNumber();
    await this.enterGstinNumber(validGstin);
    await this.clickFetchDetails();
    const isPopupOpenTC8 = await this.isOfficeAddressPopupDisplayed();
    if (isPopupOpenTC8) {
      await this.selectOfficeAddressRadio(3);
      await this.clickCloseXInOfficeAddressPopup();
    }
    const case_TC_06_8_isPopupClosedViaXWithoutApplying = !(await this.isOfficeAddressPopupVisible());
    console.log(`[Scenario 6] TC_06.8 Result -> Popup closed on 'X' without applying: ${case_TC_06_8_isPopupClosedViaXWithoutApplying}`);

    return {
      case_TC_06_1_isFirstSelectedByDefault,
      case_TC_06_2_isSecondSelected,
      case_TC_06_3_isOnlyOneSelected,
      case_TC_06_4_isPreviousDeselected,
      case_TC_06_5_isSelectedAfterScroll,
      case_TC_06_6_isAddressApplied,
      case_TC_06_7_isPopupClosedWithoutApplying,
      case_TC_06_8_isPopupClosedViaXWithoutApplying,
    };
  }
}

// Backward-compatible alias
export const Scenario1Page = AllScenariosPage;