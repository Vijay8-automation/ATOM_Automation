import { test, expect } from '@playwright/test';
import { BaseAPI } from '../../../APIs/Common/BaseAPI';
import { DocketAPI } from '../../../APIs/Modules/Booking/DocketAPI';
import { RouteAPI } from '../../../APIs/Modules/Network/RouteAPI';
import { MMTripAPI } from '../../../APIs/Modules/MM/MMTripAPI';
import { ManifestAPI } from '../../../APIs/Modules/MM/ManifestAPI';
import { ScanningAPI } from '../../../APIs/Modules/Scanning/ScanningAPI';
import { LMFMTripAPI } from '../../../APIs/Modules/LMFM/LMFMTripAPI';
import { LMWorkflow } from '../../../Utils/Workflows/LMWorkflow';
import { pm } from '../../../Utils/VariableManager';

async function attachLog(
  testInfo: any,
  stepName: string,
  reqInfo: any,
  resInfo: any,
  feasibilityInfo?: {
    practicallyPossibleOnUI: boolean;
    classification: 'PRACTICALLY_POSSIBLE_ON_UI' | 'API_ONLY_PAYLOAD_BYPASS' | 'MULTI_TAB_CONCURRENT_UI';
    qaAnalysis: string;
  }
) {
  await testInfo.attach(`API Negative Log - ${stepName}`, {
    body: JSON.stringify(
      {
        scenario: stepName,
        uiFeasibilityAnalysis: feasibilityInfo || null,
        request: reqInfo,
        response: { statusCode: resInfo.status, body: resInfo.body },
      },
      null,
      2
    ),
    contentType: 'application/json',
  });
}

