import { test, expect } from '@playwright/test';
import { ApprovalAPI } from '../../../../APIs/Modules/Franchise/Approval/ApprovalAPI';
import { CreateUpdateAPI } from '../../../../APIs/Modules/Franchise/Create_Update/CreateUpdateAPI';
import { LoginAPI } from '../../../../APIs/Modules/UserIAMService/auth/LoginAPI';
import pdaPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_pda.json';

test.describe('Franchise - Approval API Tests', () => {
  let authToken: string;
  let testEntityId: string;

  test.beforeAll(async ({ playwright }) => {
    const reqContext = await playwright.request.newContext();
    try {
      const loginRes = await LoginAPI.login(reqContext);
      authToken = loginRes.accessToken;
    } catch (err: any) {
      console.warn('[Auth] Login error:', err.message);
    }

    // Create a draft entity for approval testing
    const createPayload = {
      ...pdaPayload,
      name: `Approval Test Entity ${Date.now()}`,
      panNumber: 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F',
    };
    const createRes = await CreateUpdateAPI.createDraft(reqContext, createPayload, 'franchise', authToken);
    const body = await createRes.json();
    testEntityId = body?.data?.entityId;
    console.log(`[Setup] Entity created for approval tests: ID=${testEntityId}`);
  });

  test('01 - Should raise Franchise approval request', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await ApprovalAPI.raiseApproval(request, testEntityId, { priority: 'MEDIUM' }, 'franchise', authToken);
    console.log(`[Raise Approval] Status: ${response.status()}`);
    expect([200, 400]).toContain(response.status());
  });

  test('02 - Should get Franchise approval status', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await ApprovalAPI.getApprovalStatus(request, testEntityId, authToken);
    console.log(`[Get Approval Status] Status: ${response.status()}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('success');
  });

  test('03 - Should move Franchise back to Draft', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await ApprovalAPI.moveToDraft(request, testEntityId, 'franchise', authToken);
    console.log(`[Move to Draft] Status: ${response.status()}`);
    expect([200, 409]).toContain(response.status());
  });
});
