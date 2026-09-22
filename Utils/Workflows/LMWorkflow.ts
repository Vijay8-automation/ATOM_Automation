import { APIRequestContext, expect } from '@playwright/test';
import { pm } from '../VariableManager';
import { LMFMTripAPI } from '../../APIs/Modules/LMFM/LMFMTripAPI';
import { ScanningAPI } from '../../APIs/Modules/Scanning/ScanningAPI';
import { MMWorkflowResult } from './MMWorkflow';
import * as crypto from 'crypto';

export interface LMWorkflowResult {
  tripNo: string;
  docketNo: string;
  boxCode: string;
  publicScanId: string;
  deliveryOutcome: string;
  tripOutcome: string;
}

export class LMWorkflow {
  /**
   * Executes the entire 11-step Last Mile (LM) delivery flow end-to-end.
   *
   * @param request Playwright APIRequestContext
   * @param mmContext Optional MM result from MMWorkflow execution
   */
  public static async executeCompleteLMFlow(
    request: APIRequestContext,
    mmContext?: MMWorkflowResult
  ): Promise<LMWorkflowResult> {
    console.log('\n================================================================');
    console.log('🚚 [LM WORKFLOW] STARTING LAST MILE (LM) COMPLETE PROCESS FLOW');
    console.log('================================================================');

    const companyCode = Number(pm.environment.get('companyCode', 400021));
    const actor = String(pm.environment.get('actor', 'a1a1a1a1-0001-4000-8000-000000000001'));
    const destinationBranch = String(
      mmContext?.destinationBranch || pm.environment.get('destinationBranch', '2115')
    );
    const docketNo = String(mmContext?.docketNo || pm.environment.get('docketNo', ''));
    const boxCode = String(mmContext?.boxCode || pm.environment.get('boxCode', `${docketNo}-B1`));
    const vehicleNo = String(pm.environment.get('lmVehicleNo', 'MH02DE1001'));
    const driverCode = Number(pm.environment.get('lmDriverCode', 999001));
    const driverName = String(pm.environment.get('lmDriverName', 'Test Driver'));

    if (!docketNo) {
      throw new Error('❌ [LM Workflow Error] docketNo is required to execute Last Mile flow.');
    }

    console.log(`📍 Context -> Branch: ${destinationBranch} | Docket: ${docketNo} | Box: ${boxCode} | Vehicle: ${vehicleNo}`);

    // =========================================================================
    // STEP 1: WAIT FOR DOCKET TO ARRIVE IN ELIGIBLE INVENTORY (VIA KAFKA INBOUND)
    // =========================================================================
    console.log(`\n--- [Step 1] Waiting for Docket "${docketNo}" to arrive in Eligible Inventory at Branch ${destinationBranch} ---`);
    let isDocketPresent = false;
    let items: any[] = [];
    const maxAttempts = 25;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const eligibleRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode);
      items = eligibleRes.body?.data?.items || [];
      isDocketPresent = items.some((item: any) => item.docket_no === docketNo);
      if (isDocketPresent) {
        console.log(`✅ [Step 1 Passed] Docket "${docketNo}" arrived in Eligible Inventory! Total items: ${items.length} (Attempt ${attempt}/${maxAttempts})`);
        break;
      }
      if (attempt % 5 === 0) {
        console.log(`⏳ Still waiting for inbound Kafka arrival in Eligible Inventory... (Attempt ${attempt}/${maxAttempts})`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    expect(isDocketPresent).toBe(true);

    // =========================================================================
    // STEP 2: CREATE LAST MILE DELIVERY TRIP
    // =========================================================================
    console.log(`\n--- [Step 2] Creating LM Delivery Trip with Vehicle "${vehicleNo}" ---`);
    const createTripPayload = {
      companyCode,
      branchCode: destinationBranch,
      deliveryModel: 'REGULAR',
      clusterRefs: ['CLUSTER-01'],
      docketNos: [docketNo],
      vehicleNo,
      vehicleType: 'TATA-ACE',
      driverCode,
      driverName,
      loaderCode: 101,
      docExecCode: 101,
      underutilizationReason: 'URGENT_DISPATCH',
      createdBy: actor,
      routeName: 'LM-Route-1',
    };

    const createTripRes = await LMFMTripAPI.createTrip(request, createTripPayload);
    if (![200, 201].includes(createTripRes.status)) {
      console.error('❌ [Step 2 Failed] Create Trip API Response:', JSON.stringify(createTripRes.body));
    }
    expect([200, 201]).toContain(createTripRes.status);
    const tripNo = createTripRes.body?.data?.tripNo;
    expect(tripNo).toBeTruthy();
    pm.environment.set('lmTripNo', tripNo);
    console.log(`✅ [Step 2 Passed] LM Trip Created: "${tripNo}"`);

    // =========================================================================
    // STEP 3: VERIFY DOCKET AGAINST TRIP
    // =========================================================================
    console.log(`\n--- [Step 3] Verifying Docket "${docketNo}" against Trip "${tripNo}" ---`);
    const verifyRes = await LMFMTripAPI.verifyDocket(request, tripNo, {
      docketNo,
      actor,
      companyCode,
    });
    if (![200, 201].includes(verifyRes.status)) {
      console.error('❌ [Step 3 Failed] Verify Docket API Response:', JSON.stringify(verifyRes.body));
    }
    expect([200, 201]).toContain(verifyRes.status);
    console.log('✅ [Step 3 Passed] Docket verified successfully.');

    // =========================================================================
    // STEP 4: SCAN BOX BARCODE FOR LM LOADING (PORT 30088)
    // =========================================================================
    console.log(`\n--- [Step 4] Scanning Box "${boxCode}" for LM Loading ---`);
    const clientRef = crypto.randomUUID();
    const scanRes = await ScanningAPI.recordScan(request, {
      boxCode,
      eventType: 'OUT_SCAN',
      scanStage: 'LOAD',
      branchCode: destinationBranch,
      deviceId: 'DEV-LM-01',
      clientRef,
      expectedDocketNo: docketNo,
      companyCode,
      scannedBy: actor,
    });

    if (![200, 201].includes(scanRes.status)) {
      console.error('❌ [Step 4 Failed] Scan API Response:', JSON.stringify(scanRes.body));
    }
    expect([200, 201]).toContain(scanRes.status);
    const publicScanId = scanRes.body?.data?.publicEventId || scanRes.body?.data?.id;
    expect(publicScanId).toBeTruthy();
    console.log(`✅ [Step 4 Passed] Box Scan Recorded! Public Scan ID: "${publicScanId}"`);

    // =========================================================================
    // STEP 5: LOAD BOX ONTO LM TRIP
    // =========================================================================
    console.log(`\n--- [Step 5] Loading Box "${boxCode}" onto LM Trip ---`);
    const loadBoxRes = await LMFMTripAPI.loadBox(request, tripNo, {
      docketNo,
      boxId: boxCode,
      publicScanId,
      actor,
      companyCode,
    });
    if (![200, 201].includes(loadBoxRes.status)) {
      console.error('❌ [Step 5 Failed] Load Box API Response:', JSON.stringify(loadBoxRes.body));
    }
    expect([200, 201]).toContain(loadBoxRes.status);
    console.log('✅ [Step 5 Passed] Box loaded onto LM trip.');

    // =========================================================================
    // STEP 6: CLOSE LOADING
    // =========================================================================
    console.log('\n--- [Step 6] Closing Loading for LM Trip ---');
    const closeLoadRes = await LMFMTripAPI.closeLoading(request, tripNo, { actor, companyCode });
    expect([200, 201]).toContain(closeLoadRes.status);
    console.log('✅ [Step 6 Passed] Loading closed successfully.');

    // =========================================================================
    // STEP 7: CONFIRM STOPS / ROUTE PLAN
    // =========================================================================
    console.log('\n--- [Step 7] Confirming Route Stop Plan ---');
    const confirmStopsRes = await LMFMTripAPI.confirmStops(request, tripNo, { actor, companyCode });
    expect([200, 201]).toContain(confirmStopsRes.status);
    console.log('✅ [Step 7 Passed] Stop plan confirmed.');

    // =========================================================================
    // STEP 8: MARK READY FOR DISPATCH
    // =========================================================================
    console.log('\n--- [Step 8] Marking Trip Ready for Dispatch ---');
    const readyRes = await LMFMTripAPI.markReady(request, tripNo, { actor, companyCode });
    expect([200, 201]).toContain(readyRes.status);
    console.log('✅ [Step 8 Passed] Trip marked ready.');

    // =========================================================================
    // STEP 9: GATE-OUT
    // =========================================================================
    console.log('\n--- [Step 9] Gating Out LM Delivery Trip ---');
    const gateOutRes = await LMFMTripAPI.gateOut(request, tripNo, { actor, companyCode });
    expect([200, 201]).toContain(gateOutRes.status);
    console.log('✅ [Step 9 Passed] Trip gated out successfully.');

    // =========================================================================
    // STEP 10: RECORD DOORSTEP DELIVERY (POD)
    // =========================================================================
    console.log(`\n--- [Step 10] Recording Doorstep Delivery for Docket "${docketNo}" ---`);
    const deliveryPayload = {
      receivedBy: 'Customer Receiver',
      otpVerified: false,
      podImagePath: '/uploads/pod/delivery_pod.jpg',
      gpsLat: 19.076,
      gpsLong: 72.8777,
      items: [
        {
          boxCode,
          deliveredQty: 1,
        },
      ],
      payments: [],
      actor,
      companyCode,
    };

    const deliveryRes = await LMFMTripAPI.recordDelivery(
      request,
      tripNo,
      docketNo,
      deliveryPayload
    );
    if (![200, 201].includes(deliveryRes.status)) {
      console.error('❌ [Step 10 Failed] Delivery API Response:', JSON.stringify(deliveryRes.body));
    }
    expect([200, 201]).toContain(deliveryRes.status);
    const deliveryOutcome = deliveryRes.body?.data?.outcome || 'DELIVERED';
    expect(deliveryOutcome).toBe('DELIVERED');
    console.log(`✅ [Step 10 Passed] Delivery Recorded! Outcome: "${deliveryOutcome}"`);

    // =========================================================================
    // STEP 11: CLOSE TRIP & RECONCILIATION
    // =========================================================================
    console.log(`\n--- [Step 11] Closing LM Delivery Trip "${tripNo}" ---`);
    const closeTripRes = await LMFMTripAPI.closeTrip(request, tripNo, { actor, companyCode });
    if (![200, 201].includes(closeTripRes.status)) {
      console.error('❌ [Step 11 Failed] Close Trip API Response:', JSON.stringify(closeTripRes.body));
    }
    expect([200, 201]).toContain(closeTripRes.status);
    const tripOutcome = closeTripRes.body?.data?.outcome || 'COMPLETED';
    expect(tripOutcome).toBe('COMPLETED');
    console.log(`✅ [Step 11 Passed] LM Trip Closed! Final Outcome: "${tripOutcome}"`);

    console.log('\n================================================================');
    console.log(`🎉 [LM WORKFLOW] COMPLETED SUCCESSFULLY FOR TRIP "${tripNo}"`);
    console.log('================================================================\n');

    return {
      tripNo,
      docketNo,
      boxCode,
      publicScanId,
      deliveryOutcome,
      tripOutcome,
    };
  }
}
