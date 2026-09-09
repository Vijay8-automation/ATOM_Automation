import { test, expect } from '@playwright/test';
import { RetrieveAPI } from '../../../../APIs/Modules/Franchise/Retrieve/RetrieveAPI';
import { CreateUpdateAPI } from '../../../../APIs/Modules/Franchise/Create_Update/CreateUpdateAPI';
import { ensureAuthToken } from '../../../../APIs/Modules/Franchise/franchiseBase';
import { pm } from '../../../../Utils';
import pdaPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_pda.json';

test.describe('Franchise - Retrieve API Tests', () => {
  let authToken: string;
  let testEntityId: string;
  let testPanNumber: string;

  test.beforeAll(async ({ playwright }) => {
    const reqContext = await playwright.request.newContext();
    authToken = await ensureAuthToken(reqContext);

    // Check if an entity ID is already available from previous test via Postman-like pm.environment
    testEntityId = pm.environment.get('createdEntityId');
    testPanNumber = pm.environment.get('createdPanNumber');

    if (!testEntityId) {
      // Fallback when running retrieve.spec.ts standalone
      testPanNumber = 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F';
      const createPayload = {
        ...pdaPayload,
        name: `Retrieve Test Entity ${Date.now()}`,
        panNumber: testPanNumber,
      };

      const createRes = await CreateUpdateAPI.createDraft(reqContext, createPayload, 'franchise', authToken);
      const body = await createRes.json();
      testEntityId = body?.data?.entityId;
      pm.environment.set('createdEntityId', testEntityId);
      pm.environment.set('createdPanNumber', testPanNumber);
    }
    console.log(`[Setup] Target entity for retrieval: ID=${testEntityId}, PAN=${testPanNumber}`);
  });

  test('01 - Should retrieve Franchise Details by Entity ID', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await RetrieveAPI.getDetailsById(request, testEntityId, 'franchise', authToken);
    console.log(`[Get by ID] Status: ${response.status()}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('success');
    expect(body.data).toBeDefined();
  });

  test('02 - Should retrieve Franchise by PAN Number', async ({ request }) => {
    test.skip(!testPanNumber, 'Skipping: panNumber not set');

    const response = await RetrieveAPI.getByPan(request, testPanNumber, 'franchise', authToken);
    console.log(`[Get by PAN] Status: ${response.status()}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('success');
  });

  test('03 - Should search Franchise by Name or Code', async ({ request }) => {
    const response = await RetrieveAPI.searchByNameOrCode(request, 'Ramesh', 'franchise', authToken);
    console.log(`[Search by Name] Status: ${response.status()}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('success');
  });
});
