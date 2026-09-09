/**
 * Centralized Common Paths and Selectors.
 * Shared across all modules (Login, Navigation, Alerts, Modals, Common Buttons).
 */
export const CommonPaths = {
  // =========================================================================
  // 1. AUTHENTICATION / LOGIN SELECTORS
  // =========================================================================
  login: {
    usernameInput: 'input[name="username"], input[name="user"], input[id="username"], input[placeholder*="user" i], input[type="text"]',
    passwordInput: 'input[name="password"], input[name="pwd"], input[id="password"], input[placeholder*="pass" i], input[type="password"]',
    submitButton: 'button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log In")',
    errorMessage: '.alert-danger, .error-message, div[role="alert"], span[class*="error" i], p[class*="error" i], div:has-text("Invalid" i)',
    userProfileBadge: 'div[class*="avatar" i], div[class*="profile" i], button:has-text("Logout"), [aria-label*="account" i]',
  },

  // =========================================================================
  // 2. GLOBAL SIDEBAR NAVIGATION
  // =========================================================================
  navigation: {
    leftPanel: 'aside, nav, .sidebar, .left-panel, div[class*="sidebar" i], div[class*="side-nav" i], div[class*="leftNav" i]',
    sidebarMenuContainer: 'ul[class*="menu" i], div[class*="menu" i], nav[class*="nav" i], aside',
    onboardingMenu: "//span[contains(.,'Onboarding')] | //div[contains(.,'Onboarding')] | //a[contains(.,'Onboarding')]",
    branchMenuItem: "//div[@class='flex items-center gap-6'][contains(.,'Branch')]",
    branchMenuItemFallback: "//span[text()='Branch'] | //div[text()='Branch'] | //a[contains(.,'Branch')] | //button[contains(.,'Branch')]",
    franchiseMenuItem: "//div[@class='flex items-center gap-6'][contains(.,'Franchise')] | //span[text()='Franchise'] | a:has-text('Franchise')",
  },

  // =========================================================================
  // 3. COMMON BUTTONS
  // =========================================================================
  buttons: {
    saveButton: "//button[normalize-space()='Save'] | //button[contains(.,'Save')]",
    nextButton: "//button[normalize-space()='Next'] | //button[contains(.,'Next')]",
    cancelButton: "button:has-text('Cancel'), button:has-text('Back'), //button[contains(.,'Cancel')]",
    submitButton: 'button[type="submit"], button:has-text("Submit"), button:has-text("Save"), button:has-text("Create")',
  },

  // =========================================================================
  // 4. TOASTS, ALERTS & FORM VALIDATION ERRORS
  // =========================================================================
  alerts: {
    successToast: '.toast-success, div[role="alert"]:has-text("success" i), div:has-text("successfully" i), .ant-message-success',
    errorToast: '.toast-error, div[role="alert"]:has-text("error" i), .ant-message-error',
    fieldValidationErrors: '.text-danger, .error-message, span[class*="error" i], div[class*="invalid" i], p[class*="error" i], span[class*="text-red" i]',
  },

  // =========================================================================
  // 5. OVERLAYS & MODAL BACKDROPS
  // =========================================================================
  overlays: {
    backdrop: "div.fixed.inset-0, div[class*='fixed'][class*='bg-black'], div[class*='bg-black/'], div[class*='MuiBackdrop-root']",
    spinner: ".spinner, .loading, div[role='progressbar'], .loader",
  },

  // =========================================================================
  // 6. COMMON TABLES / GRIDS
  // =========================================================================
  tables: {
    tableRows: 'table tbody tr, div[role="row"], .table-row',
    noDataFound: 'text="No data", text="No records", text="No results"',
  },

  // =========================================================================
  // 7. COMMON DROPDOWNS & LISTBOXES
  // =========================================================================
  dropdowns: {
    combobox: "//div[@role='combobox'] | //div[contains(@class,'MuiSelect-select')]",
    listbox: "//ul[@role='listbox'] | //div[@role='listbox']",
    options: "//ul[@role='listbox']//li[@role='option'] | //li[@role='option'] | //li[contains(@class,'MuiMenuItem-root')]",
  },

  // =========================================================================
  // 8. BRANCH ONBOARDING PATHS (Centralized for all Branch Scenarios & Pages)
  // =========================================================================
  branchOnboarding: {
    // Header & Titles
    pageTitle: 'h1:has-text("Branch"), h2:has-text("Branch"), h3:has-text("Branch"), .page-title:has-text("Branch")',
    header: "//h1[contains(.,'Branch')] | //h2[contains(.,'Branch')] | //span[contains(.,'Branch')]",

    // Action Buttons
    addBranchButton: "//span[contains(.,'Add Branch')] | //button[contains(.,'Add Branch')]",
    addBranchButtonFallback: 'button:has-text("Add Branch"), a:has-text("Add Branch")',
    searchInput: 'input[placeholder*="Search" i], input[type="search"], input[name="search"]',
    searchButton: 'button:has-text("Search"), button[aria-label="Search"]',

    // Form Basic Inputs
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

    // Branch Sub-Type Dropdown combobox & options
    branchSubTypeCombobox: "xpath=/html/body/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div",
    branchSubTypeComboboxFallbacks: [
      "//div[@role='combobox']",
      "//div[contains(@class,'MuiSelect-select')]",
      "//label[contains(.,'Sub-Type') or contains(.,'Sub Type')]/..//div[@role='combobox']",
      "//div[@role='combobox' and @aria-haspopup='listbox']",
      "//div[contains(@id,'select') and @role='combobox']",
    ],
    branchSubTypeOption: "//li[@role='option'][contains(.,'Branch')] | //ul[@role='listbox']//li[contains(.,'Branch')] | //li[contains(@class,'MuiMenuItem-root') and contains(.,'Branch')] | //span[contains(@class,'MuiTypography') and contains(.,'Branch')]",
    branchSubTypeOptionStatic: "//span[@class='MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-fyswvn'][contains(.,'Branch')]",
    dropdownListContainer: "//ul[@role='listbox'] | //div[@role='listbox']",
    dropdownOptions: "//ul[@role='listbox']//li[@role='option'] | //li[@role='option'] | //li[contains(@class,'MuiMenuItem-root')]",

    // GSTIN Input & Fetch Details Button
    gstinInput: "//input[contains(@placeholder,'Enter GSTIN No.')] | //label[contains(.,'GSTIN')]/following::input[1] | //input[contains(@name,'gstin') or contains(@id,'gstin')]",
    fetchDetailsButton: "//button[contains(.,'Fetch Details')]",
    gstSuccessToast: "//*[contains(text(),'GST data fetched successfully')] | //div[contains(.,'GST data fetched successfully')] | //span[contains(.,'GST data fetched successfully')]",

    // Office Address Details Popup & Select Address
    officeAddressPopup: "//div[contains(.,'Office Address Details') and contains(@class,'fixed')] | //div[contains(@role,'dialog') and contains(.,'Office Address')] | //div[contains(.,'Office Address Details')]",
    selectAddressButton: "//button[contains(.,'Select Address')] | //button[normalize-space()='Select Address']",
    selectAddressPopupButton: "//button[contains(.,'Select Address')] | //button[normalize-space()='Select Address']",

    // Geofence Modal ("Set Geofence Location" popup)
    geofenceModal: {
      modalContainer: "//div[contains(.,'Set Geofence Location') and contains(@class,'fixed')]",
      saveButton: "//div[contains(.,'Set Geofence Location')]//button[normalize-space()='Save'] | //div[contains(@class,'fixed')]//button[normalize-space()='Save'] | //button[normalize-space()='Save']",
      cancelButton: "//div[contains(.,'Set Geofence Location')]//button[normalize-space()='Cancel']",
    },
    saveButton: "//div[contains(.,'Set Geofence Location')]//button[normalize-space()='Save'] | //button[normalize-space()='Save'] | //button[contains(.,'Save')]",

    // Effective Start Date & Calendar
    effectiveDateInput: "//label[contains(.,'Effective Start Date')]/..//input[@type='text'] | //label[contains(.,'Effective Start Date')]/following-sibling::input | //label[contains(.,'Effective Start Date')]/..//input",
    effectiveDateCalendarButton: "//button[@type='button' and .//svg[@viewBox='0 0 24 24']] | //label[contains(.,'Effective Start Date')]/..//button",
    calendarTodayButton: "//button[contains(@class,'MuiPickersDay-today')] | //button[@aria-current='date'] | //div[contains(@class,'MuiPickersPopper') or @role='dialog']//button[not(@disabled) and contains(@class,'MuiPickersDay-root')]",

    // Form Section 1, 2, 3 Details
    zoneCodeInput: "//label[contains(.,'Zone Code')]/following::input[1] | //label[contains(.,'Zone Code')]/..//input",
    contactPersonNameInput: "//label[contains(.,'Contact Person Name')]/following::input[1] | //label[contains(.,'Contact Person Name')]/..//input",
    contactPersonPhoneInput: "//label[contains(.,'Contact Person Phone')]/following::input[1] | //label[contains(.,'Contact Person Phone')]/..//input",
    branchNameInputSection: "//label[contains(.,'Branch Name')]/following::input[1] | //label[contains(.,'Branch Name')]/..//input",
    branchEmailInput: "//label[contains(.,'Branch Email')]/following::input[1] | //label[contains(.,'Branch Email')]/..//input",
    operationTypeCombobox: "//label[contains(.,'Operation Type')]/following::div[@role='combobox'][1] | //label[contains(.,'Operation Type')]/..//div[@role='combobox']",
    isControllingCombobox: "//label[contains(.,'Is Controlling')]/following::div[@role='combobox'][1] | //label[contains(.,'Is Controlling')]/..//div[@role='combobox']",
    nextButton: "//button[normalize-space()='Next'] | //button[contains(.,'Next')]",

    // Screen 2: Infrastructure Details
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

    // Confirmation Modal ("Create New Branch" Popup)
    confirmationModal: {
      modalContainer: "//div[contains(@class,'rounded-2xl') and .//h2[contains(.,'Create New Branch')]]",
      modalTitle: "//h2[normalize-space()='Create New Branch'] | //h2[contains(.,'Create New Branch')]",
      confirmButton: "//div[contains(@class,'rounded-2xl')]//button[normalize-space()='Confirm'] | //button[normalize-space()='Confirm']",
      cancelButton: "//div[contains(@class,'rounded-2xl')]//button[normalize-space()='Cancel'] | //button[normalize-space()='Cancel']",
    },
  },
};
