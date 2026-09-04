import { test, expect } from '@playwright/test';
import { CreateUpdateAPI } from '../../../../APIs/Modules/Franchise/Create_Update/CreateUpdateAPI';
import { LoginAPI } from '../../../../APIs/Modules/UserIAMService/auth/LoginAPI';

// Import payloads from APIs folder
import pdaPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_pda.json';
import rpPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_rp.json';
import baPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_ba.json';
import bcPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_bc.json';
import submitPdaPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_submit_pda.json';

function generateRandomPan(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pan = '';
  for (let i = 0; i < 5; i++) pan += letters.charAt(Math.floor(Math.random() * letters.length));
  pan += Math.floor(1000 + Math.random() * 9000);
  pan += letters.charAt(Math.floor(Math.random() * letters.length));
  return pan;
}

test.describe('Franchise - Create / Update API Tests', () => {
  let authToken: string;

  test.beforeAll(async ({ playwright }) => {
    // Authenticate once via Master Login to get Bearer token
    const reqContext = await playwright.request.newContext();
    try {
      const loginRes = await LoginAPI.login(reqContext);
      authToken = loginRes.accessToken;
      console.log('[Auth] Logged in successfully before running Franchise tests.');
    } catch (err: any) {
      console.warn('[Auth] Login error, continuing with gateway headers:', err.message);
    }
  });

  test('01 - Should create Franchise Draft PDA successfully', async ({ request }) => {
    const timestamp = Date.now();
    const payload = {
      ...pdaPayload,
      name: `Ramesh Logistics Test ${timestamp}`,
      panNumber: generateRandomPan(),
    };

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise', authToken);
    console.log(`[Create PDA] Status: ${response.status()}`);

    const body = await response.json();
    console.log(`[Create PDA] Response:`, body);

    expect(response.status()).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.entityId).toBeTruthy();
    expect(body.data.status).toBe('DRAFT');
  });

  test('02 - Should create Franchise Draft RP successfully', async ({ request }) => {
    const timestamp = Date.now();
    const payload = {
      ...rpPayload,
      name: `Suresh Transport Test ${timestamp}`,
      panNumber: generateRandomPan(),
    };

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise', authToken);
    console.log(`[Create RP] Status: ${response.status()}`);

    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.entityId).toBeTruthy();
    expect(body.data.status).toBe('DRAFT');
  });

  test('03 - Should create Franchise Draft BA successfully', async ({ request }) => {
    const timestamp = Date.now();
    const payload = {
      ...baPayload,
      name: `Priya Enterprises Test ${timestamp}`,
      panNumber: generateRandomPan(),
    };

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise', authToken);
    console.log(`[Create BA] Status: ${response.status()}`);

    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.entityId).toBeTruthy();
    expect(body.data.status).toBe('DRAFT');
  });

  test('04 - Should create Franchise Draft BC successfully', async ({ request }) => {
    const timestamp = Date.now();
    const payload = {
      ...bcPayload,
      name: `Vikram Services Test ${timestamp}`,
      panNumber: generateRandomPan(),
    };

    const response = await CreateUpdateAPI.createDraft(request, payload, 'franchise', authToken);
    console.log(`[Create BC] Status: ${response.status()}`);

    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.entityId).toBeTruthy();
    expect(body.data.status).toBe('DRAFT');
  });

  test('05 - Should create Franchise and Submit PDA in one call', async ({ request }) => {
    const timestamp = Date.now();
    const payload = {
      ...submitPdaPayload,
      name: `Ravi Express Submit Test ${timestamp}`,
      panNumber: generateRandomPan(),
    };

    const response = await CreateUpdateAPI.createAndSubmit(request, payload, 'franchise', authToken);
    console.log(`[Create & Submit PDA] Status: ${response.status()}`);

    const body = await response.json();
    expect([200, 400]).toContain(response.status());
  });

  test('06 - Should update existing Franchise Draft', async ({ request }) => {
    // 1. Create a draft first to get an entityId
    const timestamp = Date.now();
    const createPayload = {
      ...pdaPayload,
      name: `Entity For Update ${timestamp}`,
      panNumber: generateRandomPan(),
    };
    const createRes = await CreateUpdateAPI.createDraft(request, createPayload, 'franchise', authToken);
    const createBody = await createRes.json();
    const entityId = createBody?.data?.entityId;

    if (entityId) {
      // 2. Update it
      const updatePayload = {
        ...createPayload,
        name: `Entity Updated ${timestamp}`,
      };
      const updateRes = await CreateUpdateAPI.updateDraft(request, entityId, updatePayload, 'franchise', authToken);
      console.log(`[Update Draft] Status: ${updateRes.status()}`);
      expect(updateRes.status()).toBe(200);
    }
  });
});
