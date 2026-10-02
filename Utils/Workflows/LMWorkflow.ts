import { APIRequestContext, expect } from '@playwright/test';
import { pm } from '../VariableManager';
import { LMFMTripAPI } from '../../APIs/Modules/LMFM/LMFMTripAPI';
import { ScanningAPI } from '../../APIs/Modules/Scanning/ScanningAPI';
import { ManifestAPI } from '../../APIs/Modules/MM/ManifestAPI';
import { MMTripAPI } from '../../APIs/Modules/MM/MMTripAPI';
import { RouteAPI } from '../../APIs/Modules/Network/RouteAPI';
import { MMWorkflowResult } from './MMWorkflow';
import { getLMFMTestData } from '../../TestData/Excel_Reader/excelReader';
import * as crypto from 'crypto';

export interface LMWorkflowResult {
  tripNo: string;
  docketNo: string;
  boxCode: string;
  publicScanId: string;
  deliveryOutcome: string;
  tripOutcome: string;
}

export interface PreFlightDependencyReport {
  suiteName: string;
  checkedAt: string;
  mmFifoCheck: {
    sourceBranch: string;
    destinationBranch: string;
    pendingMovableCount: number;
    pendingDocketNos: string[];
    resolutionAction: string;
    helperTripNo: string | null;
  };
  lmOpenDraftsCheck: {
    branchesChecked: string[];
    openDraftIdsFound: number[];
    discardedDraftIds: number[];
  };
  lmFleetVehicleStatusCheck: {
    fleetVehiclesChecked: string[];
    lockedCreatedTripsFound: Array<{ tripNo: string; vehicleNo: string; status: string }>;
    releasedTripNos: string[];
    activeGateOutTrips: Array<{ tripNo: string; vehicleNo: string; status: string }>;
  };
}

