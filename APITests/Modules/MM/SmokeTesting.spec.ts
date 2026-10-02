import { test, expect } from '@playwright/test';
import { MMWorkflow } from '../../../Utils/Workflows/MMWorkflow';
import { BaseAPI } from '../../../APIs/Common/BaseAPI';
import { MMTripAPI } from '../../../APIs/Modules/MM/MMTripAPI';
import { ManifestAPI } from '../../../APIs/Modules/MM/ManifestAPI';
import { pm } from '../../../Utils/VariableManager';

// Helper to attach complete API request and response details in Playwright HTML Report
async function attachApiLog(testInfo: any, stepName: string, reqInfo: any, resInfo: any) {
  await testInfo.attach(`API Smoke Log - ${stepName}`, {
    body: JSON.stringify(
      {
        step: stepName,
        request: reqInfo,
        response: { statusCode: resInfo.status, body: resInfo.body },
      },
      null,
      2
    ),
    contentType: 'application/json',
  });
}

test.describe('Middle Mile (MM) - Smoke Testing Suite (CI/CD Pre-Flight & Critical E2E Paths)', () => {
  test.describe.configure({ mode: 'serial' });

  const companyCode = Number(pm.environment.get('companyCode'));
  const sourceBranch = String(pm.environment.get('sourceBranch'));
  const intermediateBranch = String(pm.environment.get('intermediateBranch'));
  const destinationBranch = String(pm.environment.get('destinationBranch'));
  const dockFilterAll = String(pm.environment.get('dockFilterAll'));
  const branchInventoryFilterCurrent = String(pm.environment.get('branchInventoryFilterCurrent'));

  // =========================================================================
  // SMOKE SCENARIO 1: Complete Direct Middle Mile E2E Flow (with Pre-Execution MOVABLE FIFO Check)
  // =========================================================================
  test('Scenario 1: [Smoke - Direct Express E2E Flow] Verify Pre-Execution MOVABLE FIFO Check & Complete Middle Mile Process Execution (Docket -> Scan -> Trip -> Load -> Seal -> Gate-Out -> Gate-In -> Unload -> COMPLETED)', async ({ request }, testInfo) => {
    test.setTimeout(180000);
    const mmBaseUrl = BaseAPI.getServiceUrl('mm');
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(token);

    const result = await MMWorkflow.executeCompleteMMFlow(request);
    expect(result.docketNo).toBeDefined();
    expect(result.tripNo).toBeDefined();
    expect(result.manifestNo).toBeDefined();
    expect(result.boxCode).toBeDefined();

    // Deep Persisted DB Field Check on Completed Trip
    const tripRes = await request.get(`${mmBaseUrl}/api/v1/trips/${result.tripNo}?companyCode=${companyCode}`, { headers });
    const tripBody = await tripRes.json().catch(() => ({}));
    await attachApiLog(testInfo, 'Smoke Scenario 1: Verify Completed Direct Trip Detail', { tripNo: result.tripNo }, { status: tripRes.status(), body: tripBody });
    expect(tripRes.status()).toBe(200);
    expect(tripBody?.data?.trip?.status).toBe('COMPLETED');
  });

  // =========================================================================
  // SMOKE SCENARIO 2: Complete Multi-Leg Touch-Point E2E Flow (1001 -> [1002] -> 2115)
  // =========================================================================
  test('Scenario 2: [Smoke - Multi-Leg Touch-Point E2E Flow] Verify Complete SERVICE Touch-Point Flow (01 Movable Dockets -> 02 First Docket Manifest -> 03 Idempotency Replay -> 04 Second Docket Reuse -> Leg-2 Transit & Final COMPLETED)', async ({ request }, testInfo) => {
    test.setTimeout(180000);
    const mmBaseUrl = BaseAPI.getServiceUrl('mm');
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(token);

    const tpResult = await MMWorkflow.executeTouchPointMMFlow(request);
    expect(tpResult.tripNo).toBeTruthy();
    expect(tpResult.originManifestNo).toBeTruthy();
    expect(tpResult.touchPointManifestNo).toBeTruthy();

    // Deep Persisted DB Field Check on Multi-Leg Completed Trip
    const deepRes = await request.get(`${mmBaseUrl}/api/v1/trips/${tpResult.tripNo}?companyCode=${companyCode}`, { headers });
    const deepBody = await deepRes.json().catch(() => ({}));
    await attachApiLog(testInfo, 'Smoke Scenario 2: Verify Completed Touch-Point Trip Detail', { tripNo: tpResult.tripNo }, { status: deepRes.status(), body: deepBody });
    expect(deepRes.status()).toBe(200);
    expect(deepBody?.data?.trip?.status).toBe('COMPLETED');
    expect(deepBody?.data?.trip?.manifestCount).toBe(3);
    expect(deepBody?.data?.trip?.docketCount).toBe(3);
    expect(deepBody?.data?.route?.touchPointCodes).toContain(intermediateBranch);
  });

  // =========================================================================
  // SMOKE SCENARIO 3: Trip Status Lifecycle Filters (CREATED, CANCELLED, READY_FOR_DISPATCH, GATE_OUT_IN_TRANSIT, GATE_IN, COMPLETED) & Status Counts
  // =========================================================================
  test('Scenario 3: [Smoke - Status Lifecycle Filters & Counts Badges] Verify CREATED, CANCELLED, READY_FOR_DISPATCH, GATE_OUT_IN_TRANSIT, GATE_IN & COMPLETED Status Filters and GET /api/v1/trips/counts', async ({ request }, testInfo) => {
    test.setTimeout(180000);

    for (const status of ['CREATED', 'CANCELLED', 'READY_FOR_DISPATCH', 'GATE_OUT_IN_TRANSIT', 'GATE_IN', 'COMPLETED'] as const) {
      await test.step(`Verify Trip Creation & Filter for Status "${status}"`, async () => {
        const created = await MMWorkflow.createTripInStatus(request, status);
        expect(created.tripNo).toBeTruthy();
        const listRes = await MMTripAPI.listTrips(request, { companyCode, status, size: 25 });
        await attachApiLog(testInfo, `Smoke Status Filter Check: ${status}`, { status, tripNo: created.tripNo }, listRes);
        expect(listRes.status).toBe(200);
        expect(listRes.body?.status).toBe('SUCCESS');
        const items = listRes.body?.data?.items || [];
        expect(items.some((t: any) => t.tripNo === created.tripNo)).toBe(true);
      });
    }

    await test.step('Verify GET /api/v1/trips/counts Status Badges', async () => {
      const countsRes = await MMTripAPI.getTripCounts(request, { companyCode });
      await attachApiLog(testInfo, 'Smoke Status Counts Check', { companyCode }, countsRes);
      expect(countsRes.status).toBe(200);
      expect(countsRes.body?.status).toBe('SUCCESS');
      const counts = countsRes.body?.data || {};
      for (const tab of ['ALL', 'PLANNED', 'CREATED', 'READY_FOR_DISPATCH', 'GATE_OUT_IN_TRANSIT', 'GATE_IN', 'COMPLETED', 'CANCELLED']) {
        expect(counts).toHaveProperty(tab);
        expect(counts[tab]).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // =========================================================================
  // SMOKE SCENARIO 4: Load Dashboard & Yard Dock Management Read APIs Health Check
  // =========================================================================
  test('Scenario 4: [Smoke - Load Dashboard & Yard Dock Management APIs] Verify Branch Route-Wise Inventory, Route-Type Counts, Yard Dock Summary, Docks & Queue', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const token = await BaseAPI.ensureAuthToken(request);

    const invRes = await ManifestAPI.getBranchRouteWiseInventory(
      request,
      { companyCode, branch: sourceBranch, filter: branchInventoryFilterCurrent, page: 0, size: 10 },
      token
    );
    await attachApiLog(testInfo, 'Smoke 4a: Branch Route-Wise Inventory', { branch: sourceBranch, filter: branchInventoryFilterCurrent }, invRes);
    expect(invRes.status).toBe(200);
    expect(invRes.body?.status).toBe('SUCCESS');
    const currPageObj = invRes.body?.data?.page || invRes.body?.data;
    expect(Array.isArray(currPageObj?.items)).toBe(true);

    const cntRes = await ManifestAPI.getRouteTypeCounts(request, { companyCode, branch: sourceBranch }, token);
    await attachApiLog(testInfo, 'Smoke 4b: Route-Type Counts', { branch: sourceBranch }, cntRes);
    expect(cntRes.status).toBe(200);
    expect(cntRes.body?.status).toBe('SUCCESS');
    expect(cntRes.body?.data).toBeDefined();

    const sumRes = await ManifestAPI.getYardDockManagementSummary(request, { companyCode, branch: sourceBranch }, token);
    await attachApiLog(testInfo, 'Smoke 4c: Yard Dock Summary', { branch: sourceBranch }, sumRes);
    expect(sumRes.status).toBe(200);
    expect(sumRes.body?.status).toBe('SUCCESS');
    expect(sumRes.body?.data).toBeDefined();

    const dksRes = await ManifestAPI.getYardDockManagementDocks(
      request,
      { companyCode, branch: sourceBranch, filter: dockFilterAll, page: 0, size: 10 },
      token
    );
    await attachApiLog(testInfo, 'Smoke 4d: Yard Dock List', { branch: sourceBranch, filter: dockFilterAll }, dksRes);
    expect(dksRes.status).toBe(200);
    expect(dksRes.body?.status).toBe('SUCCESS');
    expect(dksRes.body?.data).toBeDefined();

    const qRes = await ManifestAPI.getYardDockManagementQueue(request, { companyCode, branch: sourceBranch }, token);
    await attachApiLog(testInfo, 'Smoke 4e: Yard Dock Queue', { branch: sourceBranch }, qRes);
    expect(qRes.status).toBe(200);
    expect(qRes.body?.status).toBe('SUCCESS');
    expect(qRes.body?.data).toBeDefined();
  });
});
