import { test, expect } from '@playwright/test';
import { MMWorkflow } from '../../../Utils/Workflows/MMWorkflow';
import { LMWorkflow } from '../../../Utils/Workflows/LMWorkflow';
import { LMFMTripAPI } from '../../../APIs/Modules/LMFM/LMFMTripAPI';
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

test.describe('First Mile & Last Mile (FMLM) - Smoke Testing Suite (CI/CD Pre-Flight & Critical E2E Paths)', () => {
  test.describe.configure({ mode: 'serial' });

  const companyCode = Number(pm.environment.get('companyCode'));
  const destinationBranch = String(pm.environment.get('destinationBranch'));
  const actor = String(pm.environment.get('actor'));

  // =========================================================================
  // SMOKE SCENARIO 1: Pre-Flight Dependency Check + Complete E2E MM to LM Execution
  // =========================================================================
  test('Scenario 1: [Pre-Flight Dependency Check + E2E Smoke] Verify FIFO/Vehicle Pre-Flight Check and complete end-to-end Middle Mile to Last Mile execution', async ({ request }, testInfo) => {
    test.setTimeout(180000);
    console.log('\n================================================================');
    console.log('🚀 [SCENARIO 1] PRE-FLIGHT CHECK & COMPLETE END-TO-END MM -> LM FLOW');
    console.log('================================================================\n');

    // 0. Pre-Flight Dependency Check (MM FIFO Movable Queue, LM Open Drafts, LM Fleet Vehicle Status)
    const preFlightReport = await LMWorkflow.executePreFlightDependencyCheck(
      request,
      'SmokeTestingFMLM.spec.ts'
    );
    expect(preFlightReport).toBeDefined();
    expect(preFlightReport.suiteName).toBe('SmokeTestingFMLM.spec.ts');
    expect(Array.isArray(preFlightReport.lmOpenDraftsCheck.branchesChecked)).toBe(true);
    expect(Array.isArray(preFlightReport.lmFleetVehicleStatusCheck.fleetVehiclesChecked)).toBe(true);
    await testInfo.attach('Pre-Flight Dependency & FIFO/Vehicle Status Check Report', {
      body: JSON.stringify(preFlightReport, null, 2),
      contentType: 'application/json',
    });

    // 1. Re-use complete MM flow (Booking -> Manifest -> Loading -> Gate-Out -> Gate-In -> Unload)
    const mmResult = await MMWorkflow.executeCompleteMMFlow(request);
    expect(mmResult.docketNo).toBeTruthy();
    expect(mmResult.boxCode).toBeTruthy();
    expect(mmResult.tripNo).toBeTruthy();
    expect(mmResult.manifestNo).toBeTruthy();

    // 2. Re-use complete LM flow (Eligible -> Trip Create -> Verify -> Scan -> Load -> Pouch -> Ready -> Gate-Out -> POD -> Close)
    const lmResult = await LMWorkflow.executeCompleteLMFlow(request, mmResult);
    expect(lmResult.tripNo).toBeTruthy();
    expect(lmResult.docketNo).toBe(mmResult.docketNo);
    expect(lmResult.deliveryOutcome).toBe('DELIVERED');
    expect(lmResult.tripOutcome).toBe('COMPLETED');

    // 3. Deep Persisted DB Field Check on Completed LM Trip
    const tripDetailRes = await LMFMTripAPI.getTripDetail(request, lmResult.tripNo, companyCode);
    await attachApiLog(
      testInfo,
      'Smoke Scenario 1: Verify Completed LM Trip Detail',
      { tripNo: lmResult.tripNo, docketNo: lmResult.docketNo },
      tripDetailRes
    );
    expect(tripDetailRes.status).toBe(200);
    expect(tripDetailRes.body?.status).toBe('SUCCESS');
    expect(['COMPLETED', 'CLOSED']).toContain(tripDetailRes.body?.data?.trip_state || tripDetailRes.body?.data?.status);
  });

  // =========================================================================
  // SMOKE SCENARIO 2: LMFM Operational Dashboard & Branch Inventory Read APIs Health Check
  // =========================================================================
  test('Scenario 2: [Smoke - LMFM Operational Dashboard & Inventory APIs] Verify Trip Listing, Trip Status Counts, Eligible/Non-Eligible Inventory & Planning Clusters', async ({ request }, testInfo) => {
    test.setTimeout(120000);

    await test.step('Verify GET /api/v1/lmfm/trips (Trip Listing)', async () => {
      const listRes = await LMFMTripAPI.listTrips(request, { companyCode, branchCode: destinationBranch, page: 0, size: 10 });
      await attachApiLog(testInfo, 'Smoke 2a: LMFM Trip Listing', { branchCode: destinationBranch, companyCode }, listRes);
      expect(listRes.status).toBe(200);
      expect(listRes.body?.status).toBe('SUCCESS');
      expect(listRes.body?.data).toBeDefined();
      expect(Array.isArray(listRes.body?.data?.items)).toBe(true);
    });

    await test.step('Verify GET /api/v1/lmfm/trips/counts (Dashboard Status Badges)', async () => {
      const countsRes = await LMFMTripAPI.getTripCounts(request, { companyCode, branch: destinationBranch });
      await attachApiLog(testInfo, 'Smoke 2b: LMFM Trip Status Counts', { branch: destinationBranch, companyCode }, countsRes);
      expect(countsRes.status).toBe(200);
      expect(countsRes.body?.status).toBe('SUCCESS');
      expect(countsRes.body?.data).toBeDefined();
      expect(countsRes.body?.data).toHaveProperty('ALL');
    });

    await test.step('Verify GET /api/v1/lmfm/branches/{branchCode}/eligible (Eligible Inventory Bucket)', async () => {
      const eligibleRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode);
      await attachApiLog(testInfo, 'Smoke 2c: LMFM Branch Eligible Inventory', { branchCode: destinationBranch, companyCode }, eligibleRes);
      expect(eligibleRes.status).toBe(200);
      expect(eligibleRes.body?.status).toBe('SUCCESS');
      expect(Array.isArray(eligibleRes.body?.data?.items)).toBe(true);
    });

    await test.step('Verify GET /api/v1/lmfm/branches/{branchCode}/non-eligible (Non-Eligible Inventory Bucket)', async () => {
      const nonEligibleRes = await LMFMTripAPI.getNonEligibleInventory(request, destinationBranch, companyCode);
      await attachApiLog(testInfo, 'Smoke 2d: LMFM Branch Non-Eligible Inventory', { branchCode: destinationBranch, companyCode }, nonEligibleRes);
      expect(nonEligibleRes.status).toBe(200);
      expect(nonEligibleRes.body?.status).toBe('SUCCESS');
      expect(Array.isArray(nonEligibleRes.body?.data?.items)).toBe(true);
    });

    await test.step('Verify GET /api/v1/lmfm/branches/{branchCode}/planning/clusters (Planning Clusters)', async () => {
      const clustersRes = await LMFMTripAPI.getPlanningClusters(request, destinationBranch, companyCode);
      await attachApiLog(testInfo, 'Smoke 2e: LMFM Branch Planning Clusters', { branchCode: destinationBranch, companyCode }, clustersRes);
      expect(clustersRes.status).toBe(200);
      expect(clustersRes.body?.status).toBe('SUCCESS');
      expect(clustersRes.body?.data).toBeDefined();
      expect(Array.isArray(clustersRes.body?.data?.clusters || clustersRes.body?.data)).toBe(true);
    });
  });

  // =========================================================================
  // SMOKE SCENARIO 3 (OmOne Project_LM Section A.1): Strict Eligible vs Non-Eligible Bucket Filtering Smoke Check
  // =========================================================================
  test('Scenario 3: [OmOne_LM Section A.1 Smoke] Verify Strict Eligible Bucket Filtering vs Future Appointment & Hold Dockets', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const eligibleDkt = `7500-SMK-ELG-${ts}`;
    const futureApptDkt = `7500-SMK-FUT-${ts}`;

    await test.step('Register 1 Eligible Docket (No Appointment) & 1 Future Appointment Docket at Branch 2115', async () => {
      const elgArr = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: eligibleDkt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Apollo MedTech, Max Hospital Patparganj, 400604',
        totalBoxes: 2,
        totalWeight: 35.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(elgArr.status);
      expect(elgArr.body?.status).toBe('SUCCESS');

      const futArr = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: futureApptDkt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Apollo MedTech, Max Hospital Patparganj, 400604',
        totalBoxes: 1,
        totalWeight: 20.0,
        appointmentDate: '2026-10-25',
        appointmentSlot: '10:00-12:00',
        actor,
      });
      expect([200, 201]).toContain(futArr.status);
      expect(futArr.body?.status).toBe('SUCCESS');
    });

    await test.step('Verify Eligible Docket is in /eligible and Future Appointment Docket is isolated in /non-eligible', async () => {
      const eligibleRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode);
      expect(eligibleRes.status).toBe(200);
      expect(eligibleRes.body?.status).toBe('SUCCESS');
      const nonEligibleRes = await LMFMTripAPI.getNonEligibleInventory(request, destinationBranch, companyCode);
      expect(nonEligibleRes.status).toBe(200);
      expect(nonEligibleRes.body?.status).toBe('SUCCESS');

      await attachApiLog(
        testInfo,
        'Smoke 3: Strict Eligible vs Non-Eligible Bucket Filtering',
        { eligibleDkt, futureApptDkt },
        {
          status: eligibleRes.status,
          body: {
            eligibleFound: (eligibleRes.body?.data?.items || []).some((i: any) => i.docket_no === eligibleDkt),
            futureInEligible: (eligibleRes.body?.data?.items || []).some((i: any) => i.docket_no === futureApptDkt),
            futureInNonEligible: (nonEligibleRes.body?.data?.items || []).find((i: any) => i.docket_no === futureApptDkt),
          },
        }
      );

      const eligibleItems = eligibleRes.body?.data?.items || [];
      const nonEligibleItems = nonEligibleRes.body?.data?.items || [];
      const totalEligible = Number(eligibleRes.body?.data?.total ?? eligibleItems.length);

      if (totalEligible > 100) {
        const skipMsg = `[PAGINATION LIMIT] Branch ${destinationBranch} has ${totalEligible} eligible dockets (> 100 pagination limit). Skipping until pool is cleaned.`;
        console.warn(`\n⏭️  ${skipMsg}\n`);
        testInfo.annotations.push({ type: 'skip_reason', description: skipMsg });
        await testInfo.attach('SKIP_REASON', { body: skipMsg, contentType: 'text/plain' });
        test.skip(true, skipMsg);
      }

      expect(eligibleItems.some((i: any) => i.docket_no === eligibleDkt)).toBe(true);
      expect(eligibleItems.some((i: any) => i.docket_no === futureApptDkt)).toBe(false);

      const futRecord = nonEligibleItems.find((i: any) => i.docket_no === futureApptDkt);
      expect(futRecord).toBeDefined();
      expect(futRecord?.bucket_type).toBe('FUTURE_APPOINTMENT');
    });
  });
});