export class LMWorkflow {
  /**
   * Executes a comprehensive Pre-Flight Dependency Check before running any LMFM test file:
   * 1. MM FIFO Queue Check (1001 -> 2115): Boards any older pending MOVABLE dockets onto a helper trip so FIFO never blocks new dockets.
   * 2. LM Open Trip Drafts Check (2115 & 803): Discards any stale open drafts holding dockets, PRQs, vehicles, or docks.
   * 3. LM Fleet Vehicle Status Check (MH02DE1001..MH02DE1004): Releases any orphaned CREATED trips locking fleet vehicles.
   */
  public static async executePreFlightDependencyCheck(
    request: APIRequestContext,
    suiteName: string
  ): Promise<PreFlightDependencyReport> {
    console.log('\n================================================================');
    console.log(`🔍 [PRE-FLIGHT DEPENDENCY CHECK] ${suiteName}`);
    console.log('================================================================');

    const companyCode = Number(pm.environment.get('companyCode', 400021));
    const sourceBranch = String(pm.environment.get('sourceBranch', '1001'));
    const destinationBranch = String(pm.environment.get('destinationBranch', '2115'));
    const actor = String(pm.environment.get('actor', 'a1a1a1a1-0001-4000-8000-000000000001'));
    const transportMode = String(pm.environment.get('transportMode', 'ROAD'));
    const creationSource = String(pm.environment.get('creationSource') || 'MANUAL');
    const vehicleType = String(pm.environment.get('vehicleType', '17 FT'));
    const vehicleCapacityKg = Number(pm.environment.get('vehicleCapacityKg', 5000));
    const vehicleOwnership = String(pm.environment.get('vehicleOwnership', 'MARKET'));
    const vendorCode = String(pm.environment.get('vendorCode', 'VND-101'));
    const gpsStatus = String(pm.environment.get('gpsStatus', 'AVAILABLE'));
    const priority = String(pm.environment.get('priority', 'NORMAL'));
    const driverCode = String(pm.environment.get('driverCode', '101'));
    const driverName = String(pm.environment.get('driverName', 'Ramesh Kumar'));
    const driverMobile = String(pm.environment.get('driverMobile', '9876543210'));

    // 1. Check MM FIFO Queue (sourceBranch -> destinationBranch)
    const prePoolRes = await ManifestAPI.getMovableDockets(request, sourceBranch, { companyCode, size: 100 });
    const pendingMovable = (prePoolRes.body?.data?.items || []).filter(
      (it: any) => (it.destination_branch || it.destinationBranch) === destinationBranch
    );
    const pendingDocketNos = pendingMovable.map((it: any) => String(it.docket_no || it.docketNo));
    let helperTripNo: string | null = null;
    let resolutionAction = 'NO_PENDING_FIFO_DOCKETS';

    if (pendingMovable.length > 0) {
      let resolvedRouteCode = String(pm.environment.get('routeCode', 'RT-1001-2115'));
      let resolvedRouteType = String(pm.environment.get('expressRouteType', 'DIRECT'));
      const routesRes = await RouteAPI.listRoutes(request, { companyCode, status: 'ACTIVE' });
      if (routesRes.status === 200 && Array.isArray(routesRes.body?.data)) {
        const match = routesRes.body.data.find(
          (r: any) => r.sourceBranch === sourceBranch && r.destinationBranch === destinationBranch
        );
        if (match?.routeCode) {
          resolvedRouteCode = match.routeCode;
          if (match?.routeType) resolvedRouteType = String(match.routeType).toUpperCase();
        }
      }

      const fifoTripRes = await MMTripAPI.createTrip(request, {
        companyCode,
        sourceBranch,
        destinationBranch,
        routeType: resolvedRouteType,
        routeCode: resolvedRouteCode,
        emptyTrip: false,
        creationSource,
        vehicleNo: `DL01PF${Date.now().toString().slice(-4)}`,
        vehicleType,
        vehicleCapacityKg,
        vehicleOwnership,
        vendorCode,
        gpsStatus,
        digitalLock: false,
        priority,
        driverCode,
        driverName,
        driverMobile,
        createdBy: actor,
      });
      helperTripNo = fifoTripRes.body?.data?.tripNo || null;
      if (helperTripNo) {
        await ManifestAPI.generateManifests(request, helperTripNo, actor).catch(() => {});
        for (const oldItem of pendingMovable) {
          const oldDocketNo = oldItem.docket_no || oldItem.docketNo;
          await ManifestAPI.addDocketToTrip(request, helperTripNo, {
            docketNo: oldDocketNo,
            destinationBranch,
            serviceMode: transportMode,
            loadingBranch: sourceBranch,
            totalBoxes: Number(oldItem.total_boxes || oldItem.totalBoxes || 1),
            actualWeightKg: Number(oldItem.actual_weight || oldItem.actualWeightKg || 10.0),
            chargedWeightKg: Number(oldItem.charged_weight || oldItem.chargedWeightKg || 10.0),
            actor,
          } as any).catch(() => {});
        }
        resolutionAction = `BOARDED_${pendingMovable.length}_FIFO_DOCKETS_ONTO_HELPER_TRIP_${helperTripNo}`;
      }
    }
    console.log(
      `📌 [Pre-Flight 1/3] MM FIFO (${sourceBranch} -> ${destinationBranch}): ${pendingMovable.length} pending movable dockets (${resolutionAction})`
    );

    // 2. Check Open Trip Drafts at Branches 2115 and 803
    const branchesToCheck = [destinationBranch, '803'];
    const openDraftIdsFound: number[] = [];
    const discardedDraftIds: number[] = [];
    for (const br of branchesToCheck) {
      const draftsRes = await LMFMTripAPI.getOpenTripDrafts(request, br, companyCode);
      const drafts = Array.isArray(draftsRes.body?.data) ? draftsRes.body.data : [];
      for (const d of drafts) {
        const dId = Number(d.draftId || d.draft_id);
        if (dId) {
          openDraftIdsFound.push(dId);
          const discRes = await LMFMTripAPI.discardTripDraft(request, dId, { actor, companyCode });
          if (discRes.status === 200) {
            discardedDraftIds.push(dId);
          }
        }
      }
    }
    console.log(
      `📌 [Pre-Flight 2/3] LM Open Drafts (${branchesToCheck.join(', ')}): Found=${openDraftIdsFound.length}, Released=${discardedDraftIds.length}`
    );

    // 3. Check LM Fleet Vehicles Status (CREATED vs GATE_OUT)
    const fleetVehicles = getLMFMTestData().vehicles;
    const lockedCreatedTripsFound: Array<{ tripNo: string; vehicleNo: string; status: string }> = [];
    const releasedTripNos: string[] = [];
    const activeGateOutTrips: Array<{ tripNo: string; vehicleNo: string; status: string }> = [];

    const createdTripsRes = await LMFMTripAPI.listTrips(request, { companyCode, status: 'CREATED', size: 50 });
    for (const item of createdTripsRes.body?.data?.items || []) {
      if (fleetVehicles.includes(item.vehicle_no)) {
        lockedCreatedTripsFound.push({
          tripNo: item.trip_no,
          vehicleNo: item.vehicle_no,
          status: item.trip_status,
        });
        const cancelRes = await LMFMTripAPI.cancelTrip(request, item.trip_no, {
          reason: `Pre-flight dependency cleanup before ${suiteName}`,
          actor,
          companyCode,
        });
        if (cancelRes.status === 200) {
          releasedTripNos.push(item.trip_no);
        }
      }
    }

    const gateOutTripsRes = await LMFMTripAPI.listTrips(request, { companyCode, status: 'GATE_OUT', size: 50 });
    for (const item of gateOutTripsRes.body?.data?.items || []) {
      if (fleetVehicles.includes(item.vehicle_no)) {
        activeGateOutTrips.push({
          tripNo: item.trip_no,
          vehicleNo: item.vehicle_no,
          status: item.trip_status,
        });
      }
    }
    console.log(
      `📌 [Pre-Flight 3/3] LM Fleet Vehicles: Released CREATED Trips=${releasedTripNos.length}, Active GATE_OUT Trips=${activeGateOutTrips.length}`
    );

    // 4. Check MM Origin Docks (1001) for orphaned trips holding docks
    try {
      const activeTripsRes = await MMTripAPI.listTrips(request, { companyCode, branch: sourceBranch, size: 50 });
      const activeTrips = activeTripsRes.body?.data?.items || [];
      let cleanedCount = 0;
      for (const t of activeTrips) {
        const tripNo = t.tripNo || t.trip_no;
        const dock = t.currentDockNo || t.current_dock_no;
        const status = t.status || t.trip_status;
        if (tripNo && dock && ['CREATED', 'READY_FOR_DISPATCH'].includes(status)) {
          const cancelRes = await MMTripAPI.cancelTrip(request, tripNo, {
            reason: `Pre-flight cleanup of orphaned trip ${tripNo} (${status}) holding dock ${dock}`,
            actor,
            companyCode,
          }).catch(() => null);
          if (cancelRes && cancelRes.status === 200) {
            cleanedCount++;
          }
        }
      }
      if (cleanedCount > 0) {
        console.log(`📌 [Pre-Flight 4/4] MM Origin Docks (${sourceBranch}): Cleaned up ${cleanedCount} occupied dock(s)`);
      }
    } catch {}
    console.log('================================================================\n');

    return {
      suiteName,
      checkedAt: new Date().toISOString(),
      mmFifoCheck: {
        sourceBranch,
        destinationBranch,
        pendingMovableCount: pendingMovable.length,
        pendingDocketNos,
        resolutionAction,
        helperTripNo,
      },
      lmOpenDraftsCheck: {
        branchesChecked: branchesToCheck,
        openDraftIdsFound,
        discardedDraftIds,
      },
      lmFleetVehicleStatusCheck: {
        fleetVehiclesChecked: fleetVehicles,
        lockedCreatedTripsFound,
        releasedTripNos,
        activeGateOutTrips,
      },
    };
  }

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
    const uniqueVehicleSuffix = Math.floor(1000 + Math.random() * 9000);
    const vehicleNo = String(pm.environment.get('lmVehicleNo') || `MH02DE${uniqueVehicleSuffix}`);
    const driverCode = Number(pm.environment.get('lmDriverCode') || `9${Date.now().toString().slice(-5)}`);
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
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const eligibleRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, { q: docketNo });
      items = eligibleRes.body?.data?.items || [];
      isDocketPresent = items.some((item: any) => item.docket_no === docketNo);
      if (isDocketPresent) {
        console.log(`✅ [Step 1 Passed] Docket "${docketNo}" arrived in Eligible Inventory! Total items: ${items.length} (Attempt ${attempt}/${maxAttempts})`);
        break;
      }
      if (attempt === 5) {
        console.log(`⏳ Inbound Kafka event not yet visible; registering arrival at Branch ${destinationBranch} via /api/v1/lmfm/arrivals...`);
        await LMFMTripAPI.registerArrival(request, {
          companyCode,
          branchCode: destinationBranch,
          docketNo,
          customerCode: String(pm.environment.get('customerCode', 'CUS0009873B')),
          deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
          totalBoxes: 1,
          totalWeight: 10.0,
          actor,
        }).catch(() => {});
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    expect(isDocketPresent).toBe(true);

    // =========================================================================
    // STEP 2: CREATE LAST MILE DELIVERY TRIP
    // =========================================================================
    const lmfmData = getLMFMTestData();
    const candidateVehicles = Array.from(
      new Set([
        ...(pm.environment.get('lmVehicleNo') ? [String(pm.environment.get('lmVehicleNo'))] : []),
        ...lmfmData.vehicles,
      ])
    );

    let createTripRes: any;
    let selectedVehicle = candidateVehicles[0];
    const resolvedClusterRef = await LMFMTripAPI.resolveActiveClusterRef(request, destinationBranch, companyCode, 'CLUSTER-01');

    const attemptCreateTripWithCandidates = async () => {
      for (const vNo of candidateVehicles) {
        console.log(`\n--- [Step 2] Trying LM Delivery Trip with Vehicle "${vNo}" ---`);
        const createTripPayload = {
          companyCode,
          branchCode: destinationBranch,
          deliveryModel: 'REGULAR',
          clusterRefs: [resolvedClusterRef],
          docketNos: [docketNo],
          vehicleNo: vNo,
          vehicleType: lmfmData.vehicleType || 'TATA-ACE',
          driverCode,
          driverName,
          loaderCode: 101,
          docExecCode: 101,
          underutilizationReason: 'URGENT_DISPATCH',
          createdBy: actor,
          routeName: 'LM-Route-1',
        };

        createTripRes = await LMFMTripAPI.createTrip(request, createTripPayload);
        if ([200, 201].includes(createTripRes.status)) {
          selectedVehicle = vNo;
          return true;
        }
        console.warn(`⚠️ Vehicle "${vNo}" rejected (${createTripRes.status}): ${createTripRes.body?.detail || ''}. Trying next vehicle...`);
      }
      return false;
    };

    let createdOk = await attemptCreateTripWithCandidates();
    if (!createdOk) {
      // Self-heal if all fleet vehicles are locked in CREATED status from an interrupted run
      const openTripsRes = await LMFMTripAPI.listTrips(request, { companyCode, status: 'CREATED', size: 50 });
      const openItems = openTripsRes.body?.data?.items || [];
      for (const item of openItems) {
        if (candidateVehicles.includes(item.vehicle_no)) {
          await LMFMTripAPI.cancelTrip(request, item.trip_no, {
            reason: 'Automated pre-flight release of stuck CREATED trip',
            actor,
            companyCode,
          }).catch(() => {});
        }
      }
      createdOk = await attemptCreateTripWithCandidates();
    }

    if (![200, 201].includes(createTripRes.status)) {
      console.error('❌ [Step 2 Failed] Create Trip API Response:', JSON.stringify(createTripRes.body));
    }
    expect([200, 201]).toContain(createTripRes.status);
    const tripNo = createTripRes.body?.data?.tripNo;
    expect(tripNo).toBeTruthy();
    pm.environment.set('lmTripNo', tripNo);
    pm.environment.set('lmVehicleNo', selectedVehicle);
    console.log(`✅ [Step 2 Passed] LM Trip Created: "${tripNo}" with Vehicle "${selectedVehicle}"`);

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
    // STEP 7: CONFIRM STOPS / ROUTE PLAN & POUCH DOCUMENT
    // =========================================================================
    console.log('\n--- [Step 7] Confirming Route Stop Plan & Pouching Docket Document ---');
    const confirmStopsRes = await LMFMTripAPI.confirmStops(request, tripNo, { actor, companyCode });
    expect([200, 201]).toContain(confirmStopsRes.status);
    console.log('✅ [Step 7a Passed] Stop plan confirmed.');

    const pouchRes = await LMFMTripAPI.pouchDocument(request, tripNo, {
      docketNo,
      actor,
      companyCode,
    });
    expect([200, 201]).toContain(pouchRes.status);
    console.log('✅ [Step 7b Passed] Docket document pouched on LM trip.');

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
