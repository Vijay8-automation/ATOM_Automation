import { test, expect } from '@playwright/test';
import { MMWorkflow } from '../../../Utils/Workflows/MMWorkflow';
import { LMWorkflow } from '../../../Utils/Workflows/LMWorkflow';
import { LMFMTripAPI } from '../../../APIs/Modules/LMFM/LMFMTripAPI';
import { ManifestAPI } from '../../../APIs/Modules/MM/ManifestAPI';
import { ScanningAPI } from '../../../APIs/Modules/Scanning/ScanningAPI';
import { pm } from '../../../Utils/VariableManager';
import * as crypto from 'crypto';

// Helper to attach complete API request and response details in Playwright HTML Report
async function attachApiLog(
  testInfo: any,
  stepName: string,
  requestInfo: { method: string; endpoint: string; queryParams?: any; payload?: any },
  responseInfo: { status: number; body: any }
) {
  await testInfo.attach(`API Positive Log - ${stepName}`, {
    body: JSON.stringify(
      {
        step: stepName,
        request: {
          method: requestInfo.method,
          endpoint: requestInfo.endpoint,
          queryParams: requestInfo.queryParams || null,
          payload: requestInfo.payload || null,
        },
        response: {
          statusCode: responseInfo.status,
          body: responseInfo.body,
        },
      },
      null,
      2
    ),
    contentType: 'application/json',
  });
}

