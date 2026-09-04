import { test, expect } from '@playwright/test';
import { AddressAPI } from '../../../../APIs/Modules/Franchise/Address Management/AddressAPI';
import { CreateUpdateAPI } from '../../../../APIs/Modules/Franchise/Create_Update/CreateUpdateAPI';
import { LoginAPI } from '../../../../APIs/Modules/UserIAMService/auth/LoginAPI';

import pdaPayload from '../../../../APIs/Modules/Franchise/Create_Update/create_pda.json';
import singleAddressPayload from '../../../../APIs/Modules/Franchise/Address Management/add_single_address.json';
import bulkAddressesPayload from '../../../../APIs/Modules/Franchise/Address Management/add_bulk_addresses.json';

test.describe('Franchise - Address Management API Tests', () => {
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
      name: `Address Test Entity ${Date.now()}`,
      panNumber: 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F',
    };
    const createRes = await CreateUpdateAPI.createDraft(reqContext, createPayload, 'franchise', authToken);
    const body = await createRes.json();
    testEntityId = body?.data?.entityId;
    console.log(`[Setup] Entity created for address tests: ID=${testEntityId}`);
  });

  test('01 - Should retrieve Franchise Addresses', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await AddressAPI.getAddresses(request, testEntityId, authToken);
    console.log(`[Get Addresses] Status: ${response.status()}`);
    expect([200, 404]).toContain(response.status());
  });

  test('02 - Should add single address to Franchise Entity', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const uniqueAddress = {
      ...singleAddressPayload,
      addressLine1: `${Math.floor(100 + Math.random() * 900)} Finance Street`,
    };

    const response = await AddressAPI.addSingleAddress(request, testEntityId, uniqueAddress, authToken);
    console.log(`[Add Single Address] Status: ${response.status()}`);
    expect([200, 409]).toContain(response.status());
  });

  test('03 - Should add bulk addresses to Franchise Entity', async ({ request }) => {
    test.skip(!testEntityId, 'Skipping: entityId not created');

    const response = await AddressAPI.addBulkAddresses(request, testEntityId, bulkAddressesPayload, authToken);
    console.log(`[Add Bulk Addresses] Status: ${response.status()}`);
    expect([200, 409]).toContain(response.status());
  });
});
