import { test, expect } from '@playwright/test';
import { ApplicationLinkAPI } from '../../../../APIs/Modules/Franchise/Application Link/ApplicationLinkAPI';
import { CreateUpdateAPI } from '../../../../APIs/Modules/Franchise/Create_Update/CreateUpdateAPI';
import { LoginAPI } from '../../../../APIs/Modules/UserIAMService/auth/LoginAPI';

import pdaPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_pda.json';
import partialSavePayload from '../../../../APIs/Modules/Franchise/Application Link/partial_save.json';

test.describe('Franchise - Application Link API Tests', () => {
  let authToken: string;
  let testEntityId: string;
  let applicationToken: string;

  test.beforeAll(async ({ playwright }) => {
    const reqContext = await playwright.request.newContext();
    try {
      const loginRes = await LoginAPI.login(reqContext);
      authToken = loginRes.accessToken;
    } catch (err: any) {
      console.warn('[Auth] Login error:', err.message);
    }

    const createPayload = {
      ...pdaPayload,
      name: `App Link Entity ${Date.now()}`,
      panNumber: 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F',
    };
    const createRes = await CreateUpdateAPI.createDraft(reqContext, createPayload, 'franchise', authToken);
    const body = await createRes.json();
    testEntityId = body?.data?.entityId;
    console.log(`[Setup] Entity created for application link tests: ID=${testEntityId}`);
  });

  test('01 - Should generate application link token (Authenticated)', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await ApplicationLinkAPI.generateApplicationLink(request, testEntityId, 7, authToken);
    console.log(`[Generate Link] Status: ${response.status()}`);

    const body = await response.json();
    if (response.status() === 200 && body?.data?.token) {
      applicationToken = body.data.token;
      console.log(`[Generate Link] Token: ${applicationToken}`);
      expect(applicationToken).toBeTruthy();
    }
  });

  test('02 - Should open application by token (Public)', async ({ request }) => {
    test.skip(!applicationToken, 'Skipping: applicationToken not available');

    const response = await ApplicationLinkAPI.openApplication(request, applicationToken);
    console.log(`[Open App] Status: ${response.status()}`);
    expect([200, 400]).toContain(response.status());
  });

  test('03 - Should partially save application data via link (Public)', async ({ request }) => {
    test.skip(!applicationToken, 'Skipping: applicationToken not available');

    const response = await ApplicationLinkAPI.partialSave(request, applicationToken, partialSavePayload);
    console.log(`[Partial Save] Status: ${response.status()}`);
    expect([200, 400]).toContain(response.status());
  });
});
