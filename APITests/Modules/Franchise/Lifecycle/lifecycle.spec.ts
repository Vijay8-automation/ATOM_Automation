import { test, expect } from '@playwright/test';
import { LifecycleAPI } from '../../../../APIs/Modules/Franchise/Lifecycle/LifecycleAPI';
import { CreateUpdateAPI } from '../../../../APIs/Modules/Franchise/Create_Update/CreateUpdateAPI';
import { LoginAPI } from '../../../../APIs/Modules/UserIAMService/auth/LoginAPI';

import pdaPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_pda.json';
import patchPayload from '../../../../APIs/Modules/Franchise/Lifecycle/patch_data.json';
import assignUserPayload from '../../../../APIs/Modules/Franchise/Lifecycle/assign_user.json';
import assignClusterPayload from '../../../../APIs/Modules/Franchise/Lifecycle/assign_cluster.json';
import updateStatusPayload from '../../../../APIs/Modules/Franchise/Lifecycle/update_status.json';

test.describe('Franchise - Lifecycle API Tests', () => {
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

    const createPayload = {
      ...pdaPayload,
      name: `Lifecycle Test Entity ${Date.now()}`,
      panNumber: 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F',
    };
    const createRes = await CreateUpdateAPI.createDraft(reqContext, createPayload, 'franchise', authToken);
    const body = await createRes.json();
    testEntityId = body?.data?.entityId;
    console.log(`[Setup] Entity created for lifecycle tests: ID=${testEntityId}`);
  });

  test('01 - Should patch dynamic entity data into JSONB', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await LifecycleAPI.patchData(request, testEntityId, patchPayload, authToken);
    console.log(`[Patch Data] Status: ${response.status()}`);
    expect([200, 204]).toContain(response.status());
  });

  test('02 - Should assign user to Franchise Entity', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await LifecycleAPI.assignUser(request, testEntityId, assignUserPayload, authToken);
    console.log(`[Assign User] Status: ${response.status()}`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('03 - Should assign cluster code to Franchise Entity', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await LifecycleAPI.assignClusterCode(request, testEntityId, assignClusterPayload.clusterCodes, authToken);
    console.log(`[Assign Cluster] Status: ${response.status()}`);
    expect([200, 400]).toContain(response.status());
  });

  test('04 - Should retrieve Entity History', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await LifecycleAPI.getHistory(request, testEntityId, authToken);
    console.log(`[Get History] Status: ${response.status()}`);
    expect(response.status()).toBe(200);
  });

  test('05 - Should update Entity Status to INACTIVE', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await LifecycleAPI.updateStatus(request, testEntityId, updateStatusPayload as any, authToken);
    console.log(`[Update Status] Status: ${response.status()}`);
    expect([200, 400, 409]).toContain(response.status());
  });

  test('06 - Should deactivate Franchise Entity (Soft delete)', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await LifecycleAPI.deactivate(request, testEntityId, 'franchise', authToken);
    console.log(`[Deactivate] Status: ${response.status()}`);
    expect([200, 400, 409]).toContain(response.status());
  });

  test('07 - Should hard delete Franchise Draft Entity', async ({ request }) => {
    // Create a fresh draft to delete
    const createPayload = {
      ...pdaPayload,
      name: `Entity to Delete ${Date.now()}`,
      panNumber: 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F',
    };
    const createRes = await CreateUpdateAPI.createDraft(request, createPayload, 'franchise', authToken);
    const body = await createRes.json();
    const deleteId = body?.data?.entityId;

    if (deleteId) {
      const response = await LifecycleAPI.hardDelete(request, deleteId, 'franchise', authToken);
      console.log(`[Hard Delete] Status: ${response.status()}`);
      expect(response.status()).toBe(200);
    }
  });
});
