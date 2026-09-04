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
    onboardingMenu: "//span[contains(.,'Onboarding')] | //div[contains(.,'Onboarding')] | a:has-text('Onboarding')",
    branchMenuItem: "//div[@class='flex items-center gap-6'][contains(.,'Branch')]",
    branchMenuItemFallback: "//span[text()='Branch'] | //div[text()='Branch'] | a:has-text('Branch') | button:has-text('Branch')",
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
};
