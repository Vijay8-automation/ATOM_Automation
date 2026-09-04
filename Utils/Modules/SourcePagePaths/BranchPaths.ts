import { CommonPaths } from '../../../SourcePages/Common/CommonPaths';

/**
 * Locators and Selectors for UI Authentication, Navigation, and Branch Onboarding.
 * Follows Page Object Model design with flexible, resilient selectors.
 */
export const BranchPaths = {
  // Reusable Common paths (Login & Navigation)
  login: CommonPaths.login,
  navigation: CommonPaths.navigation,

  // =========================================================================
  // 3. BRANCH ONBOARDING PAGE & FORM
  // =========================================================================
  branch: {
    // Header / Title
    pageTitle: 'h1:has-text("Branch"), h2:has-text("Branch"), h3:has-text("Branch"), .page-title:has-text("Branch")',

    // Action Buttons (Exact XPath provided by user)
    addBranchButton: "//span[contains(.,'Add Branch')]",
    addBranchButtonFallback: 'button:has-text("Add Branch"), a:has-text("Add Branch")',
    searchInput: 'input[placeholder*="Search" i], input[type="search"], input[name="search"]',
    searchButton: 'button:has-text("Search"), button[aria-label="Search"]',

    // Form Inputs
    branchNameInput: 'input[name="branchName"], input[name="name"], input[placeholder*="Branch Name" i], input[id="branchName"]',
    branchCodeInput: 'input[name="branchCode"], input[name="code"], input[placeholder*="Branch Code" i], input[id="branchCode"]',
    contactPersonInput: 'input[name="contactPerson"], input[name="contactPersonName"], input[placeholder*="Contact Person" i]',
    phoneInput: 'input[name="phone"], input[name="mobile"], input[placeholder*="Mobile" i], input[placeholder*="Phone" i], input[type="tel"]',
    emailInput: 'input[name="email"], input[type="email"], input[placeholder*="Email" i]',
    addressLineInput: 'input[name="addressLine1"], input[name="address"], textarea[name="address"], input[placeholder*="Address" i]',
    stateSelect: 'select[name="state"], div[class*="state" i] select, input[name="state"], input[placeholder*="State" i]',
    citySelect: 'select[name="city"], div[class*="city" i] select, input[name="city"], input[placeholder*="City" i]',
    pincodeInput: 'input[name="pincode"], input[name="postalCode"], input[name="zipCode"], input[placeholder*="Pincode" i], input[placeholder*="Postal" i]',
    branchTypeSelect: 'select[name="branchType"], select[name="type"], div[class*="type" i] select',

    // =======================================================================
    // EXACT USER-SPECIFIED XPATHS (BranchCreation Flow)
    // =======================================================================
    // 1. Branch Sub-Type Dropdown combobox (User specified absolute path + resilient fallbacks)
    branchSubTypeCombobox: "xpath=/html/body/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div",
    branchSubTypeComboboxFallbacks: [
      "//div[@role='combobox']",
      "//div[contains(@class,'MuiSelect-select')]",
      "//label[contains(.,'Sub-Type') or contains(.,'Sub Type')]/..//div[@role='combobox']",
      "//div[@role='combobox' and @aria-haspopup='listbox']",
    ],
    // 2. Branch Sub-Type Option 'Branch'
    branchSubTypeOption: "//li[@role='option'][contains(.,'Branch')] | //ul[@role='listbox']//li[contains(.,'Branch')] | //li[contains(@class,'MuiMenuItem-root') and contains(.,'Branch')] | //span[contains(@class,'MuiTypography') and contains(.,'Branch')]",
    branchSubTypeOptionStatic: "//span[@class='MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-fyswvn'][contains(.,'Branch')]",
    // 3. GSTIN Input
    gstinInput: "//input[contains(@placeholder,'Enter GSTIN No.')]",
    // 4. Fetch Details Button
    fetchDetailsButton: "//button[contains(.,'Fetch Details')]",
    // 5. Success prompt after fetching GST
    gstSuccessToast: "//*[contains(text(),'GST data fetched successfully')] | //div[contains(.,'GST data fetched successfully')] | //span[contains(.,'GST data fetched successfully')]",
    // 6. Select Address button on popup (from user HTML)
    selectAddressPopupButton: "//button[contains(.,'Select Address')] | //button[normalize-space()='Select Address']",
    // 6.1 Geofence Modal ("Set Geofence Location" popup)
    geofenceModal: {
      modalContainer: "//div[contains(.,'Set Geofence Location') and contains(@class,'fixed')]",
      saveButton: "//div[contains(.,'Set Geofence Location')]//button[normalize-space()='Save'] | //div[contains(@class,'fixed')]//button[normalize-space()='Save'] | //button[normalize-space()='Save']",
      cancelButton: "//div[contains(.,'Set Geofence Location')]//button[normalize-space()='Cancel']",
    },
    // 7. Save button
    saveButton: "//div[contains(.,'Set Geofence Location')]//button[normalize-space()='Save'] | //button[normalize-space()='Save'] | //button[contains(.,'Save')]",
    // 8. Effective Start Date Input & Calendar (From user HTML snippet & exact user XPath)
    effectiveDateInput: "//label[contains(.,'Effective Start Date')]/..//input[@type='text'] | //label[contains(.,'Effective Start Date')]/following-sibling::input | //label[contains(.,'Effective Start Date')]/..//input",
    effectiveDateCalendarButton: "//button[@type='button' and .//svg[@viewBox='0 0 24 24']] | //label[contains(.,'Effective Start Date')]/..//button",
    calendarTodayButton: "//button[contains(@class,'MuiPickersDay-today')] | //button[@aria-current='date'] | //div[contains(@class,'MuiPickersPopper') or @role='dialog']//button[not(@disabled) and contains(@class,'MuiPickersDay-root')]",

    // Section 1: Additional Address Details
    zoneCodeInput: "//label[contains(.,'Zone Code')]/following::input[1] | //label[contains(.,'Zone Code')]/..//input",

    // Section 2: Contact Details (From user HTML)
    contactPersonNameInput: "//label[contains(.,'Contact Person Name')]/following::input[1] | //label[contains(.,'Contact Person Name')]/..//input",
    contactPersonPhoneInput: "//label[contains(.,'Contact Person Phone')]/following::input[1] | //label[contains(.,'Contact Person Phone')]/..//input",
    branchNameInput: "//label[contains(.,'Branch Name')]/following::input[1] | //label[contains(.,'Branch Name')]/..//input",
    branchEmailInput: "//label[contains(.,'Branch Email')]/following::input[1] | //label[contains(.,'Branch Email')]/..//input",

    // Section 3: Operational Details (From user HTML)
    operationTypeCombobox: "//label[contains(.,'Operation Type')]/following::div[@role='combobox'][1] | //label[contains(.,'Operation Type')]/..//div[@role='combobox']",
    isControllingCombobox: "//label[contains(.,'Is Controlling')]/following::div[@role='combobox'][1] | //label[contains(.,'Is Controlling')]/..//div[@role='combobox']",

    // 9. Next Button
    nextButton: "//button[normalize-space()='Next'] | //button[contains(.,'Next')]",

    // =======================================================================
    // 10. SCREEN 2: INFRASTRUCTURE DETAILS (From user HTML)
    // =======================================================================
    infra: {
      noOfGatesInput: "//label[contains(.,'No of Gates')]/following::input[1] | //label[contains(.,'No of Gates')]/..//input",
      totalNoOfDocksInput: "//label[contains(.,'Total No of Docks')]/following::input[1] | //label[contains(.,'Total No of Docks')]/..//input",
      openYardAreaInput: "//label[contains(.,'Open Yard Area')]/following::input[1] | //label[contains(.,'Open Yard Area')]/..//input",
      warehouseFloorAreaInput: "//label[contains(.,'Warehouse Floor Area')]/following::input[1] | //label[contains(.,'Warehouse Floor Area')]/..//input",
      totalBranchAreaInput: "//label[contains(.,'Total Branch Area')]/following::input[1] | //label[contains(.,'Total Branch Area')]/..//input",
      materialStorageCapacityInput: "//label[contains(.,'Material Storage Capacity')]/following::input[1] | //label[contains(.,'Material Storage Capacity')]/..//input",
      branchFloorCombobox: "//label[contains(.,'Branch Floor')]/following::div[@role='combobox'][1] | //div[@role='combobox' and contains(@aria-label,'Branch Floor')]",
      saveButton: "//button[normalize-space()='Save'] | //button[contains(.,'Save')]",
      backButton: "//button[contains(.,'Back')]",
    },

    // 11. Confirmation Modal ("Create New Branch" Popup)
    confirmationModal: {
      modalContainer: "//div[contains(@class,'rounded-2xl') and .//h2[contains(.,'Create New Branch')]]",
      modalTitle: "//h2[normalize-space()='Create New Branch'] | //h2[contains(.,'Create New Branch')]",
      confirmButton: "//div[contains(@class,'rounded-2xl')]//button[normalize-space()='Confirm'] | //button[normalize-space()='Confirm']",
      cancelButton: "//div[contains(@class,'rounded-2xl')]//button[normalize-space()='Cancel'] | //button[normalize-space()='Cancel']",
    },

    // Submission & Actions
    submitButton: 'button[type="submit"], button:has-text("Submit"), button:has-text("Save"), button:has-text("Create")',
    cancelButton: 'button:has-text("Cancel"), button:has-text("Back")',

    // Alerts, Toasts & Validation Errors
    successToast: '.toast-success, div[role="alert"]:has-text("success" i), div:has-text("successfully" i), .ant-message-success',
    errorToast: '.toast-error, div[role="alert"]:has-text("error" i), .ant-message-error',
    fieldValidationErrors: '.text-danger, .error-message, span[class*="error" i], div[class*="invalid" i], p[class*="error" i]',

    // Data Table / List
    tableRows: 'table tbody tr, div[role="row"], .table-row',
    noDataFound: 'text="No data", text="No records", text="No results"',
  },
};
