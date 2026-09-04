import { test, expect } from '@playwright/test';
import { VerificationSupportingAPI } from '../../../../APIs/Modules/Franchise/Verification_Supporting/VerificationSupportingAPI';
import { LoginAPI } from '../../../../APIs/Modules/UserIAMService/auth/LoginAPI';

import filterPayload from '../../../../APIs/Modules/Franchise/Verification_Supporting/filter_entities.json';

test.describe('Franchise - Verification & Supporting API Tests', () => {
  let authToken: string;

  test.beforeAll(async ({ playwright }) => {
    const reqContext = await playwright.request.newContext();
    try {
      const loginRes = await LoginAPI.login(reqContext);
      authToken = loginRes.accessToken;
    } catch (err: any) {
      console.warn('[Auth] Login error:', err.message);
    }
  });

  test('01 - Should retrieve Franchise Filter Options', async ({ request }) => {
    const response = await VerificationSupportingAPI.getFilterOptions(request, 'franchise', authToken);
    console.log(`[Filter Options] Status: ${response.status()}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('success');
    expect(body.data).toBeDefined();
  });

  test('02 - Should retrieve Franchise Sub Types', async ({ request }) => {
    const response = await VerificationSupportingAPI.getSubTypes(request, 'franchise', authToken);
    console.log(`[Sub Types] Status: ${response.status()}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBeTruthy();
    console.log('[Sub Types] Available:', body.data);
  });

  test('03 - Should filter Franchise entities with pagination', async ({ request }) => {
    const response = await VerificationSupportingAPI.filterEntities(request, filterPayload, 0, 10, 'createdAt,desc', authToken);
    console.log(`[Filter Entities] Status: ${response.status()}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('success');
  });

  test('04 - Should test GSTIN verification', async ({ request }) => {
    const testGstin = '27AAAAA0000A1Z5';
    const response = await VerificationSupportingAPI.gstinVerification(request, testGstin, authToken);
    console.log(`[GSTIN Verify] Status: ${response.status()}`);
    expect([200, 400]).toContain(response.status());
  });
});
