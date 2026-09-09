import { Page, expect } from '@playwright/test';
import { CommonPaths } from '../../../Common/CommonPaths';
import { WaitHelper } from '../../../../Utils/WaitHelper';
import { ExceptionHandler } from '../../../../Utils/ExceptionHandler';
import { LoginPage } from '../../../Common/LoginPage';
import {
  getUICredentials,
  readUISheet,
  getUIRowByField,
  getUIBaseUrl,
  getBranchCreationRow,
  getFieldValue,
  UIUserCredential,
} from '../../../../TestData/Excel_Reader/uiExcelReader';

export interface BranchData {
  branchName?: string;
  branchCode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  state?: string;
  city?: string;
  pincode?: string;
  branchType?: string;
  [key: string]: any;
}

export class BranchPage {
  readonly page: Page;
  readonly paths = {
    login: CommonPaths.login,
    navigation: CommonPaths.navigation,
    branch: CommonPaths.branchOnboarding,
  };
  readonly wait: WaitHelper;
  readonly loginPage: LoginPage;

  constructor(page: Page) {
    this.page = page;
    this.wait = new WaitHelper(page);
    this.loginPage = new LoginPage(page);
  }

  // =========================================================================
  // 1. EXCEL TEST DATA RETRIEVAL METHODS
  // =========================================================================

  /**
   * Reads user credentials from 'Credential' sheet in UITestData.xlsx.
   */
  public getCredentialsFromExcel(sheetName: string = 'Credential', rowIndex: number = 0): UIUserCredential {
    return getUICredentials(sheetName, rowIndex);
  }

  /**
   * Reads all Branch test data rows from specified sheet (default: 'Branch') in UITestData.xlsx.
   */
  public getBranchDataListFromExcel(sheetName: string = 'Branch'): BranchData[] {
    return readUISheet<BranchData>(sheetName);
  }

  /**
   * Reads a single Branch test data row from UITestData.xlsx by row index.
   */
  public getBranchDataByRowIndex(sheetName: string = 'Branch', rowIndex: number = 0): BranchData {
    const rows = this.getBranchDataListFromExcel(sheetName);
    if (rows && rows.length > rowIndex) {
      return rows[rowIndex];
    }
    // Fallback dynamic test data if Excel sheet doesn't have enough rows
    const timestamp = Date.now();
    return {
      branchName: `Auto Branch ${timestamp}`,
      branchCode: `BR-${Math.floor(1000 + Math.random() * 9000)}`,
      contactPerson: 'Auto Test User',
      phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      email: `branch.${timestamp}@example.com`,
      addressLine1: `${Math.floor(100 + Math.random() * 900)} Corporate Avenue`,
      state: 'Maharashtra',
      city: 'Mumbai',
      pincode: '400001',
      branchType: 'HUB',
    };
  }

  /**
   * Reads a single Branch test data row by TestCaseId column (e.g. 'TC01', 'TC_BRANCH_01').
   */
  public getBranchDataByTestCaseId(testCaseId: string, sheetName: string = 'Branch'): BranchData | null {
    return getUIRowByField<BranchData>(sheetName, 'TestCaseId', testCaseId);
  }

  // =========================================================================
  // 2. UI NAVIGATION & LOGIN ACTIONS
  // =========================================================================

  /**
   * Navigates to the Login page via the centralized LoginPage object.
   */
  public async gotoLoginPage(url?: string): Promise<void> {
    await this.loginPage.gotoLoginPage(url);
  }

  /**
   * Logs into the application using credentials picked automatically from UITestData.xlsx
   * (or custom passed credentials) via the centralized LoginPage object.
   */
  public async login(customUser?: string, customPass?: string): Promise<void> {
    await this.loginPage.login(customUser, customPass);
  }