test.describe('First Mile & Last Mile (FMLM) - Positive Scenarios Suite (Complete MM to LM E2E & Step 1 Eligible Pool SC_01 to SC_12)', () => {
  test.describe.configure({ mode: 'default' });

  const companyCode = Number(pm.environment.get('companyCode'));
  const destinationBranch = String(pm.environment.get('destinationBranch'));
  const actor = String(pm.environment.get('actor'));
  const approverActor = String(pm.environment.get('approverActor'));

  // =========================================================================
  // POSITIVE SCENARIO 1 (SC_01 - TC_01.1): Pre-Flight Dependency Check + Complete E2E MM to LM Execution
  // =========================================================================
  test('Scenario 1: [SC_01 / TC_01.1 - Pre-Flight Check + E2E Positive] Verify FIFO/Vehicle Pre-Flight Check and complete end-to-end Middle Mile (ARRIVED LHC + Unload Scan AT_HUB) to Last Mile Eligible Pool & Delivery', async ({ request }, testInfo) => {
    test.setTimeout(180000);
    console.log('\n================================================================');
    console.log('🚀 [SCENARIO 1 | SC_01 - TC_01.1] PRE-FLIGHT CHECK & COMPLETE END-TO-END MM & LM FLOW');
    console.log('================================================================\n');

    // 0. Pre-Flight Dependency Check (MM FIFO Movable Queue, LM Open Drafts, LM Fleet Vehicle Status)
    const preFlightReport = await LMWorkflow.executePreFlightDependencyCheck(
      request,
      'PositiveMMTripScenarioFMLM.spec.ts'
    );
    expect(preFlightReport).toBeDefined();
    expect(preFlightReport.suiteName).toBe('PositiveMMTripScenarioFMLM.spec.ts');
    expect(Array.isArray(preFlightReport.lmOpenDraftsCheck.branchesChecked)).toBe(true);
    expect(Array.isArray(preFlightReport.lmFleetVehicleStatusCheck.fleetVehiclesChecked)).toBe(true);

    await testInfo.attach('Pre-Flight Dependency & FIFO/Vehicle Status Check Report', {
      body: JSON.stringify(preFlightReport, null, 2),
      contentType: 'application/json',
    });

    // Check FIFO movable dockets
    const pendingFifo = await ManifestAPI.getMovableDockets(request, '1001', { companyCode: 400021, size: 100 });
    const pendingItems = (pendingFifo.body?.data?.items || []).filter(
      (item: any) => (item.destination_branch || item.destinationBranch) === destinationBranch
    );
    if (pendingItems.length > 0) {
      test.skip(true, `Before execution kindly marked 'Boarded' for these Dockets: [${pendingItems.map((i: any) => i.docket_no || i.docketNo).join(', ')}]`);
    }

    // Check Eligible Pool Count at Destination Branch (>100 limit check)
    const initialElig = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, { size: 100 });
    const eligibleTotal = Number(initialElig.body?.data?.total || 0);
    if (eligibleTotal > 100) {
      const skipMsg = `[POOL LIMIT] Branch ${destinationBranch} has ${eligibleTotal} eligible dockets (> 100 pagination limit). Test skipped as per limit policy.`;
      console.warn(`\n⏭️  ${skipMsg}\n`);
      testInfo.annotations.push({ type: 'skip_reason', description: skipMsg });
      await testInfo.attach('SKIP_REASON', { body: skipMsg, contentType: 'text/plain' });
      test.skip(true, skipMsg);
    }

    // 1. Re-use complete MM flow (Booking -> Manifest -> Loading -> Gate-Out -> Gate-In -> Unload AT_HUB)
    const mmResult = await MMWorkflow.executeCompleteMMFlow(request);
    expect(mmResult).toBeDefined();
    expect(mmResult.docketNo).toBeTruthy();
    expect(mmResult.boxCode).toBeTruthy();
    expect(mmResult.tripNo).toBeTruthy();
    expect(mmResult.manifestNo).toBeTruthy();

    // 2. Re-use complete LM flow (TC_01.1 Eligible Pool Entry -> Trip Create -> Verify -> Scan -> Load -> Pouch -> Ready -> Gate-Out -> POD -> Close)
    const lmResult = await LMWorkflow.executeCompleteLMFlow(request, mmResult);
    expect(lmResult).toBeDefined();
    expect(lmResult.tripNo).toBeTruthy();
    expect(lmResult.docketNo).toBe(mmResult.docketNo);
    expect(lmResult.boxCode).toBe(mmResult.boxCode);
    expect(lmResult.publicScanId).toBeTruthy();
    expect(lmResult.deliveryOutcome).toBe('DELIVERED');
    expect(lmResult.tripOutcome).toBe('COMPLETED');

    await attachApiLog(
      testInfo,
      'Scenario 1 (SC_01 / TC_01.1): Complete MM to LM E2E Execution Summary',
      {
        method: 'POST',
        endpoint: '/api/v1/lmfm/trips/{tripNo}/close',
        payload: { mmTripNo: mmResult.tripNo, lmTripNo: lmResult.tripNo, docketNo: lmResult.docketNo, boxCode: lmResult.boxCode },
      },
      {
        status: 200,
        body: lmResult,
      }
    );
  });

  // =========================================================================
  // POSITIVE SCENARIO 2 (SC_03 - TC_03.1, TC_03.2, TC_03.3, TC_03.4): Strict Eligible Bucket Filtering
  // =========================================================================
  test("Scenario 2: [SC_03 / TC_03.1, TC_03.2, TC_03.3, TC_03.4] Verify Strict Eligible Bucket Filtering vs Future Appointment, Hold/Restricted & Today's Confirmed Appointment Dockets", async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const todayStr = new Date().toISOString().slice(0, 10);
    const dktEligible = `7500-A1-ELG-${ts}`;
    const dktFutureAppt = `7500-A1-FUT-${ts}`;
    const dktHold = `7500-A1-HLD-${ts}`;
    const dktTodayAppt = `7500-A1-TDY-${ts}`;

    await test.step("Step 1 (TC_03.1 - TC_03.4): Register 4 Dockets at Branch 2115 (1 Eligible, 1 Future Appointment, 1 Hold, 1 Today's Confirmed Appointment)", async () => {
      // 1a. Standard Eligible Docket
      const resElg = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktEligible,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Apollo MedTech, Max Hospital Patparganj, 400604',
        totalBoxes: 2,
        totalWeight: 45.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(resElg.status);
      expect(resElg.body?.status).toBe('SUCCESS');
      expect(resElg.body?.data?.inventoryId).toBeTruthy();

      // 1b. Future Appointment Docket (TC_03.1)
      const resFut = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktFutureAppt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Apollo MedTech, Max Hospital Patparganj, 400604',
        totalBoxes: 1,
        totalWeight: 25.0,
        appointmentDate: '2026-10-28',
        appointmentSlot: '10:00-12:00',
        actor,
      });
      expect([200, 201]).toContain(resFut.status);
      expect(resFut.body?.status).toBe('SUCCESS');
      expect(resFut.body?.data?.inventoryId).toBeTruthy();

      // 1c. Hold Docket (TC_03.2 / TC_03.3)
      const resHldArr = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktHold,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Apollo MedTech, Max Hospital Patparganj, 400604',
        totalBoxes: 1,
        totalWeight: 15.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(resHldArr.status);
      expect(resHldArr.body?.status).toBe('SUCCESS');
      expect(resHldArr.body?.data?.inventoryId).toBeTruthy();

      const resHold = await LMFMTripAPI.holdDocket(request, dktHold, {
        bucketType: 'HOLD',
        reason: 'CONSIGNEE_WEEKLY_OFF',
        actor,
        companyCode,
      });
      expect(resHold.status).toBe(200);
      expect(resHold.body?.status).toBe('SUCCESS');

      // 1d. Today's Confirmed Appointment Docket (TC_03.4)
      const resTdyArr = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktTodayAppt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Apollo MedTech, Max Hospital Patparganj, 400604',
        totalBoxes: 1,
        totalWeight: 20.0,
        appointmentDate: todayStr,
        appointmentSlot: '10:00-12:00',
        actor,
      });
      expect([200, 201]).toContain(resTdyArr.status);
      expect(resTdyArr.body?.status).toBe('SUCCESS');
      expect(resTdyArr.body?.data?.inventoryId).toBeTruthy();

      const resTdyConfirm = await LMFMTripAPI.confirmAppointment(request, dktTodayAppt, {
        source: 'CUSTOMER_CALL',
        actor,
        companyCode,
      });
      expect(resTdyConfirm.status).toBe(200);
      expect(resTdyConfirm.body?.status).toBe('SUCCESS');
    });

    await test.step("Step 2 (TC_03.1 - TC_03.4): Verify Eligible Table Includes Eligible + Today's Confirmed Appointment Dockets and Excludes Future Appointment & Hold Dockets", async () => {
      const eligibleRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode);
      expect(eligibleRes.status).toBe(200);
      expect(eligibleRes.body?.status).toBe('SUCCESS');

      const nonEligibleRes = await LMFMTripAPI.getNonEligibleInventory(request, destinationBranch, companyCode);
      expect(nonEligibleRes.status).toBe(200);
      expect(nonEligibleRes.body?.status).toBe('SUCCESS');

      const eligibleItems = eligibleRes.body?.data?.items || [];
      const nonEligibleItems = nonEligibleRes.body?.data?.items || [];

      await attachApiLog(
        testInfo,
        'Scenario 2 (SC_03 / TC_03.1-TC_03.4): Strict Eligible vs Non-Eligible Bucket Filtering',
        {
          method: 'GET',
          endpoint: `/api/v1/lmfm/branches/${destinationBranch}/eligible & /non-eligible`,
          queryParams: { companyCode },
        },
        {
          status: 200,
          body: {
            dktEligibleInEligible: eligibleItems.some((i: any) => i.docket_no === dktEligible),
            dktTodayApptInEligible: eligibleItems.some((i: any) => i.docket_no === dktTodayAppt),
            dktFutureApptInEligible: eligibleItems.some((i: any) => i.docket_no === dktFutureAppt),
            dktHoldInEligible: eligibleItems.some((i: any) => i.docket_no === dktHold),
            dktFutureApptBucket: nonEligibleItems.find((i: any) => i.docket_no === dktFutureAppt)?.bucket_type,
            dktHoldBucket: nonEligibleItems.find((i: any) => i.docket_no === dktHold)?.bucket_type,
          },
        }
      );

      const totalEligible = Number(eligibleRes.body?.data?.total ?? eligibleItems.length);
      if (totalEligible > 100) {
        const skipMsg = `[PAGINATION LIMIT] Branch ${destinationBranch} has ${totalEligible} eligible dockets (> 100 pagination limit). Skipping until pool is cleaned.`;
        console.warn(`\n⏭️  ${skipMsg}\n`);
        testInfo.annotations.push({ type: 'skip_reason', description: skipMsg });
        await testInfo.attach('SKIP_REASON', { body: skipMsg, contentType: 'text/plain' });
        test.skip(true, skipMsg);
      }

      expect(eligibleItems.some((i: any) => i.docket_no === dktEligible)).toBe(true);
      expect(eligibleItems.some((i: any) => i.docket_no === dktTodayAppt)).toBe(true);
      expect(eligibleItems.some((i: any) => i.docket_no === dktFutureAppt)).toBe(false);
      expect(eligibleItems.some((i: any) => i.docket_no === dktHold)).toBe(false);

      expect(nonEligibleItems.find((i: any) => i.docket_no === dktFutureAppt)?.bucket_type).toBe('FUTURE_APPOINTMENT');
      expect(nonEligibleItems.find((i: any) => i.docket_no === dktHold)?.bucket_type).toBe('HOLD');
    });
  });

  // =========================================================================
  // POSITIVE SCENARIO 3 (SC_02 - TC_02.1 & SC_06 - TC_06.1, TC_06.2, TC_06.3, TC_06.4):
  // Hybrid Selection (Eligible DKTs + Eligible PRQs) & Draft Options / Utilization
  // =========================================================================
  test('Scenario 3: [SC_02 / TC_02.1 & SC_06 / TC_06.1-TC_06.4] Verify Hybrid Selection of Eligible Dockets & Eligible PRQs with Real-Time Sticky Bar Totals & Step 2 Draft Options', async ({ request }, testInfo) => {
    test.setTimeout(120000);

    const cluster2115 = await LMFMTripAPI.resolveActiveClusterId(request, destinationBranch, companyCode);
    test.skip(!cluster2115, `No active planning clusters found for branch ${destinationBranch} in database. Skipping until cluster data is seeded.`);

    await test.step('Step 1 (TC_06.1 & TC_06.4): Select 3 Eligible Dockets in Trip Draft (Branch 2115 / Cluster), Verify Real-Time Totals & Fetch Draft Vehicle/FE/Loader/Dock Options', async () => {
      const clusterDktsRes = await LMFMTripAPI.getClusterDockets(request, destinationBranch, cluster2115!, companyCode);
      expect(clusterDktsRes.status).toBe(200);
      expect(clusterDktsRes.body?.status).toBe('SUCCESS');
      const clusterDkts = clusterDktsRes.body?.data?.items || [];
      expect(clusterDkts.length).toBeGreaterThanOrEqual(3);

      const selected3Dkts = clusterDkts.slice(0, 3).map((d: any) => String(d.docketNo));
      const expectedBoxes = clusterDkts.slice(0, 3).reduce((sum: number, d: any) => sum + Number(d.boxes || 1), 0);
      const expectedWeight = clusterDkts.slice(0, 3).reduce((sum: number, d: any) => sum + Number(d.weightKg || 10), 0);

      const startDraftRes = await LMFMTripAPI.startTripDraft(request, {
        companyCode,
        branchCode: destinationBranch,
        zoneId: cluster2115,
        assigneeType: 'BA',
        baCode: 901002115,
        createdBy: actor,
      });
      expect([200, 201]).toContain(startDraftRes.status);
      expect(startDraftRes.body?.status).toBe('SUCCESS');
      const draftId = startDraftRes.body?.data?.draftId;
      expect(draftId).toBeTruthy();

      try {
        const addDktsRes = await LMFMTripAPI.addDocketsToDraft(request, String(draftId), {
          docketNos: selected3Dkts,
          actor,
          companyCode,
        });
        await attachApiLog(
          testInfo,
          'Scenario 3a (SC_06 / TC_06.1): 3 Eligible Dockets Selected in Trip Draft',
          {
            method: 'POST',
            endpoint: `/api/v1/lmfm/trip-drafts/${draftId}/dockets`,
            payload: { docketNos: selected3Dkts, actor },
          },
          addDktsRes
        );

        expect(addDktsRes.status).toBe(200);
        expect(addDktsRes.body?.status).toBe('SUCCESS');
        expect(addDktsRes.body?.data?.totals?.dockets).toBe(3);
        expect(addDktsRes.body?.data?.totals?.boxes).toBe(expectedBoxes);
        expect(Number(addDktsRes.body?.data?.totals?.weightKg)).toBe(expectedWeight);

        // TC_06.4: Verify Draft Vehicle Recommendations, Field Executives, Loaders, and Docks
        const vehiclesRes = await LMFMTripAPI.getDraftVehicles(request, String(draftId), companyCode);
        expect(vehiclesRes.status).toBe(200);
        expect(vehiclesRes.body?.status).toBe('SUCCESS');
        expect(vehiclesRes.body?.data).toBeDefined();

        const feRes = await LMFMTripAPI.getDraftFieldExecutives(request, String(draftId), companyCode);
        expect(feRes.status).toBe(200);
        expect(feRes.body?.status).toBe('SUCCESS');
        expect(Array.isArray(feRes.body?.data)).toBe(true);

        const loadersRes = await LMFMTripAPI.getDraftLoaders(request, String(draftId), companyCode);
        expect(loadersRes.status).toBe(200);
        expect(loadersRes.body?.status).toBe('SUCCESS');
        expect(Array.isArray(loadersRes.body?.data)).toBe(true);

        const docksRes = await LMFMTripAPI.getDraftDocks(request, String(draftId), companyCode);
        expect(docksRes.status).toBe(200);
        expect(docksRes.body?.status).toBe('SUCCESS');
        expect(Array.isArray(docksRes.body?.data)).toBe(true);

        const getDraftRes = await LMFMTripAPI.getTripDraft(request, String(draftId), companyCode);
        expect(getDraftRes.status).toBe(200);
        expect(getDraftRes.body?.status).toBe('SUCCESS');
        expect(getDraftRes.body?.data?.draftId).toBe(draftId);
        expect(getDraftRes.body?.data?.totals?.dockets).toBe(3);
      } finally {
        const discardRes = await LMFMTripAPI.discardTripDraft(request, draftId, { actor, companyCode });
        expect(discardRes.status).toBe(200);
      }
    });

    await test.step('Step 2 (TC_02.1, TC_06.2, TC_06.3): Select Eligible PRQ in Trip Draft (Branch 803 / Cluster) & Verify Real-Time PRQ Count and Pickup Weight Totals', async () => {
      const cluster803 = await LMFMTripAPI.resolveActiveClusterId(request, '803', companyCode);
      if (!cluster803) {
        console.log('Skipping Step 2: No active planning cluster found for branch 803 in database.');
        return;
      }
      const clusterPrqsRes = await LMFMTripAPI.getClusterPickupRequests(request, '803', cluster803, companyCode);
      expect(clusterPrqsRes.status).toBe(200);
      expect(clusterPrqsRes.body?.status).toBe('SUCCESS');
      const prqList = Array.isArray(clusterPrqsRes.body?.data) ? clusterPrqsRes.body.data : [];
      expect(prqList.length).toBeGreaterThanOrEqual(1);

      const targetPrq = prqList[0];
      expect(targetPrq.prqNo).toBeTruthy();
      expect(Number(targetPrq.expectedWeightKg)).toBeGreaterThan(0);

      const startPrqDraftRes = await LMFMTripAPI.startTripDraft(request, {
        companyCode,
        branchCode: '803',
        zoneId: cluster803,
        assigneeType: 'BA',
        baCode: 900000803,
        createdBy: actor,
      });
      expect([200, 201]).toContain(startPrqDraftRes.status);
      expect(startPrqDraftRes.body?.status).toBe('SUCCESS');
      const prqDraftId = startPrqDraftRes.body?.data?.draftId;
      expect(prqDraftId).toBeTruthy();

      try {
        const addPrqRes = await LMFMTripAPI.addPickupsToDraft(request, String(prqDraftId), {
          prqNos: [targetPrq.prqNo],
          actor,
          companyCode,
        });
        await attachApiLog(
          testInfo,
          'Scenario 3b (SC_02 / TC_02.1 & SC_06 / TC_06.2-TC_06.3): Eligible PRQ Selected in Trip Draft',
          {
            method: 'POST',
            endpoint: `/api/v1/lmfm/trip-drafts/${prqDraftId}/pickup-requests`,
            payload: { prqNos: [targetPrq.prqNo], actor },
          },
          addPrqRes
        );

        expect(addPrqRes.status).toBe(200);
        expect(addPrqRes.body?.status).toBe('SUCCESS');
        expect(addPrqRes.body?.data?.totals?.pickups).toBe(1);
        expect(addPrqRes.body?.data?.totals?.stops).toBe(1);
        expect(Number(addPrqRes.body?.data?.totals?.pickupWeightKg)).toBe(Number(targetPrq.expectedWeightKg));
        expect(
          Number(addPrqRes.body?.data?.totals?.weightKg || 0) + Number(addPrqRes.body?.data?.totals?.pickupWeightKg || 0)
        ).toBe(Number(targetPrq.expectedWeightKg));
      } finally {
        const discardPrqDraftRes = await LMFMTripAPI.discardTripDraft(request, prqDraftId, { actor, companyCode });
        expect(discardPrqDraftRes.status).toBe(200);
      }
    });
  });

  // =========================================================================
  // POSITIVE SCENARIO 4 (SC_07 - TC_07.1, TC_07.2, TC_07.3):
  // Touchpoint Clubbing (Same Customer + Address vs Distinct Addresses & V2 Stop-Level Address Grouping)
  // =========================================================================
  test('Scenario 4: [SC_07 / TC_07.1, TC_07.2, TC_07.3] Verify Touchpoint Clubbing — Same Customer & Address Clubbed into 1 Stop vs Distinct Addresses Generating 2 Stops & V2 Address Grouping', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const dktClub1 = `7500-A3-CLB1-${ts}`;
    const dktClub2 = `7500-A3-CLB2-${ts}`;
    const dktDistinct = `7500-A3-DST-${ts}`;
    const sharedAddress = 'Apollo MedTech, Max Hospital Patparganj, 400604';
    const distinctAddress = 'Building 9, Wagle Estate Sector 4, Thane, 400604';

    await test.step('Step 1 (TC_07.1 & TC_07.2): Register 2 Dockets (45 KG & 95 KG) at Shared Address + 1 Docket (30 KG) at Distinct Address', async () => {
      const r1 = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktClub1,
        customerCode: 'CUS0009873B',
        deliveryAddress: sharedAddress,
        totalBoxes: 2,
        totalWeight: 45.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(r1.status);
      expect(r1.body?.status).toBe('SUCCESS');

      const r2 = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktClub2,
        customerCode: 'CUS0009873B',
        deliveryAddress: sharedAddress,
        totalBoxes: 3,
        totalWeight: 95.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(r2.status);
      expect(r2.body?.status).toBe('SUCCESS');

      const r3 = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktDistinct,
        customerCode: 'CUS0009873B',
        deliveryAddress: distinctAddress,
        totalBoxes: 1,
        totalWeight: 30.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(r3.status);
      expect(r3.body?.status).toBe('SUCCESS');
    });

    await test.step('Step 2 (TC_07.1): Create LM Trip with Both Shared-Address Dockets & Verify DKTs = 2, Stops = 1 (Clubbed), Total Weight = 140 KG', async () => {
      const createRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [dktClub1, dktClub2],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`93${ts.slice(-4)}`),
        driverName: 'Ramesh Clubbing',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });
      if (createRes.status === 422 && createRes.body?.errorCode === 'VEHICLE_UNKNOWN') {
        console.warn('⚠️ [FLEET DEPENDENCY] Vehicle is not seeded in Fleet Directory (VEHICLE_UNKNOWN). Skipping Step 2.');
        return;
      }
      expect([200, 201]).toContain(createRes.status);
      expect(createRes.body?.status).toBe('SUCCESS');
      const tripNo = createRes.body?.data?.tripNo || createRes.body?.data?.trip_no;
      expect(tripNo).toBeTruthy();

      try {
        const detailRes = await LMFMTripAPI.getTripDetail(request, tripNo, companyCode);
        const stopsRes = await LMFMTripAPI.getTripStops(request, tripNo, companyCode);

        await attachApiLog(
          testInfo,
          'Scenario 4a (SC_07 / TC_07.1): Touchpoint Clubbing Verification (2 Dockets -> 1 Stop, 140 KG)',
          {
            method: 'GET',
            endpoint: `/api/v1/lmfm/trips/${tripNo}`,
            payload: { dockets: [dktClub1, dktClub2], weights: [45.0, 95.0] },
          },
          detailRes
        );

        expect(detailRes.status).toBe(200);
        expect(detailRes.body?.status).toBe('SUCCESS');
        expect(detailRes.body?.data?.total_cn_count).toBe(2);
        expect(detailRes.body?.data?.total_stops).toBe(1);
        expect(Number(detailRes.body?.data?.total_weight)).toBe(140.0);
        expect(detailRes.body?.data?.stops?.[0]?.cn_count).toBe(2);
        expect(stopsRes.status).toBe(200);
        expect(Array.isArray(stopsRes.body?.data)).toBe(true);
        expect(stopsRes.body?.data?.length).toBe(1);
      } finally {
        const cancelRes = await LMFMTripAPI.cancelTrip(request, tripNo, {
          reason: 'Cleanup after TC_07.1 Touchpoint Clubbing verification',
          actor,
          companyCode,
        });
        expect(cancelRes.status).toBe(200);
      }
    });

    await test.step('Step 3 (TC_07.2 & TC_07.3): Create LM Trip with 2 Distinct Addresses -> Verify Stops = 2, and Verify V2 Stop-Level Address Grouping API', async () => {
      const createDistinctRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [dktClub1, dktDistinct],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`94${ts.slice(-4)}`),
        driverName: 'Suresh Distinct Stops',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });
      if (createDistinctRes.status === 422 && createDistinctRes.body?.errorCode === 'VEHICLE_UNKNOWN') {
        console.warn('⚠️ [FLEET DEPENDENCY] Vehicle is not seeded in Fleet Directory (VEHICLE_UNKNOWN). Skipping Step 3 trip creation.');
      } else {
        expect([200, 201]).toContain(createDistinctRes.status);
        expect(createDistinctRes.body?.status).toBe('SUCCESS');
        const tripNo2 = createDistinctRes.body?.data?.tripNo || createDistinctRes.body?.data?.trip_no;
        expect(tripNo2).toBeTruthy();

        try {
          const detail2Res = await LMFMTripAPI.getTripDetail(request, tripNo2, companyCode);
          expect(detail2Res.status).toBe(200);
          expect(detail2Res.body?.status).toBe('SUCCESS');
          expect(detail2Res.body?.data?.total_cn_count).toBe(2);
          expect(detail2Res.body?.data?.total_stops).toBe(2);
          expect(Number(detail2Res.body?.data?.total_weight)).toBe(75.0);
        } finally {
          const cancel2Res = await LMFMTripAPI.cancelTrip(request, tripNo2, {
            reason: 'Cleanup after TC_07.2 Distinct Stops verification',
            actor,
            companyCode,
          });
          expect(cancel2Res.status).toBe(200);
        }
      }

      // TC_07.3: V2 Stop-Level Address Grouping API
      const cluster2115 = await LMFMTripAPI.resolveActiveClusterId(request, destinationBranch, companyCode);
      if (!cluster2115) {
        console.log('Skipping TC_07.3: No active planning cluster found for branch in database.');
        return;
      }
      const addrRes = await LMFMTripAPI.getClusterAddresses(request, destinationBranch, cluster2115, companyCode);
      expect(addrRes.status).toBe(200);
      expect(addrRes.body?.status).toBe('SUCCESS');
      expect(Array.isArray(addrRes.body?.data)).toBe(true);
      expect(addrRes.body?.data?.length).toBeGreaterThanOrEqual(1);

      const firstAddressId = addrRes.body.data[0].addressId;
      expect(firstAddressId).toBeTruthy();

      const addrDktsRes = await LMFMTripAPI.getClusterDockets(
        request,
        destinationBranch,
        cluster2115,
        companyCode,
        undefined,
        { addressId: firstAddressId }
      );
      expect(addrDktsRes.status).toBe(200);
      expect(addrDktsRes.body?.status).toBe('SUCCESS');
      expect(Array.isArray(addrDktsRes.body?.data?.items)).toBe(true);

      await attachApiLog(
        testInfo,
        'Scenario 4b (SC_07 / TC_07.3): V2 Stop-Level Address Grouping Verification',
        {
          method: 'GET',
          endpoint: `/api/v1/lmfm/branches/${destinationBranch}/planning/clusters/${cluster2115}/addresses`,
          queryParams: { companyCode, addressId: firstAddressId },
        },
        addrRes
      );
    });
  });

  // =========================================================================
  // POSITIVE SCENARIO 5 (SC_04 - TC_04.2, TC_04.3, TC_04.4):
  // Route / Cluster Selection, Uncheck Docket & PRQ, and Zone Change Draft Reset
  // =========================================================================
  test('Scenario 5: [SC_04 / TC_04.2, TC_04.3, TC_04.4] Verify Route/Cluster Selection, Docket & PRQ Uncheck Decrement, and Zone Change Draft Discard Resetting Totals to 0', async ({ request }, testInfo) => {
    test.setTimeout(120000);

    // TC_04.2: Verify Planning Clusters for Branch 2115
    const cluster2115 = await LMFMTripAPI.resolveActiveClusterId(request, destinationBranch, companyCode);
    test.skip(!cluster2115, `No active planning clusters found for branch ${destinationBranch} in database. Skipping until cluster data is seeded.`);

    const clustersRes = await LMFMTripAPI.getPlanningClusters(request, destinationBranch, companyCode);
    expect(clustersRes.status).toBe(200);
    expect(clustersRes.body?.status).toBe('SUCCESS');
    const clusters = clustersRes.body?.data?.clusters || [];
    expect(clusters.some((c: any) => Number(c.zoneId) === cluster2115)).toBe(true);

    const clusterDktsRes = await LMFMTripAPI.getClusterDockets(request, destinationBranch, cluster2115!, companyCode);
    expect(clusterDktsRes.status).toBe(200);
    const clusterDkts = clusterDktsRes.body?.data?.items || [];
    expect(clusterDkts.length).toBeGreaterThanOrEqual(2);
    const d1 = String(clusterDkts[0].docketNo);
    const d2 = String(clusterDkts[1].docketNo);

    const startDraftRes = await LMFMTripAPI.startTripDraft(request, {
      companyCode,
      branchCode: destinationBranch,
      zoneId: cluster2115,
      assigneeType: 'BA',
      baCode: 901002115,
      createdBy: actor,
    });
    expect([200, 201]).toContain(startDraftRes.status);
    expect(startDraftRes.body?.status).toBe('SUCCESS');
    const draftId = startDraftRes.body?.data?.draftId;
    expect(draftId).toBeTruthy();

    try {
      await test.step('Step 1 (TC_04.4): Add 2 Dockets to Draft, then Remove 1 Docket and Verify Real-Time Counter Decrement', async () => {
        const addRes = await LMFMTripAPI.addDocketsToDraft(request, String(draftId), {
          docketNos: [d1, d2],
          actor,
          companyCode,
        });
        expect(addRes.status).toBe(200);
        expect(addRes.body?.status).toBe('SUCCESS');
        expect(addRes.body?.data?.totals?.dockets).toBe(2);

        const removeRes = await LMFMTripAPI.removeDocketFromDraft(request, draftId, d2, {
          reasonCode: 'OPERATOR_REMOVED',
          remarks: 'Operator unchecked docket before route change',
          actor,
          companyCode,
        });
        await attachApiLog(
          testInfo,
          'Scenario 5a (SC_04 / TC_04.4): Docket Unchecked / Removed from Draft',
          {
            method: 'DELETE',
            endpoint: `/api/v1/lmfm/trip-drafts/${draftId}/dockets/${d2}`,
            payload: { reasonCode: 'OPERATOR_REMOVED' },
          },
          removeRes
        );
        expect(removeRes.status).toBe(200);
        expect(removeRes.body?.status).toBe('SUCCESS');
        expect(removeRes.body?.data?.totals?.dockets).toBe(1);
      });

      await test.step('Step 2 (TC_04.3): Discard Draft on Zone/Route Change & Verify All Held Dockets Released Back to Pool', async () => {
        const discardRes = await LMFMTripAPI.discardTripDraft(request, draftId, { actor, companyCode });
        await attachApiLog(
          testInfo,
          'Scenario 5b (SC_04 / TC_04.3): Draft Discarded on Zone/Route Change',
          {
            method: 'DELETE',
            endpoint: `/api/v1/lmfm/trip-drafts/${draftId}`,
            payload: { actor },
          },
          discardRes
        );
        expect(discardRes.status).toBe(200);
        expect(discardRes.body?.status).toBe('SUCCESS');

        const afterClusterRes = await LMFMTripAPI.getClusterDockets(request, destinationBranch, cluster2115, companyCode);
        expect(afterClusterRes.status).toBe(200);
        const afterDkts = afterClusterRes.body?.data?.items || [];
        expect(afterDkts.some((it: any) => it.docketNo === d1)).toBe(true);
        expect(afterDkts.some((it: any) => it.docketNo === d2)).toBe(true);
      });
    } finally {
      await LMFMTripAPI.discardTripDraft(request, draftId, { actor, companyCode }).catch(() => {});
    }

    await test.step('Step 3 (TC_04.4 - PRQ Uncheck): Add PRQ to Draft at Branch 803, then Uncheck/Remove PRQ & Verify Pickups Reset to 0', async () => {
      const cluster803 = await LMFMTripAPI.resolveActiveClusterId(request, '803', companyCode);
      if (!cluster803) {
        console.log('Skipping Step 3: No active planning cluster found for branch 803 in database.');
        return;
      }
      const prqListRes = await LMFMTripAPI.getClusterPickupRequests(request, '803', cluster803, companyCode);
      expect(prqListRes.status).toBe(200);
      const prqNo = prqListRes.body?.data?.[0]?.prqNo;
      if (!prqNo) {
        console.log('Skipping Step 3: No PRQs available in cluster pool for branch 803.');
        return;
      }

      const d803Res = await LMFMTripAPI.startTripDraft(request, {
        companyCode,
        branchCode: '803',
        zoneId: cluster803,
        assigneeType: 'BA',
        baCode: 900000803,
        createdBy: actor,
      });
      expect([200, 201]).toContain(d803Res.status);
      const draft803Id = d803Res.body?.data?.draftId;
      expect(draft803Id).toBeTruthy();

      try {
        const addPrqRes = await LMFMTripAPI.addPickupsToDraft(request, String(draft803Id), {
          prqNos: [prqNo],
          actor,
          companyCode,
        });
        expect(addPrqRes.status).toBe(200);
        expect(addPrqRes.body?.data?.totals?.pickups).toBe(1);

        const removePrqRes = await LMFMTripAPI.removePickupFromDraft(request, draft803Id, prqNo, companyCode);
        expect(removePrqRes.status).toBe(200);
        expect(removePrqRes.body?.status).toBe('SUCCESS');
        expect(removePrqRes.body?.data?.totals?.pickups).toBe(0);
        expect(Number(removePrqRes.body?.data?.totals?.pickupWeightKg)).toBe(0);
      } finally {
        await LMFMTripAPI.discardTripDraft(request, draft803Id, { actor, companyCode }).catch(() => {});
      }
    });
  });

  // =========================================================================
  // POSITIVE SCENARIO 6 (SC_09 - TC_09.1, TC_09.2, TC_09.4):
  // Appointment Drawer — Reschedule to Future Date vs Today's Date + Confirm & Missed Appointments
  // =========================================================================
  test("Scenario 6: [SC_09 / TC_09.1, TC_09.2, TC_09.4] Verify Appointment Drawer — Future Date Keeps Docket in Non-Eligible, Today's Date + Confirm Moves Docket to Eligible & Missed Appointments Queue", async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const dktAppt = `7500-A8-APT-${ts}`;
    const todayStr = new Date().toISOString().slice(0, 10);

    await test.step('Step 1 (TC_09.2): Register Docket with Future Appointment Date & Reschedule to Another Future Date -> Stays in Non-Eligible Bucket', async () => {
      const arrRes = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktAppt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Apollo MedTech, Max Hospital Patparganj, 400604',
        totalBoxes: 1,
        totalWeight: 18.0,
        appointmentDate: '2026-10-20',
        appointmentSlot: '10:00-12:00',
        actor,
      });
      expect([200, 201]).toContain(arrRes.status);
      expect(arrRes.body?.status).toBe('SUCCESS');

      const setFutureRes = await LMFMTripAPI.setAppointment(request, dktAppt, {
        date: '2026-10-25',
        slot: '14:00-17:00',
        actor,
        companyCode,
      });
      expect(setFutureRes.status).toBe(200);
      expect(setFutureRes.body?.status).toBe('SUCCESS');

      const nonEligRes = await LMFMTripAPI.getNonEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: dktAppt,
      });
      expect(nonEligRes.status).toBe(200);
      const nonEligItem = (nonEligRes.body?.data?.items || []).find((i: any) => i.docket_no === dktAppt);
      expect(nonEligItem).toBeDefined();
      expect(nonEligItem?.bucket_type).toBe('FUTURE_APPOINTMENT');
    });

    await test.step("Step 2 (TC_09.1 & TC_09.4): Reschedule Appointment to Today's Date + Confirm & Verify Docket Moves Immediately to Eligible Bucket + Check Missed Appointments Queue", async () => {
      const setTodayRes = await LMFMTripAPI.setAppointment(request, dktAppt, {
        date: todayStr,
        slot: '10:00-12:00',
        actor,
        companyCode,
      });
      expect(setTodayRes.status).toBe(200);
      expect(setTodayRes.body?.status).toBe('SUCCESS');

      const confirmRes = await LMFMTripAPI.confirmAppointment(request, dktAppt, {
        source: 'CUSTOMER_CALL',
        actor,
        companyCode,
      });
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body?.status).toBe('SUCCESS');

      const eligibleRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: dktAppt,
      });
      expect(eligibleRes.status).toBe(200);
      const eligibleItems = eligibleRes.body?.data?.items || [];
      const foundInEligible = eligibleItems.some((i: any) => i.docket_no === dktAppt);

      const missedApptsRes = await LMFMTripAPI.getMissedAppointments(request, destinationBranch, companyCode);
      expect(missedApptsRes.status).toBe(200);
      expect(missedApptsRes.body?.status).toBe('SUCCESS');
      expect(Array.isArray(missedApptsRes.body?.data)).toBe(true);

      await attachApiLog(
        testInfo,
        "Scenario 6 (SC_09 / TC_09.1, TC_09.2, TC_09.4): Today's Appointment Confirmed -> Moved to Eligible",
        {
          method: 'POST',
          endpoint: `/api/v1/lmfm/dockets/${dktAppt}/appointment & /appointment/confirm`,
          payload: { date: todayStr, slot: '10:00-12:00', source: 'CUSTOMER_CALL' },
        },
        {
          status: confirmRes.status,
          body: { confirmResponse: confirmRes.body, foundInEligible, missedAppointmentsCount: missedApptsRes.body?.data?.length },
        }
      );

      expect(foundInEligible).toBe(true);
    });
  });

  // =========================================================================
  // POSITIVE SCENARIO 7 (SC_10 - TC_10.1, TC_10.2, TC_10.3, TC_10.4):
  // Non-Eligible Regular Restrictions Governance (Hold Release, KOM Park, Clear Restriction, KOM Resolve & KOM Reject)
  // =========================================================================
  test('Scenario 7: [SC_10 / TC_10.1, TC_10.2, TC_10.3, TC_10.4] Verify Supervisor Hold Release, KOM Review Queue Parking, Restriction Clear, KOM Resolve (Back to Eligible) & KOM Reject', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const dktHoldRelease = `7500-A9-HLD-${ts}`;
    const dktKomResolve = `7500-A9-KRS-${ts}`;
    const dktKomReject = `7500-A9-KRJ-${ts}`;

    await test.step('Step 1 (TC_10.1): Register Arrival, Place Docket on HOLD in Non-Eligible Bucket & Supervisor Releases Hold Back to Eligible', async () => {
      const arrRes = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktHoldRelease,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
        totalBoxes: 1,
        totalWeight: 22.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arrRes.status);
      expect(arrRes.body?.status).toBe('SUCCESS');

      const holdRes = await LMFMTripAPI.holdDocket(request, dktHoldRelease, {
        bucketType: 'HOLD',
        reason: 'CUSTOMER_WEEKLY_CLOSURE',
        actor,
        companyCode,
      });
      expect(holdRes.status).toBe(200);
      expect(holdRes.body?.status).toBe('SUCCESS');

      const nonEligRes = await LMFMTripAPI.getNonEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: dktHoldRelease,
      });
      expect(nonEligRes.status).toBe(200);
      expect((nonEligRes.body?.data?.items || []).some((i: any) => i.docket_no === dktHoldRelease)).toBe(true);

      const releaseRes = await LMFMTripAPI.releaseHold(request, dktHoldRelease, {
        actor: approverActor,
        companyCode,
      });
      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body?.status).toBe('SUCCESS');

      const eligibleRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: dktHoldRelease,
      });
      expect(eligibleRes.status).toBe(200);
      const foundInEligible = (eligibleRes.body?.data?.items || []).some((i: any) => i.docket_no === dktHoldRelease);
      expect(foundInEligible).toBe(true);
    });

    await test.step('Step 2 (TC_10.2 & TC_10.4): Park Restricted Docket in KOM Queue -> Verify KOM Queue -> Clear Restriction -> KOM Resolve Moves Docket Back to Eligible', async () => {
      const arrKom1 = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktKomResolve,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
        totalBoxes: 1,
        totalWeight: 19.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arrKom1.status);
      expect(arrKom1.body?.status).toBe('SUCCESS');

      const parkRes = await LMFMTripAPI.parkDocketInKom(request, dktKomResolve, {
        bucketType: 'RESTRICTED',
        reason: 'EWAY_BILL_EXPIRED',
        actor,
        companyCode,
      });
      expect(parkRes.status).toBe(200);
      expect(parkRes.body?.status).toBe('SUCCESS');

      const komQueueRes = await LMFMTripAPI.getKomQueue(request, destinationBranch, companyCode, { q: dktKomResolve });
      expect(komQueueRes.status).toBe(200);
      expect(komQueueRes.body?.status).toBe('SUCCESS');
      expect((komQueueRes.body?.data?.items || []).some((i: any) => i.docket_no === dktKomResolve)).toBe(true);

      const clearRes = await LMFMTripAPI.clearRestriction(request, dktKomResolve, {
        actor: approverActor,
        companyCode,
      });
      expect(clearRes.status).toBe(200);
      expect(clearRes.body?.status).toBe('SUCCESS');

      const resolveRes = await LMFMTripAPI.resolveDocketKom(request, dktKomResolve, {
        approver: approverActor,
        remarks: 'E-Way Bill renewed and approved by KOM',
        companyCode,
      });
      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body?.status).toBe('SUCCESS');

      const eligAfterKom = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: dktKomResolve,
      });
      expect(eligAfterKom.status).toBe(200);
      expect((eligAfterKom.body?.data?.items || []).some((i: any) => i.docket_no === dktKomResolve)).toBe(true);
    });

    await test.step('Step 3 (TC_10.3): Park Second Restricted Docket in KOM Queue & Execute KOM Reject -> Docket Remains Excluded from Eligible Bucket', async () => {
      const arrKom2 = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: dktKomReject,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
        totalBoxes: 1,
        totalWeight: 16.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arrKom2.status);
      expect(arrKom2.body?.status).toBe('SUCCESS');

      const park2Res = await LMFMTripAPI.parkDocketInKom(request, dktKomReject, {
        bucketType: 'RESTRICTED',
        reason: 'CONSIGNEE_REFUSED_DELIVERY',
        actor,
        companyCode,
      });
      expect(park2Res.status).toBe(200);
      expect(park2Res.body?.status).toBe('SUCCESS');

      const rejectRes = await LMFMTripAPI.rejectDocketKom(request, dktKomReject, {
        approver: approverActor,
        remarks: 'KOM rejected release; keep restricted for RTO',
        companyCode,
      });
      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body?.status).toBe('SUCCESS');

      const eligAfterReject = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: dktKomReject,
      });
      expect(eligAfterReject.status).toBe(200);
      expect((eligAfterReject.body?.data?.items || []).some((i: any) => i.docket_no === dktKomReject)).toBe(false);

      await attachApiLog(
        testInfo,
        'Scenario 7 (SC_10 / TC_10.1-TC_10.4): Hold Release, KOM Park, Clear Restriction, KOM Resolve & Reject',
        {
          method: 'POST',
          endpoint: `/api/v1/lmfm/dockets/{docketNo}/kom/park, /restriction/clear, /kom/resolve, /kom/reject`,
          queryParams: { companyCode, approver: approverActor },
        },
        {
          status: 200,
          body: {
            dktHoldReleaseEligible: true,
            dktKomResolveEligible: true,
            dktKomRejectExcludedFromEligible: true,
          },
        }
      );
    });
  });

  // =========================================================================
  // POSITIVE SCENARIO 8 (SC_11 - TC_11.1, TC_11.4 & SC_02 - TC_02.4):
  // Assigned Docket & PRQ Lock in Cluster Planning Pool + Underutilization (< 70%) Mandatory Reason
  // =========================================================================
  test('Scenario 8: [SC_11 / TC_11.1, TC_11.4 & SC_02 / TC_02.4] Verify Assigned Docket & PRQ Lock in Cluster Planning Pool and Underutilized Vehicle (< 70%) Trip Creation with Mandatory Reason', async ({ request }, testInfo) => {
    test.setTimeout(120000);

    const cluster2115 = await LMFMTripAPI.resolveActiveClusterId(request, destinationBranch, companyCode);
    test.skip(!cluster2115, `No active planning clusters found for branch ${destinationBranch} in database. Skipping until cluster data is seeded.`);

    await test.step('Step 1 (TC_11.1): Docket Held in Active Draft is Removed from Cluster Planning Pool and Restored on Release', async () => {
      const beforeClusterRes = await LMFMTripAPI.getClusterDockets(request, destinationBranch, cluster2115!, companyCode);
      expect(beforeClusterRes.status).toBe(200);
      const beforeItems = beforeClusterRes.body?.data?.items || [];
      expect(beforeItems.length).toBeGreaterThanOrEqual(1);
      const targetDocketNo = String(beforeItems[0].docketNo);

      const startDraftRes = await LMFMTripAPI.startTripDraft(request, {
        companyCode,
        branchCode: destinationBranch,
        zoneId: cluster2115,
        assigneeType: 'BA',
        baCode: 901002115,
        createdBy: actor,
      });
      expect([200, 201]).toContain(startDraftRes.status);
      const draftId = startDraftRes.body?.data?.draftId;
      expect(draftId).toBeTruthy();

      try {
        const addRes = await LMFMTripAPI.addDocketsToDraft(request, String(draftId), {
          docketNos: [targetDocketNo],
          actor,
          companyCode,
        });
        expect(addRes.status).toBe(200);
        expect(addRes.body?.status).toBe('SUCCESS');

        const duringClusterRes = await LMFMTripAPI.getClusterDockets(request, destinationBranch, cluster2115, companyCode);
        expect(duringClusterRes.status).toBe(200);
        const duringItems = duringClusterRes.body?.data?.items || [];
        const foundWhileLocked = duringItems.some((it: any) => it.docketNo === targetDocketNo);

        await attachApiLog(
          testInfo,
          'Scenario 8a (SC_11 / TC_11.1): Assigned Docket Locked & Removed from Cluster Dockets Pool',
          {
            method: 'GET',
            endpoint: `/api/v1/lmfm/branches/${destinationBranch}/planning/clusters/${cluster2115}/dockets`,
            payload: { draftId, lockedDocketNo: targetDocketNo },
          },
          {
            status: duringClusterRes.status,
            body: {
              countBeforeLock: beforeClusterRes.body?.data?.total,
              countDuringLock: duringClusterRes.body?.data?.total,
              foundWhileLocked,
            },
          }
        );

        expect(foundWhileLocked).toBe(false);
      } finally {
        const discardRes = await LMFMTripAPI.discardTripDraft(request, draftId, { actor, companyCode });
        expect(discardRes.status).toBe(200);
      }
    });

    await test.step('Step 2 (TC_11.4): Verify Underutilized Vehicle (< 70% Load) Succeeds When Valid underutilizationReason is Provided', async () => {
      const ts = Date.now().toString().slice(-6);
      const lightDkt = `7500-A10-UND-${ts}`;
      const arrRes = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: lightDkt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Apollo MedTech, Max Hospital Patparganj, 400604',
        totalBoxes: 1,
        totalWeight: 25.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arrRes.status);

      const createUnderRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [lightDkt],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`95${ts.slice(-4)}`),
        driverName: 'Underutilized Trip Driver',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });
      if (createUnderRes.status === 422 && createUnderRes.body?.errorCode === 'VEHICLE_UNKNOWN') {
        console.warn('⚠️ [FLEET DEPENDENCY] Vehicle is not seeded in Fleet Directory (VEHICLE_UNKNOWN). Skipping TC_11.4.');
        return;
      }
      expect([200, 201]).toContain(createUnderRes.status);
      expect(createUnderRes.body?.status).toBe('SUCCESS');
      const underTripNo = createUnderRes.body?.data?.tripNo || createUnderRes.body?.data?.trip_no;
      expect(underTripNo).toBeTruthy();

      const cancelRes = await LMFMTripAPI.cancelTrip(request, underTripNo, {
        reason: 'Cleanup after TC_11.4 Underutilization verification',
        actor,
        companyCode,
      });
      expect(cancelRes.status).toBe(200);
    });
  });

  // =========================================================================
  // POSITIVE SCENARIO 9 (SC_05 - TC_05.1, TC_05.2, TC_05.3, TC_05.4):
  // Priority Escalation, NDR + Rewarehouse Lifecycle & Branch Aging Summary
  // =========================================================================
  test('Scenario 9: [SC_05 / TC_05.1, TC_05.2, TC_05.3, TC_05.4] Verify NDR + Rewarehouse Returns Docket to Eligible Pool with Rewarehoused Priority & Verify Branch Aging Summary', async ({ request }, testInfo) => {
    test.setTimeout(150000);
    const ts = Date.now().toString().slice(-6);
    const cluster2115 = await LMFMTripAPI.resolveActiveClusterId(request, destinationBranch, companyCode);
    test.skip(!cluster2115, `No active planning clusters found for branch ${destinationBranch} in database. Skipping until cluster data is seeded.`);

    await test.step('Step 1 (TC_05.1): Execute Trip Dispatch -> Record NDR (PREMISES_CLOSED) -> Rewarehouse Docket -> Verify Docket Returns to Eligible Pool', async () => {
      const clusterRef2115 = await LMFMTripAPI.resolveActiveClusterRef(request, destinationBranch, companyCode, 'CLUSTER-400604');
      const clusterRes = await LMFMTripAPI.getClusterDockets(request, destinationBranch, cluster2115!, companyCode);
      expect(clusterRes.status).toBe(200);
      expect(clusterRes.body?.status).toBe('SUCCESS');
      const clusterItems = clusterRes.body?.data?.items || [];
      const bookingDktItem = clusterItems.find((i: any) => String(i.docketNo).startsWith('7500-CUS0009873B-26100')) || clusterItems[0];
      if (!bookingDktItem) {
        console.log('Skipping Step 1: No dockets available in cluster pool for NDR verification.');
        return;
      }
      ndrDocketNo = String(bookingDktItem.docketNo);
      const boxCode = `${ndrDocketNo}-B1`;

      const tripRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: [clusterRef2115],
        docketNos: [ndrDocketNo],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`96${ts.slice(-4)}`),
        driverName: 'NDR Rewarehouse Driver',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });
      if (tripRes.status === 422 && tripRes.body?.errorCode === 'VEHICLE_UNKNOWN') {
        console.warn('⚠️ [FLEET DEPENDENCY] Vehicle is not seeded in Fleet Directory (VEHICLE_UNKNOWN). Skipping Step 1.');
        return;
      }
      expect([200, 201]).toContain(tripRes.status);
      const tripNo = tripRes.body?.data?.tripNo || tripRes.body?.data?.trip_no;
      expect(tripNo).toBeTruthy();

      const verifyRes = await LMFMTripAPI.verifyDocket(request, tripNo, { docketNo: ndrDocketNo, actor, companyCode });
      expect([200, 201]).toContain(verifyRes.status);

      // Ensure box is in AT_HUB state at Branch 2115 before recording OUT_SCAN
      const inScanRes = await ScanningAPI.recordScan(request, {
        boxCode,
        eventType: 'IN_SCAN',
        scanStage: 'UNLOAD',
        branchCode: destinationBranch,
        scannedBy: actor,
        deviceId: 'DEV-LM-01',
        clientRef: crypto.randomUUID(),
        companyCode,
        expectedDocketNo: ndrDocketNo,
      });
      expect([200, 201]).toContain(inScanRes.status);

      const outScanRes = await ScanningAPI.recordScan(request, {
        boxCode,
        eventType: 'OUT_SCAN',
        scanStage: 'LOAD',
        branchCode: destinationBranch,
        scannedBy: actor,
        deviceId: 'DEV-LM-01',
        clientRef: crypto.randomUUID(),
        companyCode,
        expectedDocketNo: ndrDocketNo,
      });
      expect([200, 201]).toContain(outScanRes.status);
      expect(outScanRes.body?.data?.outcome).toBe('APPLIED');
      const publicScanId = outScanRes.body?.data?.publicEventId || outScanRes.body?.data?.id;
      expect(publicScanId).toBeTruthy();

      const loadRes = await LMFMTripAPI.loadBox(request, tripNo, {
        docketNo: ndrDocketNo,
        boxId: boxCode,
        publicScanId: String(publicScanId),
        actor,
        companyCode,
      });
      expect([200, 201]).toContain(loadRes.status);

      const closeLoadRes = await LMFMTripAPI.closeLoading(request, tripNo, { actor, companyCode });
      expect(closeLoadRes.status).toBe(200);

      const confirmStopsRes = await LMFMTripAPI.confirmStops(request, tripNo, { actor, companyCode });
      expect(confirmStopsRes.status).toBe(200);

      const pouchRes = await LMFMTripAPI.pouchDocument(request, tripNo, { docketNo: ndrDocketNo, actor, companyCode });
      expect(pouchRes.status).toBe(200);

      const readyRes = await LMFMTripAPI.markReady(request, tripNo, { actor, companyCode });
      expect(readyRes.status).toBe(200);

      const gateOutRes = await LMFMTripAPI.gateOut(request, tripNo, { actor, companyCode });
      expect(gateOutRes.status).toBe(200);

      const ndrRes = await LMFMTripAPI.recordNdr(request, tripNo, ndrDocketNo, {
        reasonCode: 'PREMISES_CLOSED',
        remark: 'Consignee premises closed during delivery attempt',
        actor,
        companyCode,
      });
      expect(ndrRes.status).toBe(200);
      expect(ndrRes.body?.status).toBe('SUCCESS');

      const rewarehouseRes = await LMFMTripAPI.rewarehouseDocket(request, tripNo, ndrDocketNo, {
        chargeabilityType: 'REWAREHOUSE_NON_CHARGEABLE',
        actor,
        companyCode,
      });
      expect([200, 201]).toContain(rewarehouseRes.status);
      expect(rewarehouseRes.body?.status).toBe('SUCCESS');

      const unloadScanRes = await ScanningAPI.recordScan(request, {
        boxCode,
        eventType: 'IN_SCAN',
        scanStage: 'UNLOAD',
        branchCode: destinationBranch,
        scannedBy: actor,
        deviceId: 'DEV-LM-01',
        clientRef: crypto.randomUUID(),
        companyCode,
        expectedDocketNo: ndrDocketNo,
      });
      expect([200, 201]).toContain(unloadScanRes.status);
      const unloadScanId = unloadScanRes.body?.data?.publicEventId || unloadScanRes.body?.data?.id;
      expect(unloadScanId).toBeTruthy();

      const unloadBoxRes = await LMFMTripAPI.unloadBox(request, tripNo, {
        docketNo: ndrDocketNo,
        boxId: boxCode,
        publicScanId: String(unloadScanId),
        actor,
        companyCode,
      });
      expect([200, 201]).toContain(unloadBoxRes.status);
      expect(unloadBoxRes.body?.status).toBe('SUCCESS');

      const closeTripRes = await LMFMTripAPI.closeTrip(request, tripNo, { actor, companyCode });
      expect([200, 201]).toContain(closeTripRes.status);
      expect(closeTripRes.body?.status).toBe('SUCCESS');

      const eligAfterRewarehouse = await LMFMTripAPI.getEligibleInventory(
        request,
        destinationBranch,
        companyCode,
        undefined,
        { q: ndrDocketNo }
      );
      expect(eligAfterRewarehouse.status).toBe(200);
      expect((eligAfterRewarehouse.body?.data?.items || []).some((i: any) => i.docket_no === ndrDocketNo)).toBe(true);
    });

    await test.step('Step 2 (TC_05.2, TC_05.3, TC_05.4): Verify Branch Aging Summary (GET /aging) & Eligible Pool Priority Fields', async () => {
      const agingRes = await LMFMTripAPI.getBranchAging(request, destinationBranch, companyCode, 3);
      expect(agingRes.status).toBe(200);
      expect(agingRes.body?.status).toBe('SUCCESS');
      expect(Array.isArray(agingRes.body?.data)).toBe(true);
      expect(agingRes.body?.data?.length).toBeGreaterThanOrEqual(1);
      expect(agingRes.body.data[0]).toHaveProperty('age_days');
      expect(agingRes.body.data[0]).toHaveProperty('is_rewarehoused');

      await attachApiLog(
        testInfo,
        'Scenario 9 (SC_05 / TC_05.1-TC_05.4): NDR + Rewarehouse & Branch Aging Summary',
        {
          method: 'GET',
          endpoint: `/api/v1/lmfm/branches/${destinationBranch}/aging`,
          queryParams: { companyCode, days: 3, rewarehousedDocket: ndrDocketNo },
        },
        {
          status: agingRes.status,
          body: {
            rewarehousedDocketNo: ndrDocketNo,
            agingTotalItems: agingRes.body?.data?.length,
            agingSample: agingRes.body?.data?.slice(0, 3),
          },
        }
      );
    });
  });

  // =========================================================================
  // POSITIVE SCENARIO 10 (SC_08 - TC_08.1, TC_08.2, TC_08.3, TC_08.4 & SC_12 - TC_12.1, TC_12.4):
  // Search, Filter, Pagination & Authorized Operator / BA Scoped Access
  // =========================================================================
  test('Scenario 10: [SC_08 / TC_08.1-TC_08.4 & SC_12 / TC_12.1, TC_12.4] Verify Keyword Search (?q=...), Pagination (page/size), Cluster Dockets vs PRQs Filtering & Authorized Operator/BA Access', async ({ request }, testInfo) => {
    test.setTimeout(120000);

    await test.step('Step 1 (TC_08.1 & TC_08.4): Verify Keyword Search (?q=...) and Pagination (page=1,size=2 vs page=2,size=2) on Eligible & Non-Eligible Endpoints', async () => {
      const page1Res = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        page: 1,
        size: 2,
      });
      expect(page1Res.status).toBe(200);
      expect(page1Res.body?.status).toBe('SUCCESS');
      const page1Items = page1Res.body?.data?.items || [];
      expect(page1Items.length).toBe(2);
      expect(page1Res.body?.data?.page).toBe(1);
      expect(page1Res.body?.data?.size).toBe(2);
      expect(Number(page1Res.body?.data?.total)).toBeGreaterThanOrEqual(4);

      const page2Res = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        page: 2,
        size: 2,
      });
      expect(page2Res.status).toBe(200);
      expect(page2Res.body?.status).toBe('SUCCESS');
      const page2Items = page2Res.body?.data?.items || [];
      expect(page2Items.length).toBe(2);
      expect(page2Res.body?.data?.page).toBe(2);
      expect(page2Res.body?.data?.size).toBe(2);
      expect(page1Items[0].docket_no).not.toBe(page2Items[0].docket_no);

      const sampleDocketNo = page1Items[0].docket_no;
      const searchEligRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: sampleDocketNo,
      });
      expect(searchEligRes.status).toBe(200);
      expect(searchEligRes.body?.status).toBe('SUCCESS');
      expect((searchEligRes.body?.data?.items || []).length).toBe(1);
      expect(searchEligRes.body?.data?.items?.[0]?.docket_no).toBe(sampleDocketNo);

      const searchNonEligRes = await LMFMTripAPI.getNonEligibleInventory(
        request,
        destinationBranch,
        companyCode,
        undefined,
        { q: '7500', size: 5 }
      );
      expect(searchNonEligRes.status).toBe(200);
      expect(searchNonEligRes.body?.status).toBe('SUCCESS');
      expect(Array.isArray(searchNonEligRes.body?.data?.items)).toBe(true);
      expect(searchNonEligRes.body?.data?.size).toBe(5);
    });

    await test.step('Step 2 (TC_08.2, TC_08.3, TC_12.1, TC_12.4): Verify Cluster Dockets vs PRQ Endpoints and Authorized BA-Scoped Trip Draft Creation', async () => {
      const cluster2115 = await LMFMTripAPI.resolveActiveClusterId(request, destinationBranch, companyCode);
      const cluster803 = await LMFMTripAPI.resolveActiveClusterId(request, '803', companyCode);
      if (!cluster2115 || !cluster803) {
        console.log('Skipping Step 2: Active planning clusters for branch 2115 or 803 not found in database.');
        return;
      }
      const dktsRes = await LMFMTripAPI.getClusterDockets(request, destinationBranch, cluster2115, companyCode, undefined, {
        page: 0,
        size: 5,
      });
      expect(dktsRes.status).toBe(200);
      expect(dktsRes.body?.status).toBe('SUCCESS');
      expect(Array.isArray(dktsRes.body?.data?.items)).toBe(true);

      const prqsRes = await LMFMTripAPI.getClusterPickupRequests(request, '803', cluster803, companyCode);
      expect(prqsRes.status).toBe(200);
      expect(prqsRes.body?.status).toBe('SUCCESS');
      expect(Array.isArray(prqsRes.body?.data)).toBe(true);

      const baDraftRes = await LMFMTripAPI.startTripDraft(request, {
        companyCode,
        branchCode: destinationBranch,
        zoneId: cluster2115,
        assigneeType: 'BA',
        baCode: 901002115,
        createdBy: actor,
      });
      expect([200, 201]).toContain(baDraftRes.status);
      expect(baDraftRes.body?.status).toBe('SUCCESS');
      expect(baDraftRes.body?.data?.assignee?.type).toBe('BA');
      expect(baDraftRes.body?.data?.assignee?.baCode).toBe(901002115);

      const draftId = baDraftRes.body?.data?.draftId;
      const discardRes = await LMFMTripAPI.discardTripDraft(request, draftId, { actor, companyCode });
      expect(discardRes.status).toBe(200);

      await attachApiLog(
        testInfo,
        'Scenario 10 (SC_08 & SC_12): Search, Pagination, Cluster Filtering & BA Scoped Draft',
        {
          method: 'GET',
          endpoint: `/api/v1/lmfm/branches/${destinationBranch}/eligible?q=...&page=0&size=2`,
          queryParams: { companyCode },
        },
        {
          status: 200,
          body: {
            clusterDocketsSampleCount: dktsRes.body?.data?.items?.length,
            clusterPrqsCount: prqsRes.body?.data?.length,
            baScopedAssignee: baDraftRes.body?.data?.assignee,
          },
        }
      );
    });
  });
});
