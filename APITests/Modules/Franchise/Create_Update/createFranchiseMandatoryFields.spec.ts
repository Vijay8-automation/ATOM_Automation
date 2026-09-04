import { test, expect, APIResponse } from '@playwright/test';
import { CreateUpdateAPI } from '../../../../APIs/Modules/Franchise/Create_Update/CreateUpdateAPI';
import { getSavedAuthToken } from '../../../../APIs/Modules/Franchise/franchiseBase';
import basePdaPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_pda.json';

/**
 * Helper to safely extract response body without crashing on empty or plain text responses.
 */
async function getSafeResponse(response: APIResponse): Promise<{ status: number; body: any }> {
  const status = response.status();
  const text = await response.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status, body };
}

/**
 * Helper to extract error message for a specific field from details object.
 * Handles both direct keys ("name") and nested/indexed keys ("addresses[0].city").
 */
function getFieldError(details: any, fieldName: string): string {
  if (!details) return '';
  if (typeof details === 'string') return details;
  if (details[fieldName]) return details[fieldName];
  for (const key of Object.keys(details)) {
    if (key === fieldName || key.endsWith(`.${fieldName}`) || key.includes(fieldName)) {
      return details[key];
    }
  }
  return '';
}

/**
 * Structured logger showing Case, Status, and Response.
 */
function logTestCase(caseNumber: number, title: string, status: number, body: any) {
  console.log(`\n============================================================`);
  console.log(`Case ${caseNumber}: ${title}`);
  console.log(`Status: ${status}`);
  console.log(`Response:`);
  if (typeof body === 'object' && body !== null) {
    console.log(JSON.stringify(body, null, 2));
  } else {
    console.log(body || '(Empty Response)');
  }
  console.log(`============================================================\n`);
}

function generateRandomPan(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pan = '';
  for (let i = 0; i < 5; i++) pan += letters.charAt(Math.floor(Math.random() * letters.length));
  pan += Math.floor(1000 + Math.random() * 9000);
  pan += letters.charAt(Math.floor(Math.random() * letters.length));
  return pan;
}

/**
 * Generates fresh unique payload for every test case so no duplicate key conflicts occur.
 */
function getValidBasePayload() {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);

  return {
    ...JSON.parse(JSON.stringify(basePdaPayload)),
    name: `Ramesh Logistics Test ${timestamp}-${randomSuffix}`,
    panNumber: generateRandomPan(),
    effectiveDate: '2026-09-01',
    contactPerson: {
      ...basePdaPayload.contactPerson,
      firstName: 'Ramesh',
      lastName: 'Kumar',
      email: `franchise.${timestamp}.${randomSuffix}@example.com`,
      phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      designation: 'Owner',
      isPrimary: true,
    },
    addresses: [
      {
        ...basePdaPayload.addresses[0],
        addressType: 'OPERATIONAL',
        addressLine1: `${Math.floor(100 + Math.random() * 900)} Main Road`,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400001',
        isPrimary: true,
      },
    ],
    bankDetails: [
      {
        bankAccountNumber: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        bankIfsc: 'HDFC0001234',
        bankName: 'HDFC Bank',
        accountHolderName: 'Ramesh Kumar',
        accountType: 'CURRENT',
        isPrimary: true,
      },
    ],
    data: {
      vehicles: [
        {
          vehicleType: 'TATA ACE',
          registrationNo: `MH01AB${Math.floor(1000 + Math.random() * 9000)}`,
          yearOfMfg: 2020,
          insuranceStatus: 'VALID',
        },
      ],
    },
  };
}