  /**
   * Hovers over the left navigation panel so the menu bar opens,
   * then finds and clicks the 'Branch' option.
   */
  public async hoverLeftPanelAndClickBranch(): Promise<void> {
    console.log(`[BranchPage] Hovering over left panel to reveal menu bar...`);

    // 1. Locate the left panel / sidebar area
    const leftPanel = this.page.locator(this.paths.navigation.leftPanel).first();
    if (await leftPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Hover over the left panel
      await leftPanel.hover();
      console.log(`[BranchPage] Hovered on left panel.`);
    } else {
      // Fallback: move mouse to left margin (x: 20, y: 300) to trigger sidebar hover
      await this.page.mouse.move(20, 300);
      console.log(`[BranchPage] Mouse moved to left edge to trigger sidebar hover.`);
    }

    await this.page.waitForTimeout(1000);

    // 2. Check if 'Branch' is already visible. Only click 'Onboarding' if Branch is collapsed
    const primaryBranch = this.page.locator(this.paths.navigation.branchMenuItem).first();
    let isBranchVisible = await primaryBranch.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isBranchVisible) {
      const onboardingMenu = this.page.locator(this.paths.navigation.onboardingMenu).first();
      if (await onboardingMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[BranchPage] Branch not yet visible, clicking parent 'Onboarding' menu item to expand.`);
        await onboardingMenu.click({ timeout: 2000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
      }
    }

    // 3. Click 'Branch' option
    if (await primaryBranch.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`[BranchPage] Found 'Branch' menu item using exact XPath: //div[@class='flex items-center gap-6'][contains(.,'Branch')]. Clicking...`);
      await primaryBranch.click();
    } else {
      console.log(`[BranchPage] Primary XPath not immediately visible, checking fallback selector...`);
      const fallbackBranch = this.page.locator(this.paths.navigation.branchMenuItemFallback).first();
      await fallbackBranch.waitFor({ state: 'visible', timeout: 8000 });
      await fallbackBranch.click();
    }

    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500);
    console.log(`[BranchPage] Navigated to Branch page. Current URL: ${this.page.url()}`);
  }

  // =========================================================================
  // 3. BRANCH ONBOARDING ACTIONS & FORM FILLING
  // =========================================================================

  /**
   * Clicks 'Add Branch' button using exact XPath: //span[contains(.,'Add Branch')].
   */
  public async clickAddBranch(): Promise<void> {
    console.log(`[BranchPage] Looking for 'Add Branch' button using: //span[contains(.,'Add Branch')]`);

    // Wait for branch dashboard table/container to be ready
    await this.page.waitForLoadState('domcontentloaded');

    const addBtn = this.page.locator(this.paths.branch.addBranchButton).first();
    try {
      await addBtn.waitFor({ state: 'visible', timeout: 12000 });
      console.log(`[BranchPage] 'Add Branch' button is visible. Clicking...`);
      await addBtn.click();
      await this.page.waitForTimeout(1500);
      console.log(`[BranchPage] Successfully clicked 'Add Branch' button.`);
    } catch {
      console.log(`[BranchPage] Primary Add Branch not found, checking fallback...`);
      const fallbackBtn = this.page.locator(this.paths.branch.addBranchButtonFallback).first();
      await fallbackBtn.waitFor({ state: 'visible', timeout: 8000 });
      await fallbackBtn.click();
      await this.page.waitForTimeout(1500);
      console.log(`[BranchPage] Successfully clicked fallback Add Branch button.`);
    }
  }

  /**
   * Fills Branch Onboarding form fields using passed data object.
   */
  public async fillBranchForm(data: BranchData): Promise<void> {
    console.log(`[BranchPage] Filling Branch Form:`, data);

    if (data.branchName) {
      const nameInput = this.page.locator(this.paths.branch.branchNameInput).first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(data.branchName);
      }
    }

    if (data.branchCode) {
      const codeInput = this.page.locator(this.paths.branch.branchCodeInput).first();
      if (await codeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await codeInput.fill(data.branchCode);
      }
    }

    if (data.contactPerson) {
      const contactInput = this.page.locator(this.paths.branch.contactPersonInput).first();
      if (await contactInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await contactInput.fill(data.contactPerson);
      }
    }

    if (data.phone) {
      const phoneInput = this.page.locator(this.paths.branch.phoneInput).first();
      if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await phoneInput.fill(data.phone);
      }
    }

    if (data.email) {
      const emailInput = this.page.locator(this.paths.branch.emailInput).first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill(data.email);
      }
    }

    if (data.addressLine1) {
      const addressInput = this.page.locator(this.paths.branch.addressLineInput).first();
      if (await addressInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addressInput.fill(data.addressLine1);
      }
    }

    if (data.state) {
      const stateInput = this.page.locator(this.paths.branch.stateSelect).first();
      if (await stateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const tagName = await stateInput.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
        if (tagName === 'select') {
          await stateInput.selectOption({ label: data.state }).catch(async () => {
            await stateInput.selectOption({ value: data.state });
          });
        } else {
          await stateInput.fill(data.state);
        }
      }
    }

    if (data.city) {
      const cityInput = this.page.locator(this.paths.branch.citySelect).first();
      if (await cityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const tagName = await cityInput.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
        if (tagName === 'select') {
          await cityInput.selectOption({ label: data.city }).catch(async () => {
            await cityInput.selectOption({ value: data.city });
          });
        } else {
          await cityInput.fill(data.city);
        }
      }
    }

    if (data.pincode) {
      const pinInput = this.page.locator(this.paths.branch.pincodeInput).first();
      if (await pinInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pinInput.fill(String(data.pincode));
      }
    }
  }

  /**
   * Clicks the Submit/Save button on the Branch form.
   */
  public async submitBranchForm(): Promise<void> {
    const submitBtn = this.page.locator(this.paths.branch.submitButton).first();
    console.log(`[BranchPage] Clicking Submit Branch button.`);
    await submitBtn.click();
    await this.page.waitForTimeout(1500);
  }

  // =========================================================================
  // 4. SCENARIO METHODS (BUSINESS LOGIC)
  // =========================================================================

  /**
   * Scenario 1: Complete Login & Navigation Flow.
   */
  public async scenarioLoginAndNavigateToBranch(): Promise<boolean> {
    await this.gotoLoginPage();
    await this.login();
    await this.hoverLeftPanelAndClickBranch();
    return this.isBranchPageLoaded();
  }

  /**
   * Complete Unified Flow: Creates a Branch with valid details from Excel.
   * Handles entire Form from opening until final confirmation popup:
   * 1. Screen 1: Sub-Type, GSTIN, Address modal, Date, Contact Details (with HHMMSSMS), Next
   * 2. Screen 2: Infrastructure Details (Gates, Docks, Open Yard, Warehouse Floor, Branch Floor), Save
   * 3. Confirmation Popup: "Create New Branch" modal -> Confirm click
   */
  public async createBranchWithValidDetails(rowIndex: number = 0): Promise<{
    excelData: any;
    isSuccess: boolean;
  }> {
    try {
      // Read test data row from 'BranchCreation' sheet
    const excelRow = getBranchCreationRow('BranchCreation', rowIndex);
    console.log(`[BranchCreation] Loaded Excel Row (${rowIndex}):`, excelRow);

    // Read Sub-Type value specifically (defaults to 'Branch' if blank in Excel)
    let branchSubType = 'Branch';
    if (excelRow['Branch Sub-Type'] && String(excelRow['Branch Sub-Type']).trim()) {
      branchSubType = String(excelRow['Branch Sub-Type']).trim();
    } else if (excelRow['BranchSubType'] && String(excelRow['BranchSubType']).trim()) {
      branchSubType = String(excelRow['BranchSubType']).trim();
    } else if (excelRow['SubType'] && String(excelRow['SubType']).trim()) {
      branchSubType = String(excelRow['SubType']).trim();
    }

    const gstinNumber = excelRow['GSTIN'] || excelRow['GSTIN No'] || excelRow['GSTIN_No'] || '24AAGCR0277D1ZO';

    // -----------------------------------------------------------------------
    // Step 1: Click Branch Sub-Type Dropdown combobox
    // -----------------------------------------------------------------------
    console.log(`[Step 1] Opening Branch Sub-Type dropdown...`);
    const primaryCombobox = this.page.locator(this.paths.branch.branchSubTypeCombobox).first();
    let clickedDropdown = false;

    if (await primaryCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`[Step 1] Clicking user specified path: /html/body/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div`);
      await primaryCombobox.click();
      clickedDropdown = true;
    } else {
      for (const fallbackPath of this.paths.branch.branchSubTypeComboboxFallbacks) {
        const loc = this.page.locator(fallbackPath).first();
        if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[Step 1] Clicking fallback combobox: ${fallbackPath}`);
          await loc.click();
          clickedDropdown = true;
          break;
        }
      }
    }

    await this.page.waitForTimeout(1000);

    // -----------------------------------------------------------------------
    // Step 2: Select 'Branch Sub-Type' option value picked from Excel ("Branch")
    // -----------------------------------------------------------------------
    console.log(`[Step 2] Selecting Sub-Type option: "${branchSubType}"`);
    const optionSelectors = [
      `//li[@role='option'][normalize-space()='${branchSubType}']`,
      `//li[@role='option'][contains(.,'${branchSubType}')]`,
      `//ul[@role='listbox']//li[contains(.,'${branchSubType}')]`,
      `//li[contains(@class,'MuiMenuItem-root') and contains(.,'${branchSubType}')]`,
      `//span[contains(@class,'MuiTypography') and contains(.,'${branchSubType}')]`,
      `text="${branchSubType}"`,
    ];

    let optionSelected = false;
    for (const selector of optionSelectors) {
      const opt = this.page.locator(selector).first();
      if (await opt.isVisible({ timeout: 2500 }).catch(() => false)) {
        console.log(`[Step 2] Found option element via: ${selector}. Clicking...`);
        await opt.click();
        optionSelected = true;
        break;
      }
    }

    if (!optionSelected) {
      const staticOpt = this.page.locator(this.paths.branch.branchSubTypeOptionStatic).first();
      if (await staticOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await staticOpt.click();
        optionSelected = true;
        console.log(`[Step 2] Clicked option via user static selector.`);
      }
    }

    await this.page.waitForTimeout(1000);

    // -----------------------------------------------------------------------
    // Step 3: Pick GSTIN value from Excel and put in //input[contains(@placeholder,'Enter GSTIN No.')]
    // -----------------------------------------------------------------------
    console.log(`[Step 3] Entering GSTIN No from Excel: "${gstinNumber}"`);
    const gstinInput = this.page.locator(this.paths.branch.gstinInput).first();
    await gstinInput.waitFor({ state: 'visible', timeout: 10000 });
    await gstinInput.fill(gstinNumber);
    await this.wait.pause(1000);

    // -----------------------------------------------------------------------
    // Step 4: Click on //button[contains(.,'Fetch Details')]
    // -----------------------------------------------------------------------
    console.log(`[Step 4] Clicking "Fetch Details" button: //button[contains(.,'Fetch Details')]`);
    await this.wait.clickWhenReady(this.paths.branch.fetchDetailsButton, 10000);
    await this.wait.pause(1000);

    // -----------------------------------------------------------------------
    // Step 5 & 6: Wait for "Office Address Details" modal & click "Select Address"
    // -----------------------------------------------------------------------
    console.log(`[Step 5] Waiting for "Office Address Details" modal with "Select Address" button...`);
    const selectAddressBtn = await this.wait.waitForVisible(this.paths.branch.selectAddressPopupButton, 20000);
    console.log(`[Step 5] ✅ "Office Address Details" popup is visible!`);
    await this.wait.pause(1000);

    console.log(`[Step 6] Clicking "Select Address" button on popup: //button[contains(.,'Select Address')]`);
    await selectAddressBtn.click();
    console.log(`[Step 6] ✅ Clicked "Select Address" button.`);
    await this.wait.pause(1500);

    // -----------------------------------------------------------------------
    // Step 7: Handle "Set Geofence Location" popup and click "Save"
    // -----------------------------------------------------------------------
    console.log(`[Step 7] Checking for "Set Geofence Location" popup & Save button...`);
    const geofenceSaveBtn = this.page.locator(
      "//div[contains(.,'Set Geofence Location')]//button[normalize-space()='Save'] | //div[contains(@class,'fixed')]//button[normalize-space()='Save'] | //button[normalize-space()='Save']"
    ).first();

    if (await geofenceSaveBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log(`[Step 7] Found "Save" button on Geofence popup. Waiting 1 second before clicking...`);
      await this.wait.pause(1000);
      await geofenceSaveBtn.click();
      console.log(`[Step 7] ✅ Clicked "Save" button on Geofence popup.`);
    } else {
      console.log(`[Step 7] Checking fallback Save button...`);
      const fallbackSave = this.page.locator(this.paths.branch.saveButton).first();
      if (await fallbackSave.isVisible({ timeout: 4000 }).catch(() => false)) {
        await fallbackSave.click();
        console.log(`[Step 7] Clicked fallback Save button.`);
      }
    }

    // Wait for Geofence modal and all backdrop overlays to completely disappear
    console.log(`[Step 7] Waiting for Geofence modal & backdrops to disappear...`);
    const geofenceModal = this.page.locator("//div[contains(.,'Set Geofence Location') and contains(@class,'fixed')]").first();
    await geofenceModal.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.wait.waitForModalBackdropClosed(15000);
    await this.wait.waitForNoPointerInterception(10000);
    await this.wait.pause(1500);
    console.log(`[Step 7] ✅ Geofence popup closed successfully. No overlay intercepting!`);

    // -----------------------------------------------------------------------
    // Step 8: Click calendar icon and select current date
    // -----------------------------------------------------------------------
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const formattedDate = `${dd}/${mm}/${yyyy}`; // e.g. "04/09/2026"
    const currentDayNum = today.getDate();

    console.log(`[Step 8] Setting Effective Start Date to current date: "${formattedDate}" (Day: ${currentDayNum})...`);

    // 1. Scroll date field into view
    const dateInput = this.page.locator(this.paths.branch.effectiveDateInput).first();
    await dateInput.scrollIntoViewIfNeeded().catch(() => {});
    await this.wait.pause(1000);

    // 2. Click calendar icon button
    const calendarBtn = this.page.locator(this.paths.branch.effectiveDateCalendarButton).first();
    if (await calendarBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log(`[Step 8] Clicking Calendar icon button: //button[@type='button' and .//svg[@viewBox='0 0 24 24']]`);
      try {
        await calendarBtn.click({ timeout: 5000 });
      } catch {
        console.log(`[Step 8] Direct click intercepted, attempting force click on calendar button...`);
        await calendarBtn.click({ force: true });
      }
      await this.wait.pause(1000);

      // Select today's date in calendar picker
      const todayDateBtn = this.page.locator(
        "//button[contains(@class,'MuiPickersDay-today')] | //button[@aria-current='date'] | //button[contains(@class,'Mui-selected')] | //div[contains(@class,'MuiPickersPopper') or @role='dialog' or contains(@class,'MuiDateCalendar')]//button[not(@disabled) and normalize-space()='" + currentDayNum + "'] | //button[not(@disabled) and normalize-space()='" + currentDayNum + "']"
      ).first();

      if (await todayDateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[Step 8] Clicking today's date in calendar picker...`);
        await todayDateBtn.click();
        await this.wait.pause(1000);
        console.log(`[Step 8] ✅ Selected current date in calendar!`);
      } else {
        console.log(`[Step 8] Today's button not found in popup, ensuring date input has formatted value.`);
      }
    }

    // 3. Ensure input is populated with formatted date
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const currentVal = await dateInput.inputValue().catch(() => '');
      if (!currentVal) {
        console.log(`[Step 8] Direct filling formatted date "${formattedDate}" into input...`);
        await dateInput.fill(formattedDate);
        await dateInput.press('Tab');
      }
    }

    // 4. Native date input sync
    const isoDate = `${yyyy}-${mm}-${dd}`;
    await this.page.evaluate((val) => {
      const nativeInput = document.querySelector("input[type='date']") as HTMLInputElement;
      if (nativeInput) {
        nativeInput.value = val;
        nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
        nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, isoDate).catch(() => {});

    await this.wait.pause(500);

    // -----------------------------------------------------------------------
    // Step 9: Fill Contact Details, Operational Details and click Next
    // -----------------------------------------------------------------------
    console.log(`[Step 9] Filling Contact & Operational details from Excel...`);

    // Generate unique timestamp suffix: HHMMSSMS (e.g. 17441222)
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const millis = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
    const timeSuffix = `${hours}${minutes}${seconds}${millis}`; // e.g. "17441222"
    console.log(`[Step 9] Generated unique HHMMSSMS timestamp: "${timeSuffix}"`);

    // --- Section 1: Contact Details ---
    // 1. Contact Person Name* (Append HHMMSSMS to be unique each run)
    const basePersonName = getFieldValue(excelRow, ['Person Name', 'PersonName', 'Contact Person', 'contactPerson', 'Contact Person Name']) || 'Temp';
    const personName = `${basePersonName}${timeSuffix}`;
    console.log(`[Step 9.1] Filling Contact Person Name: "${personName}"...`);
    await this.wait.fillWhenReady(this.paths.branch.contactPersonNameInput, personName);
    console.log(`[Step 9.1] ✅ Filled Contact Person Name: "${personName}"`);
    await this.wait.pause(300);

    // 2. Contact Person Phone*
    const contactNo = getFieldValue(excelRow, ['Contact Number', 'ContactNumber', 'Mobile', 'Phone', 'Contact Person Phone']) || '9237937388';
    console.log(`[Step 9.2] Filling Contact Person Phone: "${contactNo}"...`);
    await this.wait.fillWhenReady(this.paths.branch.contactPersonPhoneInput, String(contactNo));
    console.log(`[Step 9.2] ✅ Filled Contact Person Phone: "${contactNo}"`);
    await this.wait.pause(300);

    // 3. Branch Name* (Append HHMMSSMS to prevent duplicate branch name errors)
    const baseBranchName = getFieldValue(excelRow, ['Branchname', 'Branch Name', 'Name', 'Branch_Name']) || 'Temp';
    const branchName = `${baseBranchName}${timeSuffix}`;
    console.log(`[Step 9.3] Filling Branch Name: "${branchName}"...`);
    await this.wait.fillWhenReady(this.paths.branch.branchNameInput, branchName);
    console.log(`[Step 9.3] ✅ Filled Branch Name: "${branchName}"`);
    await this.wait.pause(300);

    // 4. Branch Email* (Append HHMMSSMS before @ domain to be unique each run)
    const baseBranchEmail = getFieldValue(excelRow, ['Branchemail', 'Branch Email', 'Email']) || 'temp@gmail.com';
    let branchEmail = baseBranchEmail;
    if (baseBranchEmail.includes('@')) {
      const [localPart, domainPart] = baseBranchEmail.split('@');
      branchEmail = `${localPart}${timeSuffix}@${domainPart}`;
    } else {
      branchEmail = `${baseBranchEmail}${timeSuffix}@gmail.com`;
    }
    console.log(`[Step 9.4] Filling Branch Email: "${branchEmail}"...`);
    await this.wait.fillWhenReady(this.paths.branch.branchEmailInput, branchEmail);
    console.log(`[Step 9.4] ✅ Filled Branch Email: "${branchEmail}"`);
    await this.wait.pause(300);

    // Optional: Branch Code (if present in form)
    const branchCode = getFieldValue(excelRow, ['BranchCode', 'Code', 'Branch_Code']);
    if (branchCode) {
      const codeInput = this.page.locator("//label[contains(.,'Branch Code')]/following::input[1] | //label[contains(.,'Branch Code')]/..//input").first();
      if (await codeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await codeInput.fill(branchCode);
        console.log(`[Step 9.5] Filled Branch Code: "${branchCode}"`);
      }
    }

    // --- Section 2: Operational Details ---
    // 1. Operation Type* (Combobox -> Pick from Excel, e.g. "BOOKING")
    const operationTypeVal = getFieldValue(excelRow, ['OPERATION type', 'Operation Type', 'OperationType', 'Operation']) || 'BOOKING';
    console.log(`[Step 9.6] Opening Operation Type dropdown to select "${operationTypeVal}"...`);
    await this.wait.clickWhenReady(this.paths.branch.operationTypeCombobox);
    await this.wait.pause(500);

    // Select option using exact user HTML: data-value="BOOKING" or text
    const opOption = this.page.locator(`//li[@role='option' and @data-value='${operationTypeVal}'] | //li[@role='option'][normalize-space()='${operationTypeVal}'] | //ul[@role='listbox']//li[@data-value='${operationTypeVal}']`).first();
    await this.wait.clickWhenReady(opOption);
    console.log(`[Step 9.6] ✅ Selected Operation Type: "${operationTypeVal}"`);
    await this.wait.pause(500);

    // 2. Is Controlling* (Combobox -> Pick from Excel, e.g. "Yes")
    const controllingVal = getFieldValue(excelRow, ['Controlling Branch', 'ControllingBranch', 'Is Controlling', 'IsControlling', 'Controlling']) || 'Yes';
    console.log(`[Step 9.7] Opening Is Controlling dropdown to select "${controllingVal}"...`);
    await this.wait.clickWhenReady(this.paths.branch.isControllingCombobox);
    await this.wait.pause(500);

    // Select option
    const ctrlOption = this.page.locator(`//li[@role='option' and @data-value='${controllingVal}'] | //li[@role='option'][normalize-space()='${controllingVal}'] | //ul[@role='listbox']//li[@data-value='${controllingVal}']`).first();
    await this.wait.clickWhenReady(ctrlOption);
    console.log(`[Step 9.7] ✅ Selected Is Controlling: "${controllingVal}"`);
    await this.wait.pause(500);

    // --- Click "Next" Button when enabled ---
    console.log(`[Step 9.8] Waiting for "Next" button to become enabled...`);
    const nextBtn = await this.wait.waitForVisible(this.paths.branch.nextButton, 15000);
    await nextBtn.scrollIntoViewIfNeeded().catch(() => {});

    await this.wait.waitForCondition(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent && b.textContent.includes('Next'));
        return btn && !btn.disabled && !btn.hasAttribute('disabled') && !btn.classList.contains('Mui-disabled');
      },
      15000
    );
    console.log(`[Step 9.8] "Next" button is enabled! Clicking Next...`);

    const isNextDisabled = await nextBtn.isDisabled().catch(() => false);
    console.log(`[Step 9.8] Next button isDisabled: ${isNextDisabled}`);
    await nextBtn.click({ force: isNextDisabled });
    await this.wait.pause(2000);
    console.log(`[Step 9] ✅ Successfully completed Screen 1 and clicked "Next" button!`);

    const updatedExcelData = {
      ...excelRow,
      'Person Name': personName,
      'Branch Name': branchName,
      'Branch Email': branchEmail,
    };

    // --- Screen 2 (Infrastructure Details) & Final Confirmation Popup ---
    await this.fillInfrastructureDetails(updatedExcelData);
    console.log(`[createBranchWithValidDetails] 🎉 Complete Branch Creation flow finished successfully!`);

    return {
      excelData: updatedExcelData,
      isSuccess: true,
    };
    } catch (error: any) {
      return await ExceptionHandler.handleStepFailure(this.page, 'createBranchWithValidDetails', error);
    }
  }

  /**
   * Alias for createBranchWithValidDetails (maintains backward compatibility).
   */
  public async executeBranchCreationFlow(rowIndex: number = 0): Promise<{
    excelData: any;
    isSuccess: boolean;
  }> {
    return this.createBranchWithValidDetails(rowIndex);
  }

  /**
   * Screen 2: Fills Infrastructure Details (Infra Info) and clicks Save.
   *
   * Fields on Screen 2:
   * 1. No of Gates* (Input text/number)
   * 2. Total No of Docks* (Input text/number)
   * 3. Open Yard Area* (Input text/number)
   * 4. Warehouse Floor Area* (Input text/number)
   * 5. Total Branch Area (Auto-calculated: Open Yard + Warehouse Floor Area, disabled)
   * 6. Material Storage Capacity (Input text/number)
   * 7. Branch Floor* (MUI Combobox dropdown)
   * 8. Click Save button
   */
  public async fillInfrastructureDetails(excelRow?: any): Promise<boolean> {
    try {
      const row = excelRow || getBranchCreationRow('BranchCreation', 0);
      console.log('\n--- [Screen 2] Filling Infrastructure Details from Excel ---');

      // 1. Wait for Screen 2 to load (e.g. No of Gates input or any infra field is visible)
      console.log('[Infra Step 1] Waiting for Screen 2 (Infrastructure Details) to load...');
      await this.wait.waitForVisible(this.paths.branch.infra.noOfGatesInput, 15000);
      await this.wait.pause(1000);

      // 2. No of Gates*
      const noOfGates = getFieldValue(row, ['No of Gates', 'NoOfGates', 'Gates', 'Gate Count', 'No_of_Gates'], '2');
      console.log(`[Infra Step 2] Filling "No of Gates": "${noOfGates}"...`);
      await this.wait.fillWhenReady(this.paths.branch.infra.noOfGatesInput, String(noOfGates));
      await this.wait.pause(1000);

      // 3. Total No of Docks*
      const totalDocks = getFieldValue(row, ['Total No of Docks', 'TotalNoOfDocks', 'No of Docks', 'Docks', 'Total_No_of_Docks'], '2');
      console.log(`[Infra Step 3] Filling "Total No of Docks": "${totalDocks}"...`);
      await this.wait.fillWhenReady(this.paths.branch.infra.totalNoOfDocksInput, String(totalDocks));
      await this.wait.pause(1000);

      // 4. Open Yard Area*
      const openYardArea = getFieldValue(row, ['Open Yard Area', 'OpenYardArea', 'Open Yard', 'Yard Area', 'Open_Yard_Area'], '1000');
      console.log(`[Infra Step 4] Filling "Open Yard Area": "${openYardArea}"...`);
      await this.wait.fillWhenReady(this.paths.branch.infra.openYardAreaInput, String(openYardArea));
      await this.wait.pause(1000);

      // 5. Warehouse Floor Area*
      const whFloorArea = getFieldValue(row, ['Warehouse Floor Area', 'WarehouseFloorArea', 'Warehouse Area', 'Floor Area', 'Warehouse_Floor_Area'], '2000');
      console.log(`[Infra Step 5] Filling "Warehouse Floor Area": "${whFloorArea}"...`);
      await this.wait.fillWhenReady(this.paths.branch.infra.warehouseFloorAreaInput, String(whFloorArea));
      await this.wait.pause(1000);

      // 6. Note: Total Branch Area is auto-calculated and disabled. Log its value.
      const totalBranchAreaLoc = this.page.locator(this.paths.branch.infra.totalBranchAreaInput).first();
      if (await totalBranchAreaLoc.isVisible({ timeout: 2000 }).catch(() => false)) {
        const calculatedVal = await totalBranchAreaLoc.inputValue().catch(() => '');
        console.log(`[Infra Step 6] Auto-calculated Total Branch Area: "${calculatedVal}"`);
      }

      // 7. Material Storage Capacity (optional/mandatory)
      const storageCapacity = getFieldValue(row, ['Material Storage Capacity', 'MaterialStorageCapacity', 'Storage Capacity', 'StorageCapacity', 'Material_Storage_Capacity'], '500');
      const storageInput = this.page.locator(this.paths.branch.infra.materialStorageCapacityInput).first();
      if (await storageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[Infra Step 7] Filling "Material Storage Capacity": "${storageCapacity}"...`);
        await this.wait.fillWhenReady(storageInput, String(storageCapacity));
        await this.wait.pause(1000);
      }

      // 8. Branch Floor* (Combobox dropdown)
      const branchFloor = getFieldValue(row, ['Branch Floor', 'BranchFloor', 'Floor', 'Branch_Floor'], '');
      console.log(`[Infra Step 8] Selecting "Branch Floor" (target: "${branchFloor || 'First Option'}")...`);
      const floorCombobox = this.page.locator(this.paths.branch.infra.branchFloorCombobox).first();
      if (await floorCombobox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await floorCombobox.click();
        await this.wait.pause(1000);

        // Select matching option or first available option
        let optionClicked = false;
        if (branchFloor) {
          const matchingOpt = this.page.locator(`//li[@role='option' and (normalize-space()='${branchFloor}' or contains(.,'${branchFloor}') or @data-value='${branchFloor}')]`).first();
          if (await matchingOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`[Infra Step 8] Clicking matching Branch Floor option: "${branchFloor}"`);
            await matchingOpt.click();
            optionClicked = true;
          }
        }

        if (!optionClicked) {
          // Fallback: pick the first available option in the listbox
          const firstOpt = this.page.locator(`//ul[@role='listbox']//li[@role='option']`).first();
          if (await firstOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
            const optText = (await firstOpt.innerText().catch(() => '')).trim();
            console.log(`[Infra Step 8] Picking first available Branch Floor option: "${optText}"`);
            await firstOpt.click();
            optionClicked = true;
          }
        }
        await this.wait.pause(1000);
      }

      // 9. Click Save button
      console.log(`[Infra Step 9] Waiting for Screen 2 "Save" button to be clickable...`);
      const infraSaveBtn = this.page.locator(this.paths.branch.infra.saveButton).first();
      await infraSaveBtn.scrollIntoViewIfNeeded().catch(() => {});
      await this.wait.waitForClickable(infraSaveBtn, 10000);
      await this.wait.pause(1000);
      console.log(`[Infra Step 9] Clicking Screen 2 "Save" button...`);
      await infraSaveBtn.click();
      console.log(`[Infra Step 9] ✅ Clicked Screen 2 "Save" button!`);

      await this.wait.pause(1000);

      // 10. Confirmation Modal: "Create New Branch" -> Click "Confirm"
      console.log(`[Infra Step 10] Waiting for "Create New Branch" confirmation popup...`);
      const confirmBtn = await this.wait.waitForVisible(this.paths.branch.confirmationModal.confirmButton, 10000);
      console.log(`[Infra Step 10] ✅ Confirmation modal is visible!`);
      await this.wait.pause(1000);

      console.log(`[Infra Step 10] Clicking "Confirm" button on modal: //button[normalize-space()='Confirm']...`);
      await confirmBtn.click();
      console.log(`[Infra Step 10] ✅ Clicked "Confirm" button! Branch created successfully.`);

      // Wait for backdrop to disappear
      await this.wait.waitForModalBackdropClosed(10000);
      await this.wait.pause(2000);

      return true;
    } catch (error: any) {
      return await ExceptionHandler.handleStepFailure(this.page, 'fillInfrastructureDetails', error);
    }
  }

  /**
   * Confirms the "Create New Branch" popup.
   */
  public async confirmBranchCreation(): Promise<void> {
    console.log(`[BranchPage] Waiting for "Create New Branch" confirmation modal...`);
    const confirmBtn = await this.wait.waitForVisible(this.paths.branch.confirmationModal.confirmButton, 10000);
    await this.wait.pause(1000);
    console.log(`[BranchPage] Clicking "Confirm" button on modal...`);
    await confirmBtn.click();
    console.log(`[BranchPage] ✅ Branch creation confirmed!`);
    await this.wait.waitForModalBackdropClosed(10000);
    await this.wait.pause(2000);
  }

  /**
   * Scenario 2: Create a Branch using data from UITestData.xlsx.
   */
  public async scenarioCreateBranch(rowIndexOrData?: number | BranchData): Promise<{
    branchData: BranchData;
    isSubmitted: boolean;
  }> {
    let dataToUse: BranchData;

    if (typeof rowIndexOrData === 'object' && rowIndexOrData !== null) {
      dataToUse = rowIndexOrData;
    } else {
      const rowIndex = typeof rowIndexOrData === 'number' ? rowIndexOrData : 0;
      dataToUse = this.getBranchDataByRowIndex('Branch', rowIndex);
    }

    // Ensure unique branch name and code for test repeatability
    const timestamp = Date.now();
    const finalData: BranchData = {
      ...dataToUse,
      branchName: dataToUse.branchName ? `${dataToUse.branchName}_${timestamp}` : `Auto Branch ${timestamp}`,
      branchCode: dataToUse.branchCode ? `${dataToUse.branchCode}${Math.floor(10 + Math.random() * 90)}` : `BR${Math.floor(1000 + Math.random() * 9000)}`,
    };

    await this.clickAddBranch();
    await this.fillBranchForm(finalData);
    await this.submitBranchForm();

    return {
      branchData: finalData,
      isSubmitted: true,
    };
  }

  /**
   * Scenario 3: Validate mandatory fields by submitting a blank form.
   */
  public async scenarioValidateMandatoryFields(): Promise<string[]> {
    await this.clickAddBranch();
    // Submit without entering data
    await this.submitBranchForm();
    return await this.getFieldValidationErrors();
  }

  /**
   * Scenario 4: Search for a Branch in the list.
   */
  public async scenarioSearchBranch(keyword: string): Promise<number> {
    const searchInput = this.page.locator(this.paths.branch.searchInput).first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(keyword);
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(1500);
    }
    return await this.getTableRowCount();
  }

  // =========================================================================
  // 5. VALIDATION & ASSERTION HELPERS
  // =========================================================================

  /**
   * Checks if user is on Branch page (URL or page title).
   */
  public async isBranchPageLoaded(): Promise<boolean> {
    const url = this.page.url().toLowerCase();
    const hasBranchUrl = url.includes('branch');
    const titleLocator = this.page.locator(this.paths.branch.pageTitle).first();
    const hasTitle = await titleLocator.isVisible({ timeout: 5000 }).catch(() => false);
    return hasBranchUrl || hasTitle;
  }

  /**
   * Returns validation error messages displayed on the form.
   */
  public async getFieldValidationErrors(): Promise<string[]> {
    const errorLocators = this.page.locator(this.paths.branch.fieldValidationErrors);
    const count = await errorLocators.count();
    const messages: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await errorLocators.nth(i).innerText()).trim();
      if (text) messages.push(text);
    }
    return messages;
  }

  /**
   * Checks if a success toast or confirmation message is displayed.
   */
  public async isSuccessToastVisible(): Promise<boolean> {
    const toast = this.page.locator(this.paths.branch.successToast).first();
    return await toast.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Returns count of rows in the Branch data table.
   */
  public async getTableRowCount(): Promise<number> {
    const rows = this.page.locator(this.paths.branch.tableRows);
    return await rows.count().catch(() => 0);
  }
}