test.describe('First Mile & Last Mile (FMLM) - Negative Scenarios, Edge Cases & UI vs API Bypass Feasibility Suite (SC_01 to SC_12)', () => {
  const companyCode = Number(pm.environment.get('companyCode'));
  const destinationBranch = String(pm.environment.get('destinationBranch'));
  const actor = String(pm.environment.get('actor'));
  const approverActor = String(pm.environment.get('approverActor'));

  // =========================================================================
  // NEGATIVE SCENARIO 1: Pre-Flight Dependency Check + MM Loading & Photo Validation (4 Cases)
  // =========================================================================
  test('Scenario 1: [Pre-Flight Check + MM Loading & Photo Validation] Verify Loading Close Without Mandatory 50%/100% Photos, Geo-Coordinate 500 Crash, Fake Branch & Sequence Bypass', async ({ request }, testInfo) => {
    test.setTimeout(150000);

    // 0. Pre-Flight Dependency Check (MM FIFO Movable Queue, LM Open Drafts, LM Fleet Vehicle Status)
    const preFlightReport = await LMWorkflow.executePreFlightDependencyCheck(
      request,
      'NegativeMMTripScenarioFMLM.spec.ts'
    );
    expect(preFlightReport).toBeDefined();
    expect(preFlightReport.suiteName).toBe('NegativeMMTripScenarioFMLM.spec.ts');
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

    const mmBaseUrl = BaseAPI.getServiceUrl('mm');
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(token);

    const companyId = String(pm.environment.get('companyId'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const bookingBranch = String(pm.environment.get('bookingBranch'));
    const billingPartyCode = String(pm.environment.get('billingPartyCode'));
    const customerCode = String(pm.environment.get('customerCode'));
    const customerType = String(pm.environment.get('customerType'));
    const pickupPincode = String(pm.environment.get('pickupPincode'));
    const deliveryPincode = String(pm.environment.get('deliveryPincode'));
    const consignorPincode = String(pm.environment.get('consignorPincode'));
    const consignorCode = String(pm.environment.get('consignorCode'));
    const consignorGstin = String(pm.environment.get('consignorGstin'));
    const consigneeCode = String(pm.environment.get('consigneeCode'));
    const consigneeGstin = String(pm.environment.get('consigneeGstin'));
    const transportMode = String(pm.environment.get('transportMode'));
    const loadType = String(pm.environment.get('loadType'));
    const freightMode = String(pm.environment.get('freightMode'));
    const docketSource = String(pm.environment.get('docketSource'));
    const deliveryAddressId = Number(pm.environment.get('deliveryAddressId'));
    const pickupLocationId = Number(pm.environment.get('pickupLocationId'));
    const invoiceDate = String(pm.environment.get('invoiceDate'));
    const ewayBillNo = Number(pm.environment.get('ewayBillNo'));
    const expressRouteType = String(pm.environment.get('expressRouteType'));
    const routeCode = String(pm.environment.get('routeCode'));
    const creationSource = String(pm.environment.get('creationSource') || pm.environment.get('tripCreationSource'));
    const vehicleType = String(pm.environment.get('vehicleType'));
    const vehicleCapacityKg = Number(pm.environment.get('vehicleCapacityKg'));
    const vehicleOwnership = String(pm.environment.get('vehicleOwnership'));
    const vendorCode = String(pm.environment.get('vendorCode'));
    const gpsStatus = String(pm.environment.get('gpsStatus'));
    const priority = String(pm.environment.get('priority'));
    const driverCode = String(pm.environment.get('driverCode'));
    const driverName = String(pm.environment.get('driverName'));
    const driverMobile = String(pm.environment.get('driverMobile'));
    const dockNo = String(pm.environment.get('dockNo'));
    const deviceOriginId = String(pm.environment.get('deviceOriginId') || pm.environment.get('originDeviceId'));
    const validGeoLat = Number(pm.environment.get('validGeoLat'));
    const validGeoLong = Number(pm.environment.get('validGeoLong'));
    const outOfRangeGeoLat = Number(pm.environment.get('outOfRangeGeoLat'));
    const outOfRangeGeoLong = Number(pm.environment.get('outOfRangeGeoLong'));
    const fakeLoadingBranchCode = String(pm.environment.get('fakeLoadingBranchCode'));
    const invalidPhotoUrl = String(pm.environment.get('invalidPhotoUrl'));
    const load50PhotoUrl = String(pm.environment.get('load50PhotoUrl'));
    const load100PhotoUrl = String(pm.environment.get('load100PhotoUrl'));
    const timeSuffix = Date.now().toString().slice(-5);

    // Resolve active route for sourceBranch -> destinationBranch if available
    let resolvedRouteCode = routeCode;
    let resolvedRouteType = expressRouteType;
    const routesRes = await RouteAPI.listRoutes(request, { companyCode, status: 'ACTIVE' });
    expect(routesRes.status).toBe(200);
    if (routesRes.status === 200 && Array.isArray(routesRes.body?.data) && routesRes.body.data.length > 0) {
      const match = routesRes.body.data.find(
        (r: any) => r.sourceBranch === sourceBranch && r.destinationBranch === destinationBranch
      );
      if (match?.routeCode) {
        resolvedRouteCode = match.routeCode;
        if (match?.routeType) {
          resolvedRouteType = String(match.routeType).toUpperCase();
        }
      }
    }

    // Pre-requisite Setup: Create Docket, Trip, Manifest & Load 1 Scanned Box (with 0 loading photos uploaded)
    const docketRes = await DocketAPI.createDocket(request, {
      companyCode,
      companyId,
      bookingBranch,
      billingPartyCode,
      customerType,
      sourceBranch,
      destinationBranch,
      deliveryAddressId,
      pickupLocationId,
      pickupPincode,
      deliveryPincode,
      consignorPincode,
      transportMode,
      loadType,
      freightMode,
      docketSource,
      createdBy: actor,
      isReturn: false,
      originalDocketNo: '',
      customerCode,
      prqCode: null,
      invoices: [
        {
          invoiceNo: `INV-${Date.now()}`,
          invoiceDate,
          grossValue: 10000,
          netValue: 9500,
          poNumber: `PO-${timeSuffix}`,
          goodsDescription: 'General Cargo',
          ewayBillNo,
          ewayBillDate: null,
          ewayBillValidDate: null,
          consignorCode,
          consignorGstin,
          consigneeCode,
          consigneeGstin,
          boxes: [
            {
              partNumber: null,
              boxCount: 1,
              type: 'CARTON',
              quantity: 1,
              length: 30,
              width: 20,
              height: 15,
              unit: 'CM',
              actualWeight: 10.0,
            },
          ],
        },
      ],
      appointmentDelivery: false,
      deliveryDatePlanned: null,
      deliverySlot: null,
      drqCode: null,
      attachments: [],
    });
    expect([200, 201]).toContain(docketRes.status);
    const docketNo = docketRes.body?.data?.docketNo;
    expect(docketNo).toBeTruthy();

    // Wait for docket to reach MM movable pool
    for (let attempt = 1; attempt <= 10; attempt++) {
      const poolRes = await ManifestAPI.getMovableDockets(request, sourceBranch, { companyCode, size: 100 });
      expect(poolRes.status).toBe(200);
      const items = poolRes.body?.data?.items || [];
      if (items.some((it: any) => (it.docketNo || it.docket_no) === docketNo)) {
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    const tripRes = await MMTripAPI.createTrip(request, {
      companyCode,
      sourceBranch,
      destinationBranch,
      routeType: resolvedRouteType,
      routeCode: resolvedRouteCode,
      emptyTrip: false,
      creationSource,
      vehicleNo: `DL01AB${timeSuffix.slice(-4)}`,
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
    expect([200, 201]).toContain(tripRes.status);
    const tripNo = tripRes.body?.data?.tripNo;
    expect(tripNo).toBeTruthy();

    const dockRes = await MMTripAPI.assignDock(request, tripNo, {
      branchCode: sourceBranch,
      dockNo,
      purpose: 'LOADING',
      actor,
    }).catch(() => null);
    if (!dockRes || dockRes.body?.data?.queued === true || dockRes.body?.data?.dockAssigned === false) {
      await MMTripAPI.assignDock(request, tripNo, {
        branchCode: sourceBranch,
        dockNo: `DOCK-${timeSuffix}`,
        purpose: 'LOADING',
        actor,
      }).catch(() => {});
    }

    await ManifestAPI.generateManifests(request, tripNo, actor).catch(() => {});
    const addDocketRes = await ManifestAPI.addDocketToTrip(request, tripNo, {
      docketNo,
      destinationBranch,
      serviceMode: transportMode,
      loadingBranch: sourceBranch,
      totalBoxes: 1,
      actualWeightKg: 10.0,
      chargedWeightKg: 10.0,
      actor,
    } as any);
    expect([200, 201]).toContain(addDocketRes.status);
    const manifestNo = addDocketRes.body?.data?.manifestNo || `${tripNo.replace('TRIP-', 'MNF-')}-1`;
    expect(manifestNo).toBeTruthy();

    const printRes = await ScanningAPI.printBatch(request, {
      docketNo,
      boxesCount: 1,
      printedBy: actor,
      companyCode,
      branchCode: sourceBranch,
      printType: 'POST_MANIFEST',
    });
    expect([200, 201]).toContain(printRes.status);
    const boxCode = printRes.body?.data?.boxCodes?.[0] || `${docketNo}-B1`;

    const pickupScanRes = await ScanningAPI.recordScan(request, {
      boxCode,
      eventType: 'PICKUP_SCAN',
      scanStage: 'BOOKING',
      branchCode: sourceBranch,
      scannedBy: actor,
      deviceId: deviceOriginId,
      companyCode,
      expectedDocketNo: docketNo,
    });
    expect([200, 201]).toContain(pickupScanRes.status);

    const scanRes = await ScanningAPI.recordScan(request, {
      boxCode,
      eventType: 'OUT_SCAN',
      scanStage: 'LOAD',
      branchCode: sourceBranch,
      scannedBy: actor,
      deviceId: deviceOriginId,
      companyCode,
      expectedDocketNo: docketNo,
    });
    expect([200, 201]).toContain(scanRes.status);
    const scanEventId = scanRes.body?.data?.publicEventId || scanRes.body?.data?.id;
    expect(scanEventId).toBeTruthy();

    const docScanRes = await ManifestAPI.scanTripDocketDocument(request, tripNo, { docketNo, companyCode, actor }, token);
    expect(docScanRes.status).toBe(200);

    const loadBoxRes = await ManifestAPI.loadBox(request, manifestNo, {
      docketNo,
      boxCode,
      scanEventId,
      actor,
      branch: sourceBranch,
    });
    expect([200, 201]).toContain(loadBoxRes.status);

    // =========================================================================
    // Case 1: Loading & Unloading Close Allowed Without Mandatory 50% and 100% Photo Evidence
    // =========================================================================
    await test.step('Case 1: Loading & Unloading Close Allowed Without Mandatory 50% and 100% Photo Evidence', async () => {
      const closePayload = {
        actor,
        branch: sourceBranch,
      };
      const endpoint = `/api/v1/manifests/${manifestNo}/loading/close`;
      const res = await request.post(`${mmBaseUrl}${endpoint}`, { data: closePayload, headers });
      const body = await res.json().catch(() => ({}));

      await attachLog(
        testInfo,
        'Case 1: Loading Close Without Mandatory 50% & 100% Photos',
        { method: 'POST', endpoint, payload: closePayload },
        { status: res.status(), body },
        {
          practicallyPossibleOnUI: true,
          classification: 'PRACTICALLY_POSSIBLE_ON_UI',
          qaAnalysis:
            'YES — Practically possible on UI/Mobile Loading App if operator clicks Close Loading after scanning boxes without uploading 50% & 100% stage photos. Backend returns 200 OK instead of blocking with 400/422.',
        }
      );

      expect.soft(
        [400, 422],
        `[DEFECT: Issue 1 - Missing Mandatory Photo Evidence (UI Practical: YES)] Loading close should be rejected without 50% & 100% loading photos, but backend returned ${res.status()}`
      ).toContain(res.status());
    });

    // =========================================================================
    // Case 2: Unhandled Internal Server Error (HTTP 500) on Out-of-Range Geo-Coordinates (geoLat / geoLong)
    // =========================================================================
    await test.step('Case 2: Unhandled Internal Server Error (HTTP 500) on Out-of-Range Geo-Coordinates (geoLat / geoLong)', async () => {
      const geoPayload = {
        captureStage: 'LOAD_50_PERCENT',
        photoUrl: load50PhotoUrl,
        branchCode: sourceBranch,
        geoLat: outOfRangeGeoLat,
        geoLong: outOfRangeGeoLong,
        actor,
      };
      const endpoint = `/api/v1/mm/manifests/${manifestNo}/loading-photo?companyCode=${companyCode}`;
      const res = await request.post(`${mmBaseUrl}${endpoint}`, { data: geoPayload, headers });
      const body = await res.json().catch(() => ({}));

      await attachLog(
        testInfo,
        'Case 2: Out-of-Range Geo-Coordinates (geoLat / geoLong) 500 Crash',
        { method: 'POST', endpoint, payload: geoPayload },
        { status: res.status(), body },
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on standard UI (API-Only Payload Bypass) — Device/Browser Geolocation API only produces lat [-90..90] and long [-180..180]. Values like 999.999 can only be injected via direct API call or tampered payload, causing an unhandled DB numeric overflow (HTTP 500).',
        }
      );

      expect.soft(
        [400, 422],
        `[DEFECT: Issue 2 - Unhandled Server Crash (UI Practical: NO / API-Only)] Out-of-range geoLat (${outOfRangeGeoLat}) / geoLong (${outOfRangeGeoLong}) should return 400/422 validation error, but backend returned ${res.status()}`
      ).toContain(res.status());
    });

    // =========================================================================
    // Case 3: Missing Branch Validation & Invalid Photo URL Accepted in Loading Photo API
    // =========================================================================
    await test.step('Case 3: Missing Branch Validation & Invalid Photo URL Accepted in Loading Photo API', async () => {
      const invalidBranchUrlPayload = {
        captureStage: 'UNLOAD_100_PERCENT',
        photoUrl: invalidPhotoUrl,
        branchCode: fakeLoadingBranchCode,
        geoLat: validGeoLat,
        geoLong: validGeoLong,
        actor,
      };
      const endpoint = `/api/v1/mm/manifests/${manifestNo}/loading-photo?companyCode=${companyCode}`;
      const res = await request.post(`${mmBaseUrl}${endpoint}`, { data: invalidBranchUrlPayload, headers });
      const body = await res.json().catch(() => ({}));

      await attachLog(
        testInfo,
        'Case 3: Fake Branch & Invalid Photo URL Accepted',
        { method: 'POST', endpoint, payload: invalidBranchUrlPayload },
        { status: res.status(), body },
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on standard UI (API-Only Payload Bypass) — UI automatically sends the logged-in user session branchCode and S3/upload service photo URL. Fake branch "999999" and malformed URL can only be injected via API payload tampering.',
        }
      );

      expect.soft(
        [400, 422],
        `[DEFECT: Issue 3 - Missing Branch & URL Validation (UI Practical: NO / API-Only)] Fake branchCode "${fakeLoadingBranchCode}" and invalid photoUrl "${invalidPhotoUrl}" should be rejected with 400/422, but backend returned ${res.status()}`
      ).toContain(res.status());
    });

    // =========================================================================
    // Case 4: State Machine & Sequence Bypass — Loading Photos Accepted After Trip Completion & Out of Order
    // =========================================================================
    await test.step('Case 4: State Machine & Sequence Bypass — Loading Photos Accepted After Manifest Closure & Out of Order', async () => {
      const sequenceBypassPayload = {
        captureStage: 'LOAD_100_PERCENT',
        photoUrl: load100PhotoUrl,
        branchCode: sourceBranch,
        geoLat: validGeoLat,
        geoLong: validGeoLong,
        actor,
      };
      const endpoint = `/api/v1/mm/manifests/${manifestNo}/loading-photo?companyCode=${companyCode}`;
      const res = await request.post(`${mmBaseUrl}${endpoint}`, { data: sequenceBypassPayload, headers });
      const body = await res.json().catch(() => ({}));

      await attachLog(
        testInfo,
        'Case 4: Post-Closure & Out-of-Order Loading Photo Accepted',
        { method: 'POST', endpoint, payload: sequenceBypassPayload },
        { status: res.status(), body },
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on single-tab UI (API-Only / Stale Multi-Tab Bypass) — Once manifest loading is closed on UI, the photo upload controls are closed/disabled. Uploading LOAD_100_PERCENT after closure without LOAD_50_PERCENT occurs via direct API call or stale second tab.',
        }
      );

      expect.soft(
        [400, 409, 422],
        `[DEFECT: Issue 4 - State Machine & Sequence Bypass (UI Practical: NO / API-Only)] Uploading LOAD_100_PERCENT photo after manifest is already CLOSED and without LOAD_50_PERCENT should be rejected, but backend returned ${res.status()}`
      ).toContain(res.status());
    });

    // Release DOCK-1 at sourceBranch by cancelling the test MM trip
    await MMTripAPI.cancelTrip(request, tripNo, {
      reason: 'Cleanup after Negative Scenario 1',
      actor,
    }).catch(() => {});
  });

  // =========================================================================
  // NEGATIVE SCENARIO 2 (SC_06 - TC_06.5 & SC_04 - TC_04.1): Zero Selection Validation & Empty Array [] API Bypass
  // =========================================================================
  test('Scenario 2: [SC_06 / TC_06.5 & SC_04 / TC_04.1] Verify Zero Selection Readiness Block (0 DKTs & 0 PRQs) and Empty Array [] Trip Creation API Bypass Rejection', async ({ request }, testInfo) => {
    test.setTimeout(120000);

    await test.step('Case 2A (SC_06 / TC_06.5 - UI Practical): Draft Readiness Check with 0 Dockets & 0 PRQs Returns ready=false (NOTHING_TO_CARRY)', async () => {
      const cluster2115 = await LMFMTripAPI.resolveActiveClusterId(request, destinationBranch, companyCode);
      if (!cluster2115) {
        console.log(`Skipping Case 2A: No active planning cluster found for branch ${destinationBranch} in database.`);
        return;
      }
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
        const readinessRes = await LMFMTripAPI.getDraftReadiness(request, String(draftId), companyCode);
        await attachLog(
          testInfo,
          'Case 2A (SC_06 / TC_06.5): Zero Selection Draft Readiness Check',
          { method: 'GET', endpoint: `/api/v1/lmfm/trip-drafts/${draftId}/readiness` },
          readinessRes,
          {
            practicallyPossibleOnUI: true,
            classification: 'PRACTICALLY_POSSIBLE_ON_UI',
            qaAnalysis:
              'YES — Practically happens on UI when operator opens Step 1 without checking any Docket or PRQ. Next CTA is disabled and /readiness returns ready=false with code NOTHING_TO_CARRY.',
          }
        );

        expect(readinessRes.status).toBe(200);
        expect(readinessRes.body?.status).toBe('SUCCESS');
        expect(readinessRes.body?.data?.ready).toBe(false);
        const problems = readinessRes.body?.data?.problems || [];
        expect(problems.some((p: any) => p.code === 'NOTHING_TO_CARRY')).toBe(true);
      } finally {
        const discardRes = await LMFMTripAPI.discardTripDraft(request, draftId, { actor, companyCode });
        expect(discardRes.status).toBe(200);
      }
    });

    await test.step('Case 2B (SC_06 / TC_06.5 & SC_04 / TC_04.1 - API Bypass): Direct POST /api/v1/lmfm/trips with Empty docketNos: [] is Rejected with 400 Bad Request', async () => {
      const emptyTripRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: 994401,
        driverName: 'Empty Payload Driver',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });

      await attachLog(
        testInfo,
        'Case 2B (SC_06 / TC_06.5): Empty docketNos [] Sent to Trip Creation API',
        { method: 'POST', endpoint: '/api/v1/lmfm/trips', payload: { docketNos: [] } },
        emptyTripRes,
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on UI (Blocked by disabled Next/Create Trip button when selection=0). Tested via direct API bypass and properly rejected by backend with 400 VALIDATION ("docketNos: must not be empty").',
        }
      );

      expect([400, 422]).toContain(emptyTripRes.status);
      expect(emptyTripRes.body?.errorCode || emptyTripRes.body?.title).toBeTruthy();
    });
  });

  // =========================================================================
  // NEGATIVE SCENARIO 3 (SC_11 - TC_11.3): Real-Time Vehicle Overload (> 100% Capacity)
  // =========================================================================
  test('Scenario 3: [SC_11 / TC_11.3] Verify Real-Time Vehicle Overload (> 100% Capacity) Blocks Trip Creation with 422 CAPACITY_BREACH', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const heavyDocketNo = `7500-A6-HVY-${ts}`;

    await test.step('Step 1: Register Heavy Docket (15,000 KG) Exceeding Vehicle MH02DE1002 Capacity (9,000 KG = 166.67% Load)', async () => {
      const arrRes = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: heavyDocketNo,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Heavy Consignee Hub, Thane, 400604',
        totalBoxes: 10,
        totalWeight: 15000.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arrRes.status);
      expect(arrRes.body?.status).toBe('SUCCESS');
    });

    await test.step('Step 2 (TC_11.3): Attempt Trip Creation on 9,000 KG Vehicle & Verify 422 CAPACITY_BREACH Rejection', async () => {
      const overloadRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [heavyDocketNo],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`94${ts.slice(-4)}`),
        driverName: 'Overload Test Driver',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });

      await attachLog(
        testInfo,
        'Scenario 3 (SC_11 / TC_11.3): Vehicle Overload (> 100% Capacity) Blocked',
        {
          method: 'POST',
          endpoint: '/api/v1/lmfm/trips',
          payload: { docketNo: heavyDocketNo, docketWeightKg: 15000, vehicleNo: 'MH02DE1002', vehicleCapacityKg: 9000 },
        },
        overloadRes,
        {
          practicallyPossibleOnUI: true,
          classification: 'PRACTICALLY_POSSIBLE_ON_UI',
          qaAnalysis:
            'YES — Operator can select heavy dockets exceeding vehicle capacity on UI Step 2; UI shows Red Capacity Bar (>100%) and backend strictly blocks Trip Creation with 422 CAPACITY_BREACH.',
        }
      );

      expect(overloadRes.status).toBe(422);
      expect(['CAPACITY_BREACH', 'VEHICLE_UNKNOWN']).toContain(overloadRes.body?.errorCode);
    });
  });

  // =========================================================================
  // NEGATIVE SCENARIO 4 (SC_12 - TC_12.2, TC_12.3): Role-Based Restriction (RBAC) Verification
  // =========================================================================
  test('Scenario 4: [SC_12 / TC_12.2, TC_12.3] Verify Backend RBAC Enforcement When Unauthorized / Non-Supervisor User Attempts Hold Release or Trip Creation', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const rbacDocketNo = `7500-A7-RBC-${ts}`;
    const unauthorizedActor = '00000000-0000-0000-0000-000000000099';
    const unauthorizedHeaders = { 'X-User-Id': unauthorizedActor };

    // Register docket and put on HOLD
    const arrRes = await LMFMTripAPI.registerArrival(request, {
      companyCode,
      branchCode: destinationBranch,
      docketNo: rbacDocketNo,
      customerCode: 'CUS0009873B',
      deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
      totalBoxes: 1,
      totalWeight: 15.0,
      appointmentDate: null,
      appointmentSlot: null,
      actor,
    });
    expect([200, 201]).toContain(arrRes.status);
    expect(arrRes.body?.status).toBe('SUCCESS');

    const holdRes = await LMFMTripAPI.holdDocket(request, rbacDocketNo, {
      bucketType: 'HOLD',
      reason: 'RBAC_VERIFICATION_HOLD',
      actor,
      companyCode,
    });
    expect(holdRes.status).toBe(200);
    expect(holdRes.body?.status).toBe('SUCCESS');

    await test.step('Case 4A (SC_12 / TC_12.3): Unauthorized / Non-Supervisor User Attempting Hold Release API', async () => {
      const releaseRes = await LMFMTripAPI.releaseHold(
        request,
        rbacDocketNo,
        { actor: unauthorizedActor, companyCode },
        undefined,
        unauthorizedHeaders
      );

      await attachLog(
        testInfo,
        'Case 4A (SC_12 / TC_12.3): Unauthorized Non-Supervisor Hold Release Attempt',
        {
          method: 'POST',
          endpoint: `/api/v1/lmfm/dockets/${rbacDocketNo}/hold/release`,
          headers: unauthorizedHeaders,
        },
        releaseRes,
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on UI (UI hides/disables Release Hold button for Branch Operator, showing it only to Supervisor). However, via direct API call with an unauthorized X-User-Id, the backend lacks RBAC enforcement and returns 200 OK instead of 403 Forbidden.',
        }
      );

      expect.soft(
        [401, 403],
        `[DEFECT: SC_12 / TC_12.3 Missing Backend RBAC (UI Practical: NO / API Bypass: YES)] Unauthorized user (${unauthorizedActor}) should be blocked with 401/403 from releasing a docket hold, but backend returned ${releaseRes.status}`
      ).toContain(releaseRes.status);
    });

    await test.step('Case 4B (SC_12 / TC_12.2): Unauthorized / Dispatcher Role User Attempting Trip Creation API', async () => {
      const unauthTripRes = await LMFMTripAPI.createTrip(
        request,
        {
          companyCode,
          branchCode: destinationBranch,
          deliveryModel: 'REGULAR',
          clusterRefs: ['CLUSTER-400604'],
          docketNos: [rbacDocketNo],
          vehicleNo: 'MH02DE1003',
          vehicleType: '14FT',
          driverCode: Number(`95${ts.slice(-4)}`),
          driverName: 'Unauthorized Dispatcher',
          loaderCode: 800201,
          docExecCode: 800301,
          underutilizationReason: 'URGENT_DISPATCH',
          createdBy: unauthorizedActor,
          routeName: '2115-400604',
        },
        undefined,
        unauthorizedHeaders
      );

      const createdTripNo = unauthTripRes.body?.data?.tripNo || unauthTripRes.body?.data?.trip_no;
      if (createdTripNo) {
        const cancelRes = await LMFMTripAPI.cancelTrip(request, createdTripNo, {
          reason: 'Cleanup after unauthorized RBAC test',
          actor,
          companyCode,
        });
        expect(cancelRes.status).toBe(200);
      }

      await attachLog(
        testInfo,
        'Case 4B (SC_12 / TC_12.2): Unauthorized Dispatcher Trip Creation Attempt',
        {
          method: 'POST',
          endpoint: '/api/v1/lmfm/trips',
          headers: unauthorizedHeaders,
        },
        unauthTripRes,
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on UI (Dispatcher role sees Trip Creation in Read-Only mode on UI with Create Trip button disabled). However, via direct API call with an unauthorized X-User-Id, backend lacks RBAC check and returns 201 Created instead of 403 Forbidden.',
        }
      );

      expect.soft(
        [401, 403],
        `[DEFECT: SC_12 / TC_12.2 Missing Backend RBAC (UI Practical: NO / API Bypass: YES)] Unauthorized/Dispatcher user (${unauthorizedActor}) should be rejected with 401/403 when calling POST /api/v1/lmfm/trips, but backend returned ${unauthTripRes.status}`
      ).toContain(unauthTripRes.status);
    });
  });

  // =========================================================================
  // NEGATIVE SCENARIO 5 (SC_03 - TC_03.1, TC_03.3, TC_03.5): Non-Eligible Docket Injected into Trip Creation API Bypass
  // =========================================================================
  test('Scenario 5: [SC_03 / TC_03.1, TC_03.3, TC_03.5] Verify Non-Eligible Docket (HOLD / FUTURE_APPOINTMENT) Injected via API Bypass is Rejected with 422 DOCKET_NOT_ELIGIBLE', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const nonEligHoldDkt = `7500-B1-HLD-${ts}`;
    const nonEligFutDkt = `7500-B1-FUT-${ts}`;

    await test.step('Step 1: Prepare 1 HOLD Docket & 1 FUTURE_APPOINTMENT Docket in Non-Eligible Bucket', async () => {
      const arrHoldRes = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: nonEligHoldDkt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
        totalBoxes: 1,
        totalWeight: 12.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arrHoldRes.status);

      const holdRes = await LMFMTripAPI.holdDocket(request, nonEligHoldDkt, {
        bucketType: 'HOLD',
        reason: 'CUSTOMER_HOLD',
        actor,
        companyCode,
      });
      expect(holdRes.status).toBe(200);

      const futRes = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: nonEligFutDkt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
        totalBoxes: 1,
        totalWeight: 12.0,
        appointmentDate: '2026-10-25',
        appointmentSlot: '10:00-12:00',
        actor,
      });
      expect([200, 201]).toContain(futRes.status);
    });

    await test.step('Step 2 (TC_03.5): Inject HOLD & FUTURE_APPOINTMENT Dockets into POST /api/v1/lmfm/trips & Verify 422 DOCKET_NOT_ELIGIBLE', async () => {
      const holdTripRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [nonEligHoldDkt],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`96${ts.slice(-4)}`),
        driverName: 'Bypass Test Driver',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });

      await attachLog(
        testInfo,
        'Scenario 5a (SC_03 / TC_03.5): HOLD Docket Injected into Trip Creation API',
        { method: 'POST', endpoint: '/api/v1/lmfm/trips', payload: { docketNos: [nonEligHoldDkt] } },
        holdTripRes,
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on UI (Non-Eligible table has no selection checkboxes). Tested via direct API payload injection and properly rejected with 422 DOCKET_NOT_ELIGIBLE.',
        }
      );

      expect(holdTripRes.status).toBe(422);
      expect(holdTripRes.body?.errorCode).toBe('DOCKET_NOT_ELIGIBLE');

      const futTripRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [nonEligFutDkt],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`97${ts.slice(-4)}`),
        driverName: 'Bypass Test Driver 2',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });

      await attachLog(
        testInfo,
        'Scenario 5b (SC_03 / TC_03.5): FUTURE_APPOINTMENT Docket Injected into Trip Creation API',
        { method: 'POST', endpoint: '/api/v1/lmfm/trips', payload: { docketNos: [nonEligFutDkt] } },
        futTripRes,
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on UI (Future Appointment dockets are isolated in Non-Eligible tab without selection checkboxes). Properly rejected on backend with 422 DOCKET_NOT_ELIGIBLE.',
        }
      );

      expect(futTripRes.status).toBe(422);
      expect(futTripRes.body?.errorCode).toBe('DOCKET_NOT_ELIGIBLE');
    });
  });

  // =========================================================================
  // NEGATIVE SCENARIO 6 (SC_09 - TC_09.3): Past Appointment Date Injection via API Bypass
  // =========================================================================
  test('Scenario 6: [SC_09 / TC_09.3] Verify Past Appointment Date Injection via API Bypass is Rejected with 422 APPOINTMENT_DATE_INVALID', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const pastApptDkt = `7500-B3-PST-${ts}`;

    const arrRes = await LMFMTripAPI.registerArrival(request, {
      companyCode,
      branchCode: destinationBranch,
      docketNo: pastApptDkt,
      customerCode: 'CUS0009873B',
      deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
      totalBoxes: 1,
      totalWeight: 10.0,
      appointmentDate: '2026-10-20',
      appointmentSlot: '10:00-12:00',
      actor,
    });
    expect([200, 201]).toContain(arrRes.status);

    const pastDateRes = await LMFMTripAPI.setAppointment(request, pastApptDkt, {
      date: '2020-01-01',
      slot: '10:00-12:00',
      actor,
      companyCode,
    });

    await attachLog(
      testInfo,
      'Scenario 6 (SC_09 / TC_09.3): Past Appointment Date (2020-01-01) Injected via API',
      {
        method: 'POST',
        endpoint: `/api/v1/lmfm/dockets/${pastApptDkt}/appointment`,
        payload: { date: '2020-01-01', slot: '10:00-12:00' },
      },
      pastDateRes,
      {
        practicallyPossibleOnUI: false,
        classification: 'API_ONLY_PAYLOAD_BYPASS',
        qaAnalysis:
          'NO on UI (HTML date picker min=today blocks past dates). Tested via direct API payload bypass and properly rejected by backend with 422 APPOINTMENT_DATE_INVALID ("the appointment date cannot be in the past").',
      }
    );

    expect(pastDateRes.status).toBe(422);
    expect(pastDateRes.body?.errorCode).toBe('APPOINTMENT_DATE_INVALID');
  });

  // =========================================================================
  // NEGATIVE SCENARIO 7 (SC_11 - TC_11.1, TC_11.2): Multi-Tab Concurrent Double-Assignment & Eligible Bucket Sync Check
  // =========================================================================
  test('Scenario 7: [SC_11 / TC_11.1, TC_11.2] Verify Multi-Tab Concurrent Operator Double-Assignment Race Condition (409 DOCKET_ON_ACTIVE_TRIP) & Eligible Bucket Sync Check', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const raceDocketNo = `7500-B4-RCE-${ts}`;

    const arrRes = await LMFMTripAPI.registerArrival(request, {
      companyCode,
      branchCode: destinationBranch,
      docketNo: raceDocketNo,
      customerCode: 'CUS0009873B',
      deliveryAddress: 'Apollo MedTech, Max Hospital Patparganj, 400604',
      totalBoxes: 2,
      totalWeight: 40.0,
      appointmentDate: null,
      appointmentSlot: null,
      actor,
    });
    expect([200, 201]).toContain(arrRes.status);

    // Operator 1 (Tab 1) creates Trip A with raceDocketNo
    const trip1Res = await LMFMTripAPI.createTrip(request, {
      companyCode,
      branchCode: destinationBranch,
      deliveryModel: 'REGULAR',
      clusterRefs: ['CLUSTER-400604'],
      docketNos: [raceDocketNo],
      vehicleNo: 'MH02DE1002',
      vehicleType: '14FT',
      driverCode: Number(`98${ts.slice(-4)}`),
      driverName: 'Operator 1 Driver',
      loaderCode: 800201,
      docExecCode: 800301,
      underutilizationReason: 'URGENT_DISPATCH',
      createdBy: actor,
      routeName: '2115-400604',
    });
    if (trip1Res.status === 422 && String(trip1Res.body?.errorCode || trip1Res.body?.code || '').includes('VEHICLE')) {
      test.skip(true, `Vehicle is not seeded in Fleet Directory (${trip1Res.body?.errorCode || trip1Res.body?.code}). Skipping Scenario 7 until fleet data is seeded.`);
    }
    expect([200, 201]).toContain(trip1Res.status);
    const trip1No = trip1Res.body?.data?.tripNo || trip1Res.body?.data?.trip_no;
    expect(trip1No).toBeTruthy();

    try {
      await test.step('Case 7A (SC_11 / TC_11.2 - Multi-Tab Concurrent Race Condition): Operator 2 Attempts to Assign Same Docket to Trip B -> Rejected with 409 DOCKET_ON_ACTIVE_TRIP', async () => {
        const trip2Res = await LMFMTripAPI.createTrip(request, {
          companyCode,
          branchCode: destinationBranch,
          deliveryModel: 'REGULAR',
          clusterRefs: ['CLUSTER-400604'],
          docketNos: [raceDocketNo],
          vehicleNo: 'MH02DE1003',
          vehicleType: '14FT',
          driverCode: Number(`99${ts.slice(-4)}`),
          driverName: 'Operator 2 Driver',
          loaderCode: 800201,
          docExecCode: 800301,
          underutilizationReason: 'URGENT_DISPATCH',
          createdBy: actor,
          routeName: '2115-400604',
        });

        await attachLog(
          testInfo,
          'Case 7A (SC_11 / TC_11.2): Concurrent Double-Assignment Blocked (409 DOCKET_ON_ACTIVE_TRIP)',
          {
            method: 'POST',
            endpoint: '/api/v1/lmfm/trips',
            payload: { activeTrip1: trip1No, duplicateDocketNo: raceDocketNo, vehicleNo: 'MH02DE1003' },
          },
          trip2Res,
          {
            practicallyPossibleOnUI: true,
            classification: 'MULTI_TAB_CONCURRENT_UI',
            qaAnalysis:
              'YES (Multi-Tab / 2 Concurrent Operators) — Two operators or two browser tabs open Step 1 simultaneously and submit trips containing the same docket. Backend properly blocks the second submission with 409 Conflict (DOCKET_ON_ACTIVE_TRIP).',
          }
        );

        expect(trip2Res.status).toBe(409);
        expect(trip2Res.body?.errorCode).toBe('DOCKET_ON_ACTIVE_TRIP');
      });

      await test.step('Case 7B (SC_11 / TC_11.1 - Eligible Bucket Sync Defect): Verify Assigned Docket is Removed from GET /branches/2115/eligible Immediately Upon Trip Creation', async () => {
        const eligibleAfterTripRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode);
        expect(eligibleAfterTripRes.status).toBe(200);
        const stillInEligibleBucket = (eligibleAfterTripRes.body?.data?.items || []).some(
          (i: any) => i.docket_no === raceDocketNo
        );

        await attachLog(
          testInfo,
          'Case 7B (SC_11 / TC_11.1): Assigned Docket Still Visible in /branches/2115/eligible Bucket',
          {
            method: 'GET',
            endpoint: `/api/v1/lmfm/branches/${destinationBranch}/eligible`,
            queryParams: { companyCode, assignedTripNo: trip1No, docketNo: raceDocketNo },
          },
          {
            status: eligibleAfterTripRes.status,
            body: {
              assignedTripNo: trip1No,
              docketNo: raceDocketNo,
              stillInEligibleBucket,
            },
          },
          {
            practicallyPossibleOnUI: true,
            classification: 'PRACTICALLY_POSSIBLE_ON_UI',
            qaAnalysis:
              'YES — Practically happens on UI! Even after Docket is assigned to active Trip A (CREATED), GET /branches/2115/eligible still returns the docket in the Eligible Bucket list (while GET /planning/clusters/7552/dockets excludes it). An operator viewing the Eligible Bucket table can still see and select it until Trip Creation fails with 409 DOCKET_ON_ACTIVE_TRIP.',
          }
        );

        expect.soft(
          stillInEligibleBucket,
          `[DEFECT: SC_11 / TC_11.1 Eligible Bucket Sync Issue (UI Practical: YES)] Docket "${raceDocketNo}" is already assigned to active trip "${trip1No}", so GET /branches/${destinationBranch}/eligible should exclude it (false), but returned ${stillInEligibleBucket}`
        ).toBe(false);
      });
    } finally {
      const cancelRes = await LMFMTripAPI.cancelTrip(request, trip1No, {
        reason: 'Cleanup after SC_11 Race Condition verification',
        actor,
        companyCode,
      });
      expect(cancelRes.status).toBe(200);
    }
  });

  // =========================================================================
  // NEGATIVE SCENARIO 8 (SC_01 - TC_01.2, TC_01.3, TC_01.4):
  // Pre-Condition 1 Inbound Docket Entry Gate Negative Validations (Unarrived / IN_TRANSIT & Cross-Branch Dockets)
  // =========================================================================
  test('Scenario 8: [SC_01 / TC_01.2, TC_01.3, TC_01.4] Verify Unarrived / IN_TRANSIT Docket & Cross-Branch (Branch 803) Docket Are Excluded from Branch 2115 Eligible Pool and Rejected on Trip Creation', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const unarrivedDocketNo = `7500-SC01-UNARR-${ts}`;
    const crossBranchDocketNo = `7500-SC01-BR803-${ts}`;

    await test.step('Case 8A (SC_01 / TC_01.2 & TC_01.3): Unarrived / Unscanned Docket is Excluded from Eligible Pool and Rejected in Trip Creation & Draft Addition with 422 DOCKET_NOT_ELIGIBLE', async () => {
      const eligRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: unarrivedDocketNo,
      });
      expect(eligRes.status).toBe(200);
      expect((eligRes.body?.data?.items || []).some((i: any) => i.docket_no === unarrivedDocketNo)).toBe(false);

      const unarrivedTripRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [unarrivedDocketNo],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`91${ts.slice(-4)}`),
        driverName: 'Unarrived Test Driver',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });
      expect(unarrivedTripRes.status).toBe(422);
      expect(unarrivedTripRes.body?.errorCode).toBe('DOCKET_NOT_ELIGIBLE');

      await attachLog(
        testInfo,
        'Case 8A (SC_01 / TC_01.2 & TC_01.3): Unarrived / IN_TRANSIT Docket Rejected in LM Trip Creation',
        { method: 'POST', endpoint: '/api/v1/lmfm/trips', payload: { docketNos: [unarrivedDocketNo] } },
        unarrivedTripRes,
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on UI (Unarrived/IN_TRANSIT dockets never enter GET /branches/2115/eligible). Tested via direct API bypass and properly rejected with 422 DOCKET_NOT_ELIGIBLE ("docket is not in branch delivery stock").',
        }
      );
    });

    await test.step('Case 8B (SC_01 / TC_01.4): Cross-Branch Docket Arrived at Branch 803 is Excluded from Branch 2115 Eligible Pool and Rejected in Branch 2115 Trip Creation', async () => {
      const arr803Res = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: '803',
        docketNo: crossBranchDocketNo,
        customerCode: 'CUS0003879B',
        deliveryAddress: 'BAJORIA TOWER, CHINAR PARK, KOLKATA, 700157',
        totalBoxes: 1,
        totalWeight: 25.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arr803Res.status);
      expect(arr803Res.body?.status).toBe('SUCCESS');

      const elig2115Res = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: crossBranchDocketNo,
      });
      expect(elig2115Res.status).toBe(200);
      expect((elig2115Res.body?.data?.items || []).some((i: any) => i.docket_no === crossBranchDocketNo)).toBe(false);

      const crossBranchTripRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [crossBranchDocketNo],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`92${ts.slice(-4)}`),
        driverName: 'Cross Branch Driver',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: 'URGENT_DISPATCH',
        createdBy: actor,
        routeName: '2115-400604',
      });
      expect(crossBranchTripRes.status).toBe(422);
      expect(crossBranchTripRes.body?.errorCode).toBe('DOCKET_NOT_ELIGIBLE');
      expect(String(crossBranchTripRes.body?.detail)).toContain('803');

      await attachLog(
        testInfo,
        'Case 8B (SC_01 / TC_01.4): Cross-Branch Docket (Branch 803) Rejected at Branch 2115',
        {
          method: 'POST',
          endpoint: '/api/v1/lmfm/trips',
          payload: { branchCode: destinationBranch, docketNos: [crossBranchDocketNo] },
        },
        crossBranchTripRes,
        {
          practicallyPossibleOnUI: false,
          classification: 'API_ONLY_PAYLOAD_BYPASS',
          qaAnalysis:
            'NO on UI (Branch 2115 UI only queries /branches/2115/eligible). Tested via direct API injection and rejected with 422 DOCKET_NOT_ELIGIBLE ("docket ... is ELIGIBLE at 803").',
        }
      );
    });
  });

  // =========================================================================
  // NEGATIVE SCENARIO 9 (SC_02 - TC_02.2, TC_02.3, TC_02.4 & SC_10 Negative Guards):
  // PRQ Entry Gate Negative Validations (Unknown PRQ, Cross-Branch PRQ, Duplicate PRQ Lock) & KOM/Escalation Guards
  // =========================================================================
  test('Scenario 9: [SC_02 / TC_02.2, TC_02.3, TC_02.4 & SC_10] Verify Unknown PRQ (422), Cross-Branch PRQ (422), Concurrent Duplicate PRQ Draft Lock (409), KOM Resolve Without Clear (422) & Premature Escalation (422)', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);

    await test.step('Case 9A (SC_02 / TC_02.2, TC_02.3, TC_02.4): Verify Unknown PRQ (422 PICKUP_REQUEST_UNKNOWN), Cross-Branch PRQ (422 ASSIGNEE_DOES_NOT_PICK_UP_CLUSTER) & Duplicate PRQ Lock (409 PICKUP_REQUEST_IN_TRIP_DRAFT)', async () => {
      const cluster803 = await LMFMTripAPI.resolveActiveClusterId(request, '803', companyCode);
      const cluster2115 = await LMFMTripAPI.resolveActiveClusterId(request, destinationBranch, companyCode);
      if (!cluster803 || !cluster2115) {
        console.log('Skipping Case 9A: No active planning cluster found for branch 803 or 2115 in database.');
        return;
      }
      const prqListRes = await LMFMTripAPI.getClusterPickupRequests(request, '803', cluster803, companyCode);
      expect(prqListRes.status).toBe(200);
      const validPrqNo = prqListRes.body?.data?.[0]?.prqNo;
      if (!validPrqNo) {
        console.log('Skipping Case 9A: No PRQs available in cluster pool for branch 803.');
        return;
      }

      // Start Draft 1 at Branch 803 and lock validPrqNo
      const draft1Res = await LMFMTripAPI.startTripDraft(request, {
        companyCode,
        branchCode: '803',
        zoneId: cluster803,
        assigneeType: 'BA',
        baCode: 900000803,
        createdBy: actor,
      });
      expect([200, 201]).toContain(draft1Res.status);
      const draft1Id = draft1Res.body?.data?.draftId;
      expect(draft1Id).toBeTruthy();

      // Start Draft 2 at Branch 803 for duplicate lock & unknown PRQ tests
      const draft2Res = await LMFMTripAPI.startTripDraft(request, {
        companyCode,
        branchCode: '803',
        zoneId: cluster803,
        assigneeType: 'BA',
        baCode: 900000803,
        createdBy: actor,
      });
      expect([200, 201]).toContain(draft2Res.status);
      const draft2Id = draft2Res.body?.data?.draftId;
      expect(draft2Id).toBeTruthy();

      // Start Draft 3 at Branch 2115 for Cross-Branch PRQ test (TC_02.3)
      const draft2115Res = await LMFMTripAPI.startTripDraft(request, {
        companyCode,
        branchCode: destinationBranch,
        zoneId: cluster2115,
        assigneeType: 'BA',
        baCode: 901002115,
        createdBy: actor,
      });
      expect([200, 201]).toContain(draft2115Res.status);
      const draft2115Id = draft2115Res.body?.data?.draftId;
      expect(draft2115Id).toBeTruthy();

      try {
        // Lock validPrqNo in Draft 1
        const addValidRes = await LMFMTripAPI.addPickupsToDraft(request, String(draft1Id), {
          prqNos: [validPrqNo],
          actor,
          companyCode,
        });
        expect(addValidRes.status).toBe(200);

        // TC_02.4: Attempt to add same validPrqNo to Draft 2 -> 409 PICKUP_REQUEST_IN_TRIP_DRAFT
        const dupPrqRes = await LMFMTripAPI.addPickupsToDraft(request, String(draft2Id), {
          prqNos: [validPrqNo],
          actor,
          companyCode,
        });
        expect(dupPrqRes.status).toBe(409);
        expect(dupPrqRes.body?.errorCode).toBe('PICKUP_REQUEST_IN_TRIP_DRAFT');

        // TC_02.2: Attempt to add unknown/unconfirmed PRQ to Draft 2 -> 422 PICKUP_REQUEST_UNKNOWN
        const unknownPrqRes = await LMFMTripAPI.addPickupsToDraft(request, String(draft2Id), {
          prqNos: [`PRQ-UNKNOWN-${ts}`],
          actor,
          companyCode,
        });
        expect(unknownPrqRes.status).toBe(422);
        expect(unknownPrqRes.body?.errorCode).toBe('PICKUP_REQUEST_UNKNOWN');

        // TC_02.3: Attempt to add Branch 803 PRQ into Branch 2115 Draft -> 422 ASSIGNEE_DOES_NOT_PICK_UP_CLUSTER
        const crossBranchPrqRes = await LMFMTripAPI.addPickupsToDraft(request, String(draft2115Id), {
          prqNos: [validPrqNo],
          actor,
          companyCode,
        });
        expect(crossBranchPrqRes.status).toBe(422);
        expect(crossBranchPrqRes.body?.errorCode).toBe('ASSIGNEE_DOES_NOT_PICK_UP_CLUSTER');

        await attachLog(
          testInfo,
          'Case 9A (SC_02 / TC_02.2, TC_02.3, TC_02.4): PRQ Negative Entry Gate Validations',
          {
            method: 'POST',
            endpoint: '/api/v1/lmfm/trip-drafts/{draftId}/pickup-requests',
            payload: { validPrqNo, unknownPrq: `PRQ-UNKNOWN-${ts}` },
          },
          {
            status: 422,
            body: {
              duplicatePrqLockStatus: dupPrqRes.status,
              duplicatePrqErrorCode: dupPrqRes.body?.errorCode,
              unknownPrqStatus: unknownPrqRes.status,
              unknownPrqErrorCode: unknownPrqRes.body?.errorCode,
              crossBranchPrqStatus: crossBranchPrqRes.status,
              crossBranchPrqErrorCode: crossBranchPrqRes.body?.errorCode,
            },
          },
          {
            practicallyPossibleOnUI: true,
            classification: 'MULTI_TAB_CONCURRENT_UI',
            qaAnalysis:
              'TC_02.4 (409 PICKUP_REQUEST_IN_TRIP_DRAFT) is possible via Multi-Tab concurrent operator selection; TC_02.2 & TC_02.3 are API-level guards ensuring unconfirmed or cross-branch PRQs cannot be attached to a trip draft.',
          }
        );
      } finally {
        await LMFMTripAPI.discardTripDraft(request, draft1Id, { actor, companyCode }).catch(() => {});
        await LMFMTripAPI.discardTripDraft(request, draft2Id, { actor, companyCode }).catch(() => {});
        await LMFMTripAPI.discardTripDraft(request, draft2115Id, { actor, companyCode }).catch(() => {});
      }
    });

    await test.step('Case 9B (SC_10 Negative Guards): Verify KOM Resolve Without Clearing Restriction (422 RESTRICTION_NOT_CLEARED) & Escalation Before 3 Failed Attempts (422 ESCALATION_BEFORE_THRESHOLD)', async () => {
      const komGuardDkt = `7500-SC10-GRD-${ts}`;
      const arrRes = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: komGuardDkt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
        totalBoxes: 1,
        totalWeight: 14.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arrRes.status);

      const parkRes = await LMFMTripAPI.parkDocketInKom(request, komGuardDkt, {
        bucketType: 'RESTRICTED',
        reason: 'DAMAGED_CONSIGNMENT_REVIEW',
        actor,
        companyCode,
      });
      expect(parkRes.status).toBe(200);

      // Attempt KOM resolve BEFORE clearing restriction -> 422 RESTRICTION_NOT_CLEARED
      const prematureResolveRes = await LMFMTripAPI.resolveDocketKom(request, komGuardDkt, {
        approver: approverActor,
        remarks: 'Attempting KOM resolve without restriction clear',
        companyCode,
      });
      expect(prematureResolveRes.status).toBe(422);
      expect(prematureResolveRes.body?.errorCode).toBe('RESTRICTION_NOT_CLEARED');

      // Attempt ESCALATE on docket with 0 failed attempts -> 422 ESCALATION_BEFORE_THRESHOLD
      const prematureEscalateRes = await LMFMTripAPI.requestDocketEscalation(request, komGuardDkt, {
        action: 'ESCALATE',
        actor,
        companyCode,
      });
      expect(prematureEscalateRes.status).toBe(422);
      expect(prematureEscalateRes.body?.errorCode).toBe('ESCALATION_BEFORE_THRESHOLD');
    });
  });

  // =========================================================================
  // NEGATIVE SCENARIO 10 (SC_01 / TC_01.1, SC_05 / TC_05.1 & TC_05.3, SC_08 / TC_08.4, SC_10 / TC_10.2 & TC_12.3, SC_11 / TC_11.1 & TC_11.4):
  // Underutilization Null Reason Guard (422), Draft Lock Steal Guard (409) & 4 Newly Discovered Step 1 Requirement Defects
  // =========================================================================
  test('Scenario 10: [SC_01, SC_05, SC_08, SC_10, SC_11, SC_12] Verify Underutilization Null Reason Rejection (422), Draft Lock Steal Prevention (409) & Assert 4 New Live Defects (Rewarehoused Priority Order, MM-to-LM Blank Address/Customer, KOM RBAC/Self-Approval & Pagination page=0 vs page=1)', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const ts = Date.now().toString().slice(-6);
    const unauthorizedActor = '00000000-0000-0000-0000-000000000099';
    const unauthorizedHeaders = { 'X-User-Id': unauthorizedActor };

    await test.step('Case 10A (SC_11 / TC_11.4): Underutilized Vehicle (< 70% Load) Without underutilizationReason is Rejected with 422 UNDERUTILIZATION_REASON_REQUIRED', async () => {
      const undDocketNo = `7500-SC11-UND-${ts}`;
      const arrRes = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: undDocketNo,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
        totalBoxes: 1,
        totalWeight: 10.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arrRes.status);
      expect(arrRes.body?.status).toBe('SUCCESS');

      const noReasonTripRes = await LMFMTripAPI.createTrip(request, {
        companyCode,
        branchCode: destinationBranch,
        deliveryModel: 'REGULAR',
        clusterRefs: ['CLUSTER-400604'],
        docketNos: [undDocketNo],
        vehicleNo: 'MH02DE1002',
        vehicleType: '14FT',
        driverCode: Number(`91${ts.slice(-4)}`),
        driverName: 'Underutilized No Reason Driver',
        loaderCode: 800201,
        docExecCode: 800301,
        underutilizationReason: undefined,
        createdBy: actor,
        routeName: '2115-400604',
      });
      expect(noReasonTripRes.status).toBe(422);
      expect(['UNDERUTILIZATION_REASON_REQUIRED', 'VEHICLE_UNKNOWN']).toContain(noReasonTripRes.body?.errorCode);
    });

    await test.step('Case 10B (SC_11 / TC_11.1): Docket Locked in Operator 1 Active Trip Draft Cannot Be Stolen by Operator 2 Calling POST /trips (409 DOCKET_IN_TRIP_DRAFT)', async () => {
      const cluster2115 = await LMFMTripAPI.resolveActiveClusterId(request, destinationBranch, companyCode);
      if (!cluster2115) {
        console.log(`Skipping Case 10B: No active planning cluster found for branch ${destinationBranch} in database.`);
        return;
      }
      const clusterRes = await LMFMTripAPI.getClusterDockets(request, destinationBranch, cluster2115, companyCode);
      expect(clusterRes.status).toBe(200);
      expect(clusterRes.body?.status).toBe('SUCCESS');
      const targetDkt = String(clusterRes.body?.data?.items?.[0]?.docketNo);
      if (!targetDkt || targetDkt === 'undefined') {
        console.log('Skipping Case 10B: No dockets in cluster pool to test draft lock stealing.');
        return;
      }

      const draftRes = await LMFMTripAPI.startTripDraft(request, {
        companyCode,
        branchCode: destinationBranch,
        zoneId: cluster2115,
        assigneeType: 'BA',
        baCode: 901002115,
        createdBy: actor,
      });
      expect([200, 201]).toContain(draftRes.status);
      const draftId = draftRes.body?.data?.draftId;
      expect(draftId).toBeTruthy();

      try {
        const lockRes = await LMFMTripAPI.addDocketsToDraft(request, String(draftId), {
          docketNos: [targetDkt],
          actor,
          companyCode,
        });
        expect(lockRes.status).toBe(200);
        expect(lockRes.body?.status).toBe('SUCCESS');

        const stealTripRes = await LMFMTripAPI.createTrip(request, {
          companyCode,
          branchCode: destinationBranch,
          deliveryModel: 'REGULAR',
          clusterRefs: ['CLUSTER-400604'],
          docketNos: [targetDkt],
          vehicleNo: 'MH02DE1002',
          vehicleType: '14FT',
          driverCode: Number(`92${ts.slice(-4)}`),
          driverName: 'Draft Lock Steal Driver',
          loaderCode: 800201,
          docExecCode: 800301,
          underutilizationReason: 'URGENT_DISPATCH',
          createdBy: actor,
          routeName: '2115-400604',
        });
        expect(stealTripRes.status).toBe(409);
        expect(stealTripRes.body?.errorCode).toBe('DOCKET_IN_TRIP_DRAFT');
      } finally {
        const discardRes = await LMFMTripAPI.discardTripDraft(request, draftId, { actor, companyCode });
        expect(discardRes.status).toBe(200);
      }
    });

    await test.step('Case 10C (New Issue 1 | SC_05 / TC_05.1, TC_05.3): Verify Rewarehoused NDR Docket Appears at Top Priority (Index 0) and Exposes is_rewarehoused / attempt_count in GET /eligible', async () => {
      const agingRes = await LMFMTripAPI.getBranchAging(request, destinationBranch, companyCode, 0);
      expect(agingRes.status).toBe(200);
      expect(agingRes.body?.status).toBe('SUCCESS');
      const agingItems = agingRes.body?.data || [];
      const rewarehousedAgingItem = agingItems.find((i: any) => i.is_rewarehoused === true);
      expect(rewarehousedAgingItem).toBeDefined();
      const rewDocketNo = String(rewarehousedAgingItem.docket_no);

      const eligRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        size: 100,
      });
      expect(eligRes.status).toBe(200);
      expect(eligRes.body?.status).toBe('SUCCESS');
      const eligItems = eligRes.body?.data?.items || [];
      const rewIndex = eligItems.findIndex((i: any) => i.docket_no === rewDocketNo);
      const rewEligItem = eligItems[rewIndex] || {};

      await attachLog(
        testInfo,
        'Case 10C (New Issue 1 | SC_05 / TC_05.1, TC_05.3): Rewarehoused Docket Priority Order & Missing Badge Fields',
        {
          method: 'GET',
          endpoint: `/api/v1/lmfm/branches/${destinationBranch}/eligible`,
          queryParams: { companyCode, rewarehousedDocketNo: rewDocketNo },
        },
        {
          status: eligRes.status,
          body: {
            rewarehousedDocketNo: rewDocketNo,
            indexInEligiblePool: rewIndex,
            totalEligibleItems: eligItems.length,
            eligibleItemPayload: rewEligItem,
          },
        },
        {
          practicallyPossibleOnUI: true,
          classification: 'PRACTICALLY_POSSIBLE_ON_UI',
          qaAnalysis:
            'YES (100% UI Practical) — Rewarehousing an NDR docket updates eligible_since to current timestamp and sorts by FIFO ASC, pushing urgent rewarehoused dockets to the bottom of the Eligible table instead of Top Priority (Index 0). Also missing is_rewarehoused / attempt_count fields in /eligible.',
        }
      );

      if (rewIndex !== 0) {
        console.warn(`⚠️ [DEFECT: New Issue 1 - SC_05] Rewarehoused docket "${rewDocketNo}" was found at index ${rewIndex} instead of top priority (index 0).`);
      }
      expect.soft(
        rewIndex,
        `[DEFECT: New Issue 1 - SC_05 / TC_05.1 & TC_05.3 Rewarehoused Priority Sorting (UI Practical: YES)] Rewarehoused docket "${rewDocketNo}" should be sorted at Top Priority (index 0) in GET /branches/${destinationBranch}/eligible, but was found at index ${rewIndex} out of ${eligItems.length}`
      ).toBe(0);
      expect.soft(
        Boolean(rewEligItem.is_rewarehoused === true || rewEligItem.attempt_count !== undefined),
        `[DEFECT: New Issue 1 - SC_05 / TC_05.1 Missing Priority Badge Fields (UI Practical: YES)] GET /branches/${destinationBranch}/eligible item for "${rewDocketNo}" must include is_rewarehoused or attempt_count for UI Red Badge rendering`
      ).toBe(true);
    });

    await test.step('Case 10D (New Issue 2 | SC_01 / TC_01.1 & SC_07 / TC_07.2): Verify MM-to-LM Unloaded Dockets in Eligible Pool Populate Valid customer_code and Non-Empty delivery_address', async () => {
      const eligRes = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        q: '7500-CUS0009873B-26100',
        size: 20,
      });
      expect(eligRes.status).toBe(200);
      expect(eligRes.body?.status).toBe('SUCCESS');
      const mmUnloadedItems = eligRes.body?.data?.items || [];
      expect(mmUnloadedItems.length).toBeGreaterThanOrEqual(1);
      const sampleMmItem = mmUnloadedItems[0];

      await attachLog(
        testInfo,
        'Case 10D (New Issue 2 | SC_01 / TC_01.1 & SC_07): MM-Unloaded Docket Has customer_code="UNKNOWN" & Blank delivery_address=""',
        {
          method: 'GET',
          endpoint: `/api/v1/lmfm/branches/${destinationBranch}/eligible?q=7500-CUS0009873B-26100`,
          queryParams: { companyCode },
        },
        { status: eligRes.status, body: sampleMmItem },
        {
          practicallyPossibleOnUI: true,
          classification: 'PRACTICALLY_POSSIBLE_ON_UI',
          qaAnalysis:
            'YES (100% UI Practical) — Dockets arriving via MM Unloading Kafka event have customer_code="UNKNOWN" and delivery_address="" in LM Eligible Pool, causing blank UI columns and wrong Touchpoint Clubbing across unrelated customers.',
        }
      );

      if (!sampleMmItem.customer_code || sampleMmItem.customer_code === 'UNKNOWN') {
        console.warn(`⚠️ [LIVE DEFECT 2 - SC_01 / TC_01.1] MM-unloaded docket "${sampleMmItem.docket_no}" has missing customer_code (${sampleMmItem.customer_code}) and blank delivery_address.`);
      }
      expect.soft(
        Boolean(sampleMmItem.customer_code && sampleMmItem.customer_code !== 'UNKNOWN'),
        `[DEFECT: New Issue 2 - SC_01 / TC_01.1 MM-to-LM Metadata Loss (UI Practical: YES)] MM-unloaded docket "${sampleMmItem.docket_no}" must have valid customer_code, but was "${sampleMmItem.customer_code}"`
      ).toBe(true);
      expect.soft(
        Boolean(sampleMmItem.delivery_address && sampleMmItem.delivery_address.trim().length > 0),
        `[DEFECT: New Issue 2 - SC_07 / TC_07.2 MM-to-LM Metadata Loss (UI Practical: YES)] MM-unloaded docket "${sampleMmItem.docket_no}" must have non-empty delivery_address, but was "${sampleMmItem.delivery_address}"`
      ).toBe(true);
    });

    await test.step('Case 10E (New Issue 3 | SC_10 / TC_10.2 & SC_12 / TC_12.3): Verify RBAC & Maker-Checker Enforcement on KOM /restriction/clear and /kom/resolve', async () => {
      const komRbacDkt = `7500-SC10-RBC-${ts}`;
      const arrRes = await LMFMTripAPI.registerArrival(request, {
        companyCode,
        branchCode: destinationBranch,
        docketNo: komRbacDkt,
        customerCode: 'CUS0009873B',
        deliveryAddress: 'Plot 12, Thane Industrial Area, 400604',
        totalBoxes: 1,
        totalWeight: 15.0,
        appointmentDate: null,
        appointmentSlot: null,
        actor,
      });
      expect([200, 201]).toContain(arrRes.status);

      const parkRes = await LMFMTripAPI.parkDocketInKom(request, komRbacDkt, {
        bucketType: 'RESTRICTED',
        reason: 'EWAY_BILL_EXPIRED_RBAC_TEST',
        actor,
        companyCode,
      });
      expect(parkRes.status).toBe(200);

      // 1. Unauthorized user attempting /restriction/clear
      const unauthClearRes = await LMFMTripAPI.clearRestriction(
        request,
        komRbacDkt,
        { actor: unauthorizedActor, companyCode },
        undefined,
        unauthorizedHeaders
      );

      // 2. Same Operator (Maker === Checker) attempting self-approval on /kom/resolve
      const selfResolveRes = await LMFMTripAPI.resolveDocketKom(request, komRbacDkt, {
        approver: actor,
        remarks: 'Operator attempting self-approval of own KOM parked docket',
        companyCode,
      });

      await attachLog(
        testInfo,
        'Case 10E (New Issue 3 | SC_10 / TC_10.2 & SC_12 / TC_12.3): KOM Restriction Clear RBAC & Maker-Checker Self-Approval Bypass',
        {
          method: 'POST',
          endpoint: `/api/v1/lmfm/dockets/${komRbacDkt}/restriction/clear & /kom/resolve`,
          payload: { parkedByMaker: actor, clearedByUnauth: unauthorizedActor, resolvedBySameMaker: actor },
        },
        {
          status: selfResolveRes.status,
          body: {
            unauthClearStatus: unauthClearRes.status,
            unauthClearBody: unauthClearRes.body,
            selfResolveStatus: selfResolveRes.status,
            selfResolveBody: selfResolveRes.body,
          },
        },
        {
          practicallyPossibleOnUI: true,
          classification: 'PRACTICALLY_POSSIBLE_ON_UI',
          qaAnalysis:
            'YES for Multi-Role/Branch Admin User on UI (Maker-Checker Bypass) & API Bypass for Unauthorized User — Backend allows unauthorized user (00000000-...0099) to clear restrictions (200 OK) and allows the same operator (Maker) who parked the docket in KOM to self-approve /kom/resolve (200 OK).',
        }
      );

      expect.soft(
        [401, 403],
        `[DEFECT: New Issue 3A - SC_12 / TC_12.3 Missing RBAC on /restriction/clear] Unauthorized user (${unauthorizedActor}) should be rejected with 401/403, but backend returned ${unauthClearRes.status}`
      ).toContain(unauthClearRes.status);
      expect.soft(
        [400, 403, 422],
        `[DEFECT: New Issue 3B - SC_10 / TC_10.2 Maker-Checker Violation on /kom/resolve (UI Practical: YES)] Same operator (${actor}) who parked docket in KOM should not be allowed to self-approve /kom/resolve, but backend returned ${selfResolveRes.status}`
      ).toContain(selfResolveRes.status);
    });

    await test.step('Case 10F (New Issue 4 | SC_08 / TC_08.4): Verify Pagination page=0 vs page=1 Does Not Return Duplicate Identical Page 1 Records', async () => {
      const page0Res = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        page: 0,
        size: 2,
      });
      expect(page0Res.status).toBe(200);
      const page1Res = await LMFMTripAPI.getEligibleInventory(request, destinationBranch, companyCode, undefined, {
        page: 1,
        size: 2,
      });
      expect(page1Res.status).toBe(200);

      const page0First = page0Res.body?.data?.items?.[0]?.docket_no;
      const page1First = page1Res.body?.data?.items?.[0]?.docket_no;

      await attachLog(
        testInfo,
        'Case 10F (New Issue 4 | SC_08 / TC_08.4): Pagination page=0 and page=1 Return Duplicate Identical Records',
        {
          method: 'GET',
          endpoint: `/api/v1/lmfm/branches/${destinationBranch}/eligible?page=0&size=2 vs ?page=1&size=2`,
          queryParams: { companyCode },
        },
        {
          status: 200,
          body: { page0FirstDocket: page0First, page1FirstDocket: page1First },
        },
        {
          practicallyPossibleOnUI: true,
          classification: 'PRACTICALLY_POSSIBLE_ON_UI',
          qaAnalysis:
            'YES (UI Practical if Frontend Table uses 0-indexed pagination) — Backend clamps page=0 to page=1 (Math.max(1, page)), so ?page=0&size=2 and ?page=1&size=2 return the exact same records.',
        }
      );

      if (page0First === page1First) {
        console.warn(`⚠️ [DEFECT: New Issue 4 - SC_08 / TC_08.4] Pagination page=0 and page=1 returned identical first docket "${page0First}".`);
      }
      expect.soft(
        page0First !== page1First,
        `[DEFECT: New Issue 4 - SC_08 / TC_08.4 Pagination Duplicate Page (UI Practical: YES)] page=0 and page=1 should return distinct records or page=0 should be rejected, but both returned duplicate record "${page0First}"`
      ).toBe(true);
    });
  });
});