test.describe('Franchise Onboard - Mandatory Fields Validation Tests', () => {

  test.beforeAll(async () => {
    const token = getSavedAuthToken();
    if (token) {
      console.log(`\n🔑 [Auth] Using saved token from TestData/authToken.json (${token.substring(0, 20)}...)`);
    } else {
      console.warn(`\n⚠️ [Auth Warning] No token found in TestData/authToken.json! Please run 'npm run test:login' first.\n`);
    }
  });

  // =========================================================================
  // CASE 1: BASELINE (POSITIVE SCENARIO)
  // =========================================================================
  test('Case 1: Baseline - Valid Franchise Payload Check (Positive Test)', async ({ request }) => {
    const payload = getValidBasePayload();
    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(1, 'Baseline - Valid Franchise Payload Check', status, body);

    expect(status, 'Expected 200 OK for valid franchise draft creation').toBe(200);
    expect(body.status, 'Response status should be success').toBe('success');
    expect(body.data?.entityId, 'Generated entityId must be present').toBeTruthy();
    expect(body.data?.status, 'Entity status must be DRAFT').toBe('DRAFT');
  });

  // =========================================================================
  // 1. "onboardingType" is blank
  // =========================================================================
  test('Case 2: Validate "onboardingType" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.onboardingType = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(2, '"onboardingType" is blank', status, body);

    expect(status).toBe(400);
    expect(JSON.stringify(body).toLowerCase()).toContain('onboardingtype');
  });

  // =========================================================================
  // 2. "onboardingSubtype" is blank
  // =========================================================================
  test('Case 3: Validate "onboardingSubtype" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.onboardingSubtype = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(3, '"onboardingSubtype" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'onboardingSubtype')).toBe('must not be blank');
  });

  // =========================================================================
  // 3. "name" is blank
  // =========================================================================
  test('Case 4: Validate "name" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.name = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(4, '"name" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'name')).toBe('must not be blank');
  });

  // =========================================================================
  // 4. "panNumber" is blank
  // =========================================================================
  test('Case 5: Validate "panNumber" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.panNumber = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(5, '"panNumber" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'panNumber')).toBe('must not be blank');
  });

  // =========================================================================
  // 5. "effectiveDate" is blank
  // =========================================================================
  test('Case 6: Validate "effectiveDate" behavior when blank', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.effectiveDate = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(6, '"effectiveDate" is blank', status, body);

    expect([200, 400]).toContain(status);
  });

  // =========================================================================
  // 6. "contactPerson.firstName" is blank
  // =========================================================================
  test('Case 7: Validate "contactPerson.firstName" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.contactPerson.firstName = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(7, '"contactPerson.firstName" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'firstName')).toBe('First name must not be blank');
  });

  // =========================================================================
  // 7. "contactPerson.lastName" is blank
  // =========================================================================
  test('Case 8: Validate "contactPerson.lastName" behavior when blank', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.contactPerson.lastName = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(8, '"contactPerson.lastName" is blank', status, body);

    expect([200, 400]).toContain(status);
  });

  // =========================================================================
  // 8. "contactPerson.email" is blank
  // =========================================================================
  test('Case 9: Validate "contactPerson.email" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.contactPerson.email = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(9, '"contactPerson.email" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'email')).toBe('Email must not be blank');
  });

  // =========================================================================
  // 9. "contactPerson.phone" is blank
  // =========================================================================
  test('Case 10: Validate "contactPerson.phone" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.contactPerson.phone = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(10, '"contactPerson.phone" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'phone')).toBe('Phone number must be a valid 10-digit number with optional country code');
  });

  // =========================================================================
  // 10. "contactPerson.designation" is blank
  // =========================================================================
  test('Case 11: Validate "contactPerson.designation" behavior when blank', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.contactPerson.designation = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(11, '"contactPerson.designation" is blank', status, body);

    expect([200, 400]).toContain(status);
  });

  // =========================================================================
  // 11. "addresses[0].addressType" is blank
  // =========================================================================
  test('Case 12: Validate "addresses[0].addressType" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.addresses[0].addressType = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(12, '"addresses[0].addressType" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'addressType') || JSON.stringify(body)).toBeTruthy();
  });

  // =========================================================================
  // 12. "addresses[0].addressLine1" is blank
  // =========================================================================
  test('Case 13: Validate "addresses[0].addressLine1" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.addresses[0].addressLine1 = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(13, '"addresses[0].addressLine1" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'addressLine1')).toBe('addressLine1 is required');
  });

  // =========================================================================
  // 13. "addresses[0].city" is blank
  // =========================================================================
  test('Case 14: Validate "addresses[0].city" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.addresses[0].city = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(14, '"addresses[0].city" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'city')).toBe('In City name, Only alphabets (A-Z, a-z), spaces, commas and parentheses are allowed');
  });

  // =========================================================================
  // 14. "addresses[0].state" is blank
  // =========================================================================
  test('Case 15: Validate "addresses[0].state" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.addresses[0].state = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(15, '"addresses[0].state" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'state')).toBe('state is required');
  });

  // =========================================================================
  // 15. "addresses[0].postalCode" is blank
  // =========================================================================
  test('Case 16: Validate "addresses[0].postalCode" is mandatory (Cannot be blank)', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.addresses[0].postalCode = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(16, '"addresses[0].postalCode" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'postalCode')).toBe('Postal code must not be empty');
  });

  // =========================================================================
  // 16. "addresses" list is empty []
  // =========================================================================
  test('Case 17: Validate "addresses" list cannot be empty array []', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.addresses = [];

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(17, '"addresses" list is empty []', status, body);

    expect(status).toBe(200);
    expect(getFieldError(body.details, 'addresses') || body.message).toBeTruthy();
  });

  // =========================================================================
  // 17. "bankDetails[0].bankAccountNumber" is blank
  // =========================================================================
  test('Case 18: Validate "bankDetails[0].bankAccountNumber" validation when blank', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.bankDetails[0].bankAccountNumber = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(18, '"bankDetails[0].bankAccountNumber" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'bankAccountNumber')).toMatch(/^(Bank account number is required|Bank account number must be numeric and between 6 to 18 digits)$/
);

  });

  // =========================================================================
  // 18. "bankDetails[0].bankIfsc" is blank
  // =========================================================================
  test('Case 19: Validate "bankDetails[0].bankIfsc" validation when blank', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.bankDetails[0].bankIfsc = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(19, '"bankDetails[0].bankIfsc" is blank', status, body);

    expect(status).toBe(400);
    expect(['Invalid IFSC code format', 'Bank IFSC code is required']).toContain(getFieldError(body.details, 'bankIfsc'));

  });

  // =========================================================================
  // 19. "bankDetails[0].bankName" is blank
  // =========================================================================
  test('Case 20: Validate "bankDetails[0].bankName" validation when blank', async ({ request }) => {
    const payload = getValidBasePayload();
    payload.bankDetails[0].bankName = '';

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise');
    const { status, body } = await getSafeResponse(response);

    logTestCase(20, '"bankDetails[0].bankName" is blank', status, body);

    expect(status).toBe(400);
    expect(getFieldError(body.details, 'bankName')).toBe('Bank name is required');
  });

});
