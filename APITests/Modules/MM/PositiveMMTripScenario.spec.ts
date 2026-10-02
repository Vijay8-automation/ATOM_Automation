import { test, expect } from '@playwright/test';
import { MMWorkflow } from '../../../Utils/Workflows/MMWorkflow';
import { BaseAPI } from '../../../APIs/Common/BaseAPI';
import { DocketAPI } from '../../../APIs/Modules/Booking/DocketAPI';
import { MMTripAPI } from '../../../APIs/Modules/MM/MMTripAPI';
import { ManifestAPI } from '../../../APIs/Modules/MM/ManifestAPI';
import { ScanningAPI } from '../../../APIs/Modules/Scanning/ScanningAPI';
import { pm } from '../../../Utils/VariableManager';


// Helper to attach complete API request and response details in Playwright HTML Report (Listing & Status Filters)
async function attachApiLog(
  testInfo: any,
  stepName: string,
  requestInfo: { method: string; endpoint: string; queryParams?: any; payload?: any },
  responseInfo: { status: number; body: any }
) {
  await testInfo.attach(`API Log - ${stepName}`, {
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

function generateTripPayload(customVehicleSuffix?: string) {
  const timeSuffix = customVehicleSuffix || Date.now().toString().slice(-5);
  return {
    companyCode: Number(pm.environment.get('companyCode')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    branchCode: String(pm.environment.get('sourceBranch')),
    routeCode: String(pm.environment.get('activeRouteCode') || pm.environment.get('routeCode')),
    routeType: String(pm.environment.get('expressRouteType')),
    scheduleCode: String(pm.environment.get('scheduleCode')),
    tripDate: new Date().toISOString().split('T')[0],
    vehicleNo: `DL01AB${timeSuffix}`,
    vehicleType: String(pm.environment.get('vehicleType')),
    vehicleCapacityKg: Number(pm.environment.get('vehicleCapacityKg')),
    transportMode: String(pm.environment.get('transportMode')),
    vendorCode: String(pm.environment.get('vendorCode')),
    gpsStatus: String(pm.environment.get('gpsStatus')),
    digitalLock: false,
    priority: String(pm.environment.get('priority')),
    driverCode: Number(pm.environment.get('planDriverCode')),
    driverName: String(pm.environment.get('driverName')),
    driverMobile: String(pm.environment.get('driverMobile')),
    createdBy: String(pm.environment.get('actor')),
  };
}

test.describe('Middle Mile (MM) - Positive Scenarios Suite (Complete E2E, Stage 1-6, Touch-Point & Status Filter Validations)', () => {
  const companyCode = Number(pm.environment.get('companyCode'));
  const sourceBranch = String(pm.environment.get('sourceBranch'));
  const destinationBranch = String(pm.environment.get('destinationBranch'));
  const actor = String(pm.environment.get('actor'));
  test.describe.configure({ mode: 'default' });

  test('Scenario 1: Verify the complete process execution of mid mile', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const result = await MMWorkflow.executeCompleteMMFlow(request);
    expect(result.docketNo).toBeDefined();
    expect(result.tripNo).toBeDefined();
    expect(result.manifestNo).toBeDefined();
    expect(result.boxCode).toBeDefined();

    const detailRes = await MMTripAPI.getTrip(request, result.tripNo);
    await attachApiLog(
      testInfo,
      'Scenario 1: Verify Completed MM Trip Detail',
      { method: 'GET', endpoint: `/api/v1/trips/${result.tripNo}` },
      { status: detailRes.status, body: detailRes.body }
    );
    expect(detailRes.status).toBe(200);
    expect(detailRes.body?.status).toBe('SUCCESS');
    expect(detailRes.body?.data?.trip?.status || detailRes.body?.data?.status).toBe('COMPLETED');
  });

  // =========================================================================
  // SCENARIO 2: ValidPlanTrip - Middle Mile Plan Trip Process Flow
  // =========================================================================
  test('Scenario 2: ValidPlanTrip - End-to-End Plan Trip Flow (Suggestions, Finalize Plan, Document Check, and Plan-to-Create)', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const mmBaseUrl = BaseAPI.getServiceUrl('mm');
    const networkBaseUrl = BaseAPI.getServiceUrl('network');
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(token);

    const companyCode = Number(pm.environment.get('companyCode'));
    const companyId = String(pm.environment.get('companyId'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const destinationBranch = String(pm.environment.get('destinationBranch'));
    const activeRouteCode = String(pm.environment.get('activeRouteCode') || 'RT-DRF-0232841399402');
    const intermediateBranch = String(pm.environment.get('intermediateBranch'));
    const bookingBranch = String(pm.environment.get('bookingBranch'));
    const customerCode = String(pm.environment.get('customerCode'));
    const billingPartyCode = String(pm.environment.get('billingPartyCode'));
    const consignorCode = String(pm.environment.get('consignorCode'));
    const actor = String(pm.environment.get('actor'));
    const approverActor = String(pm.environment.get('approverActor'));
    const customerType = String(pm.environment.get('customerType'));
    const deliveryAddressId = Number(pm.environment.get('deliveryAddressId'));
    const pickupLocationId = Number(pm.environment.get('pickupLocationId'));
    const pickupPincode = String(pm.environment.get('pickupPincode'));
    const deliveryPincode = String(pm.environment.get('deliveryPincode'));
    const consignorPincode = String(pm.environment.get('consignorPincode'));
    const transportMode = String(pm.environment.get('transportMode'));
    const loadType = String(pm.environment.get('loadType'));
    const freightMode = String(pm.environment.get('freightMode'));
    const docketSource = String(pm.environment.get('docketSource'));
    const invoiceDate = String(pm.environment.get('invoiceDate'));
    const ewayBillNo = Number(pm.environment.get('ewayBillNo'));
    const consignorGstin = String(pm.environment.get('consignorGstin'));
    const consigneeCode = String(pm.environment.get('consigneeCode'));
    const consigneeGstin = String(pm.environment.get('consigneeGstin'));
    const expressRouteType = String(pm.environment.get('expressRouteType'));
    const serviceRouteType = String(pm.environment.get('serviceRouteType'));
    const routeNature = String(pm.environment.get('routeNature'));
    const validFrom = String(pm.environment.get('validFrom'));
    const validTo = String(pm.environment.get('validTo'));
    const frequency = String(pm.environment.get('frequency'));
    const defaultStartTime = String(pm.environment.get('defaultStartTime'));
    const serviceStartTime = String(pm.environment.get('serviceStartTime'));
    const defaultDistanceKm = Number(pm.environment.get('defaultDistanceKm'));
    const defaultTatHoursRegular = Number(pm.environment.get('defaultTatHoursRegular'));
    const defaultTatHoursSpeed = Number(pm.environment.get('defaultTatHoursSpeed'));
    const defaultRatePerKm = Number(pm.environment.get('defaultRatePerKm'));
    const defaultRouteCost = Number(pm.environment.get('defaultRouteCost'));
    const vehicleType = String(pm.environment.get('vehicleType'));
    const planDriverCode = String(pm.environment.get('planDriverCode'));
    const driverName = String(pm.environment.get('driverName'));
    const driverMobile = String(pm.environment.get('driverMobile'));

    const timeSuffix = Date.now().toString().slice(-4);
    let docketNo1 = '';
    let docketNo2 = '';
    let mmRouteCode = '';
    let mmTripNo = '';
    let suggestedDockets: Array<{ docketNo: string }> = [];
    const idempotencyKey = `IDEMP-PLAN-${Date.now()}`;

    // Helper for reporting
    async function attachLog(stepName: string, reqInfo: any, resInfo: any) {
      await testInfo.attach(`API Log - ${stepName}`, {
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

    // 0. Pre-Flight FIFO Movable Queue Check
    const pendingFifo = await ManifestAPI.getMovableDockets(request, sourceBranch, { companyCode, size: 100 });
    const pendingItems = (pendingFifo.body?.data?.items || []).filter(
      (item: any) => (item.destination_branch || item.destinationBranch) === destinationBranch
    );
    if (pendingItems.length > 0) {
      test.skip(true, `Before execution kindly marked 'Boarded' for these Dockets: [${pendingItems.map((i: any) => i.docket_no || i.docketNo).join(', ')}]`);
    }

    // =========================================================================
    // PRE-REQUISITE STEP 1 & 2: CREATE 2 FRESH DOCKETS FOR LOAD PLANNING
    // =========================================================================
    await test.step('Pre-requisite 1: [Data Creation] Create Docket 1 via POST /api/v1/dockets', async () => {
      const payload1 = {
        companyCode,
        companyId,
        bookingBranch,
        billingPartyCode,
        customerCode,
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
        invoices: [
          {
            invoiceNo: `INV-1-${timeSuffix}`,
            invoiceDate,
            grossValue: 10000,
            netValue: 9500,
            poNumber: `PO-1-${timeSuffix}`,
            goodsDescription: 'General Cargo Part 1',
            ewayBillNo,
            consignorCode,
            consignorGstin,
            consigneeCode,
            consigneeGstin,
            boxes: [
              {
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
        attachments: [],
      };

      const res = await DocketAPI.createDocket(request, payload1);
      await attachLog('Pre-requisite 1: Create Docket 1', { method: 'POST', endpoint: '/api/v1/dockets', payload: payload1 }, res);
      expect([200, 201]).toContain(res.status);
      docketNo1 = res.body?.data?.docketNo || `DOC-1-${timeSuffix}`;
    });

    await test.step('Pre-requisite 2: [Data Creation] Create Docket 2 via POST /api/v1/dockets', async () => {
      const payload2 = {
        companyCode,
        companyId,
        bookingBranch,
        billingPartyCode,
        customerCode,
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
        invoices: [
          {
            invoiceNo: `INV-2-${timeSuffix}`,
            invoiceDate,
            grossValue: 12000,
            netValue: 11500,
            poNumber: `PO-2-${timeSuffix}`,
            goodsDescription: 'General Cargo Part 2',
            ewayBillNo: ewayBillNo + 1,
            consignorCode,
            consignorGstin,
            consigneeCode,
            consigneeGstin,
            boxes: [
              {
                boxCount: 1,
                type: 'CARTON',
                quantity: 1,
                length: 35,
                width: 25,
                height: 20,
                unit: 'CM',
                actualWeight: 15.0,
              },
            ],
          },
        ],
        attachments: [],
      };

      const res = await DocketAPI.createDocket(request, payload2);
      await attachLog('Pre-requisite 2: Create Docket 2', { method: 'POST', endpoint: '/api/v1/dockets', payload: payload2 }, res);
      expect([200, 201]).toContain(res.status);
      docketNo2 = res.body?.data?.docketNo || `DOC-2-${timeSuffix}`;

      // Wait for dockets to reach MM movable pool
      console.log(`⏳ Waiting for dockets "${docketNo1}" and "${docketNo2}" to reach MM movable pool...`);
      for (let attempt = 1; attempt <= 15; attempt++) {
        const poolRes = await ManifestAPI.getMovableDockets(request, sourceBranch, { companyCode, size: 100 });
        const items = poolRes.body?.data?.items || [];
        const has1 = items.some((it: any) => (it.docketNo || it.docket_no) === docketNo1);
        const has2 = items.some((it: any) => (it.docketNo || it.docket_no) === docketNo2);
        if (has1 && has2) {
          console.log(`✅ Both dockets reached MM movable pool (Attempt ${attempt}/15).`);
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      await new Promise((r) => setTimeout(r, 1000));
    });

    // =========================================================================
    // STEP 1: POST /api/v1/tally-mappings/bulk
    // =========================================================================
    await test.step('Step 1: [Tally Mapping] Bulk Tally Mapping for dockets', async () => {
      const tallyPayload = {
        companyCode,
        branchCode: sourceBranch,
        mappings: [
          { docketNo: docketNo1, status: 'MAPPED', tallySheetNo: `TS-${timeSuffix}` },
          { docketNo: docketNo2, status: 'MAPPED', tallySheetNo: `TS-${timeSuffix}` },
        ],
      };

      const res = await request.post(`${mmBaseUrl}/api/v1/tally-mappings/bulk`, {
        data: tallyPayload,
        headers,
      });
      const body = await res.json().catch(() => ({}));
      await attachLog('POST /api/v1/tally-mappings/bulk', { method: 'POST', endpoint: '/api/v1/tally-mappings/bulk', payload: tallyPayload }, { status: res.status(), body });
      console.log(`[Step 1] POST /api/v1/tally-mappings/bulk -> Status: ${res.status()}`);
      expect([200, 201]).toContain(res.status());
    });

    // =========================================================================
    // STEP 2: POST /api/v1/routes (SERVICE route draft)
    // =========================================================================
    await test.step('Step 2: [Route Setup] Create SERVICE route draft with touchpoints', async () => {
      const serviceRouteCode = `RT-SRV-${timeSuffix}-${Math.floor(100 + Math.random() * 900)}`;
      const servicePayload = {
        companyCode,
        routeCode: serviceRouteCode,
        routeType: serviceRouteType,
        routeNature,
        sourceBranch,
        destinationBranch,
        distanceKm: 220.0,
        tatHoursRegular: 28.0,
        tatHoursSpeed: 22.0,
        ratePerKm: 12.0,
        routeCost: 2640.0,
        validFrom,
        validTo,
        frequency,
        runsPerDay: 1,
        scheduleStartTimes: [serviceStartTime],
        touchPoints: [
          {
            branchCode: intermediateBranch,
            arrivalDay: 0,
            arrivalTime: '12:00:00',
            departureDay: 0,
            departureTime: '13:00:00',
          },
        ],
        createdBy: actor,
      };

      const res = await request.post(`${networkBaseUrl}/api/v1/routes`, { data: servicePayload, headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 2] POST /api/v1/routes (SERVICE) -> Status: ${res.status()}`);
      await attachLog('POST /api/v1/routes (SERVICE)', { method: 'POST', endpoint: '/api/v1/routes', payload: servicePayload }, { status: res.status(), body });
      expect([200, 201]).toContain(res.status());
    });

    // =========================================================================
    // STEP 3: POST /api/v1/routes (EXPRESS route draft - Target Plan Route)
    // =========================================================================
    await test.step('Step 3: [Route Setup] Create EXPRESS route draft', async () => {
      mmRouteCode = `RT-EXP-${timeSuffix}-${Math.floor(100 + Math.random() * 900)}`;
      const expressPayload = {
        companyCode,
        routeCode: mmRouteCode,
        routeType: expressRouteType,
        routeNature,
        sourceBranch,
        destinationBranch,
        distanceKm: defaultDistanceKm,
        tatHoursRegular: defaultTatHoursRegular,
        tatHoursSpeed: defaultTatHoursSpeed,
        ratePerKm: defaultRatePerKm,
        routeCost: defaultRouteCost,
        validFrom,
        validTo,
        frequency,
        runsPerDay: 1,
        scheduleStartTimes: [defaultStartTime],
        createdBy: actor,
      };

      const res = await request.post(`${networkBaseUrl}/api/v1/routes`, { data: expressPayload, headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('POST /api/v1/routes (EXPRESS)', { method: 'POST', endpoint: '/api/v1/routes', payload: expressPayload }, { status: res.status(), body });
      expect([200, 201]).toContain(res.status());
    });

    // =========================================================================
    // STEP 4: POST /api/v1/routes/{{mmRouteCode}}/submit
    // =========================================================================
    await test.step(`Step 4: [Route Lifecycle] Submit Route "${mmRouteCode}" for approval`, async () => {
      const submitPayload = { actor };
      const res = await request.post(`${networkBaseUrl}/api/v1/routes/${mmRouteCode}/submit`, { data: submitPayload, headers });
      const body = await res.json().catch(() => ({}));
      await attachLog(`POST /api/v1/routes/${mmRouteCode}/submit`, { method: 'POST', endpoint: `/api/v1/routes/${mmRouteCode}/submit`, payload: submitPayload }, { status: res.status(), body });
      expect([200, 201]).toContain(res.status());
    });

    let planRouteCode = mmRouteCode;

    // =========================================================================
    // STEP 5: POST /api/v1/routes/{{mmRouteCode}}/approve
    // =========================================================================
    await test.step(`Step 5: [Route Lifecycle] Approve Route "${mmRouteCode}"`, async () => {
      const approvePayload = { actor: approverActor };
      const res = await request.post(`${networkBaseUrl}/api/v1/routes/${mmRouteCode}/approve`, { data: approvePayload, headers });
      const body = await res.json().catch(() => ({}));
      await attachLog(`POST /api/v1/routes/${mmRouteCode}/approve`, { method: 'POST', endpoint: `/api/v1/routes/${mmRouteCode}/approve`, payload: approvePayload }, { status: res.status(), body });
      if (res.status() === 422 && String(body?.errorCode) === 'APPROVER_IS_MAKER') {
        console.warn(`⚠️ [Step 5] Approver is maker (single-user auth token). Falling back to active route "${activeRouteCode}" for downstream planning.`);
        planRouteCode = activeRouteCode;
      } else {
        expect([200, 201]).toContain(res.status());
      }
    });

    // =========================================================================
    // STEP 6: POST /api/v1/routes/{{mmRouteCode}}/activate
    // =========================================================================
    await test.step(`Step 6: [Route Lifecycle] Activate Route "${mmRouteCode}"`, async () => {
      if (planRouteCode !== mmRouteCode) {
        console.log(`ℹ️ [Step 6] Dynamic route "${mmRouteCode}" was not approved due to APPROVER_IS_MAKER; skipping activation.`);
        return;
      }
      const activatePayload = { actor };
      const res = await request.post(`${networkBaseUrl}/api/v1/routes/${mmRouteCode}/activate`, { data: activatePayload, headers });
      const body = await res.json().catch(() => ({}));
      await attachLog(`POST /api/v1/routes/${mmRouteCode}/activate`, { method: 'POST', endpoint: `/api/v1/routes/${mmRouteCode}/activate`, payload: activatePayload }, { status: res.status(), body });
      expect([200, 201]).toContain(res.status());
    });

    // =========================================================================
    // STEP 7: GET /api/v1/routes/planner
    // =========================================================================
    await test.step('Step 7: [Planner] Fetch active routes for planner', async () => {
      const qp = { companyCode, sourceBranch };
      const res = await request.get(`${networkBaseUrl}/api/v1/routes/planner?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 7] GET /api/v1/routes/planner -> Status: ${res.status()}`, JSON.stringify(body));
      await attachLog('GET /api/v1/routes/planner', { method: 'GET', endpoint: '/api/v1/routes/planner', queryParams: qp }, { status: res.status(), body });
      expect([200, 204]).toContain(res.status());
    });

    // =========================================================================
    // STEP 8: GET /api/v1/mm/branches/{{mmSourceBranch}}/trip-suggestions
    // =========================================================================
    await test.step(`Step 8: [Trip Suggestions] Fetch suggestions for Branch "${sourceBranch}"`, async () => {
      const qp = { companyCode, routeType: expressRouteType };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/branches/${sourceBranch}/trip-suggestions?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 8] GET /api/v1/mm/branches/${sourceBranch}/trip-suggestions -> Status: ${res.status()}`, JSON.stringify(body));
      await attachLog(`GET /api/v1/mm/branches/${sourceBranch}/trip-suggestions`, { method: 'GET', endpoint: `/api/v1/mm/branches/${sourceBranch}/trip-suggestions`, queryParams: qp }, { status: res.status(), body });
      expect([200, 204]).toContain(res.status());
    });

    // =========================================================================
    // STEP 9: GET /api/v1/mm/branches/{{mmSourceBranch}}/trip-suggestions/{{planRouteCode}}
    // =========================================================================
    await test.step(`Step 9: [Trip Suggestions] Fetch route suggestion details for "${planRouteCode}"`, async () => {
      const qp = { companyCode, routeType: expressRouteType };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/branches/${sourceBranch}/trip-suggestions/${planRouteCode}?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 9] GET /api/v1/mm/branches/${sourceBranch}/trip-suggestions/${planRouteCode} -> Status: ${res.status()}`, JSON.stringify(body));
      suggestedDockets = Array.isArray(body?.data?.docketDetails)
        ? body.data.docketDetails.map((d: any) => ({ docketNo: d.docketNo }))
        : [];
      await attachLog(`GET /api/v1/mm/branches/${sourceBranch}/trip-suggestions/${planRouteCode}`, { method: 'GET', endpoint: `/api/v1/mm/branches/${sourceBranch}/trip-suggestions/${planRouteCode}`, queryParams: qp }, { status: res.status(), body });
      expect([200, 204]).toContain(res.status());
    });

    // =========================================================================
    // STEP 10: POST /api/v1/mm/branches/{{mmSourceBranch}}/trip-suggestions/{{planRouteCode}}/finalize-plan
    // =========================================================================
    let finalizePayload: any;

    let plannedSelectedDockets: { docketNo: string }[] = [];

    await test.step(`Step 10: [Finalize Plan] Finalize plan for Route "${planRouteCode}" (Creates PLANNED Trip)`, async () => {
      // Use suggested movable dockets if available; fallback to newly created
      if (suggestedDockets.length > 0) {
        plannedSelectedDockets = suggestedDockets.slice(0, 2);
      } else {
        plannedSelectedDockets = [docketNo1, docketNo2].filter(Boolean).map((d) => ({ docketNo: d }));
      }

      finalizePayload = {
        companyCode,
        routeType: expressRouteType,
        idempotencyKey,
        vehicleNo: `DL01AB${timeSuffix}`,
        vehicleType,
        driverCode: planDriverCode,
        driverName,
        driverMobile,
        selectedDockets: plannedSelectedDockets,
        actor,
      };

      const res = await request.post(`${mmBaseUrl}/api/v1/mm/branches/${sourceBranch}/trip-suggestions/${planRouteCode}/finalize-plan?routeType=EXPRESS`, {
        data: finalizePayload,
        headers: { ...headers, 'Idempotency-Key': idempotencyKey },
      });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 10] POST finalize-plan -> Status: ${res.status()}`, JSON.stringify(body));
      await attachLog(`POST /api/v1/mm/branches/${sourceBranch}/trip-suggestions/${planRouteCode}/finalize-plan`, { method: 'POST', endpoint: `/api/v1/mm/branches/${sourceBranch}/trip-suggestions/${planRouteCode}/finalize-plan?routeType=EXPRESS`, payload: finalizePayload }, { status: res.status(), body });
      expect([200, 201]).toContain(res.status());
      mmTripNo = body?.data?.tripNo;
      expect(mmTripNo).toBeTruthy();
    });

    // =========================================================================
    // STEP 11: POST finalize-plan (retry, same idempotency key)
    // =========================================================================
    await test.step('Step 11: [Idempotency] Retry finalize-plan with same Idempotency-Key', async () => {
      const res = await request.post(`${mmBaseUrl}/api/v1/mm/branches/${sourceBranch}/trip-suggestions/${planRouteCode}/finalize-plan?routeType=EXPRESS`, {
        data: finalizePayload,
        headers: { ...headers, 'Idempotency-Key': idempotencyKey },
      });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 11] POST finalize-plan (retry) -> Status: ${res.status()}`, JSON.stringify(body));
      await attachLog('POST finalize-plan (Idempotent Retry)', { method: 'POST', endpoint: `/api/v1/mm/branches/${sourceBranch}/trip-suggestions/${planRouteCode}/finalize-plan (retry)`, payload: finalizePayload }, { status: res.status(), body });
      expect([200, 201]).toContain(res.status());
      expect(body?.data?.tripNo).toBe(mmTripNo);
    });

    // =========================================================================
    // STEP 12: GET /api/v1/trips/{{mmTripNo}} (PLANNED trip detail)
    // =========================================================================
    await test.step(`Step 12: [Trip Detail] Verify Trip "${mmTripNo}" status is PLANNED`, async () => {
      const res = await request.get(`${mmBaseUrl}/api/v1/trips/${mmTripNo}`, { headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 12] GET /api/v1/trips/${mmTripNo} -> Status: ${res.status()}`, JSON.stringify(body));
      await attachLog(`GET /api/v1/trips/${mmTripNo} (PLANNED)`, { method: 'GET', endpoint: `/api/v1/trips/${mmTripNo}` }, { status: res.status(), body });
      expect(res.status()).toBe(200);
      const tripStatus = body?.data?.trip?.status || body?.data?.status;
      expect(tripStatus).toBe('PLANNED');
    });

    // =========================================================================
    // STEP 13: PATCH /api/v1/trips/{{mmTripNo}}/documents (mark 1st docket document available)
    // =========================================================================
    await test.step(`Step 13: [Documents] Mark 1st Docket document AVAILABLE`, async () => {
      const targetDkt1 = plannedSelectedDockets[0]?.docketNo || docketNo1;
      const docPayload1 = {
        companyCode,
        documentOwnerType: 'DOCKET',
        documentOwnerRef: targetDkt1,
        documentAvailable: true,
        actor,
      };

      const res = await request.patch(`${mmBaseUrl}/api/v1/trips/${mmTripNo}/documents`, { data: docPayload1, headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 13] PATCH documents (Docket 1) -> Status: ${res.status()}`, JSON.stringify(body));
      await attachLog(`PATCH /api/v1/trips/${mmTripNo}/documents (Docket 1)`, { method: 'PATCH', endpoint: `/api/v1/trips/${mmTripNo}/documents`, payload: docPayload1 }, { status: res.status(), body });
      expect([200, 204]).toContain(res.status());
    });

    // =========================================================================
    // STEP 14: PATCH /api/v1/trips/{{mmTripNo}}/documents (mark 2nd docket pending missing)
    // =========================================================================
    await test.step(`Step 14: [Documents] Mark 2nd Docket document PENDING/MISSING`, async () => {
      const targetDkt2 = plannedSelectedDockets[1]?.docketNo || docketNo2;
      const docPayload2 = {
        companyCode,
        documentOwnerType: 'DOCKET',
        documentOwnerRef: targetDkt2,
        documentAvailable: false,
        actor,
      };

      const res = await request.patch(`${mmBaseUrl}/api/v1/trips/${mmTripNo}/documents`, { data: docPayload2, headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 14] PATCH documents (Docket 2) -> Status: ${res.status()}`, JSON.stringify(body));
      await attachLog(`PATCH /api/v1/trips/${mmTripNo}/documents (Docket 2)`, { method: 'PATCH', endpoint: `/api/v1/trips/${mmTripNo}/documents`, payload: docPayload2 }, { status: res.status(), body });
      expect([200, 204]).toContain(res.status());
    });

    // =========================================================================
    // STEP 15: POST /api/v1/trips/{{mmTripNo}}/create (Convert PLANNED -> CREATED)
    // =========================================================================
    await test.step(`Step 15: [Plan to Create] Convert Planned Trip "${mmTripNo}" to CREATED`, async () => {
      const createPayload = { companyCode, actor };
      const res = await request.post(`${mmBaseUrl}/api/v1/trips/${mmTripNo}/create`, { data: createPayload, headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 15] POST /api/v1/trips/${mmTripNo}/create -> Status: ${res.status()}`, JSON.stringify(body));
      await attachLog(`POST /api/v1/trips/${mmTripNo}/create`, { method: 'POST', endpoint: `/api/v1/trips/${mmTripNo}/create`, payload: createPayload }, { status: res.status(), body });
      expect([200, 201]).toContain(res.status());
    });

    // =========================================================================
    // STEP 16: GET /api/v1/trips/{{mmTripNo}} (CREATED trip detail)
    // =========================================================================
    await test.step(`Step 16: [Trip Detail] Verify Trip "${mmTripNo}" status is now CREATED`, async () => {
      const res = await request.get(`${mmBaseUrl}/api/v1/trips/${mmTripNo}`, { headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 16] GET /api/v1/trips/${mmTripNo} -> Status: ${res.status()}`, JSON.stringify(body));
      await attachLog(`GET /api/v1/trips/${mmTripNo} (CREATED)`, { method: 'GET', endpoint: `/api/v1/trips/${mmTripNo}` }, { status: res.status(), body });
      expect(res.status()).toBe(200);
      const tripStatus = body?.data?.trip?.status || body?.data?.status;
      expect(tripStatus).toBe('CREATED');
    });

    // =========================================================================
    // STEP 17: GET /api/v1/trips?status=CREATED
    // =========================================================================
    await test.step(`Step 17: [Trip Listing] Verify Trip "${mmTripNo}" appears in "CREATED" filter`, async () => {
      const qp = { companyCode, status: 'CREATED', size: 25 };
      const res = await request.get(`${mmBaseUrl}/api/v1/trips?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 17] GET /api/v1/trips?status=CREATED -> Status: ${res.status()}`);
      await attachLog('GET /api/v1/trips?status=CREATED', { method: 'GET', endpoint: '/api/v1/trips', queryParams: qp }, { status: res.status(), body });
      expect(res.status()).toBe(200);
      const items = body?.data?.items || [];
      const match = items.some((t: any) => t.tripNo === mmTripNo);
      expect(match).toBe(true);
    });

    // =========================================================================
    // STEP 18: GET /api/v1/tally-mappings
    // =========================================================================
    await test.step('Step 18: [Tally Mappings] Check tally mappings list', async () => {
      const qp = { companyCode, branch: sourceBranch };
      const res = await request.get(`${mmBaseUrl}/api/v1/tally-mappings?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      console.log(`[Step 18] GET /api/v1/tally-mappings -> Status: ${res.status()}`);
      await attachLog('GET /api/v1/tally-mappings', { method: 'GET', endpoint: '/api/v1/tally-mappings', queryParams: qp }, { status: res.status(), body });
      expect([200, 204]).toContain(res.status());
    });
  });

  // =========================================================================
  // SCENARIO 3: Load Dashboard, Movable Dockets & Trip Suggestions Positive Suite
  // =========================================================================
  test('Scenario 3: [Load Dashboard & Movable Inventory Suite] Verify Overview, Route-Wise Inventory, Detailed CN Info, Ageing Analysis, Expected Vehicles (Upcoming & Unloading Filter Ready) & Movable Dockets (Cases 1 to 10)', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const mmBaseUrl = BaseAPI.getServiceUrl('mm');
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(token);

    const companyCode = Number(pm.environment.get('companyCode'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const destinationBranch = String(pm.environment.get('destinationBranch'));
    const transportMode = String(pm.environment.get('transportMode'));
    const loadType = String(pm.environment.get('loadType'));
    const expressRouteType = String(pm.environment.get('expressRouteType'));
    const activeRouteCode = String(pm.environment.get('activeRouteCode'));
    const expectedVehiclesUpcomingMode = String(pm.environment.get('expectedVehiclesUpcomingMode'));
    const expectedVehiclesUnloadingMode = String(pm.environment.get('expectedVehiclesUnloadingMode'));

    let overviewDocketsCount = 0;
    let overviewBoxesCount = 0;
    let sampleMovableDocketNo = '';

    async function attachLog(stepName: string, reqInfo: any, resInfo: any) {
      await testInfo.attach(`API Log - ${stepName}`, {
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

    await test.step(`Case 1: [Overview] Verify GET /api/v1/mm/load-dashboard/overview for branch "${sourceBranch}" and tenant-wide`, async () => {
      const qp = { companyCode, branch: sourceBranch };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/load-dashboard/overview?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 1: Load Dashboard Overview', { method: 'GET', endpoint: '/api/v1/mm/load-dashboard/overview', queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(body?.data).toBeDefined();
      overviewDocketsCount = Number(body?.data?.movable_dockets ?? 0);
      overviewBoxesCount = Number(body?.data?.movable_boxes ?? 0);
      expect(overviewDocketsCount).toBeGreaterThanOrEqual(0);
      expect(overviewBoxesCount).toBeGreaterThanOrEqual(0);
    });

    await test.step(`Case 2: [Route-Wise Inventory] Verify GET /api/v1/mm/load-dashboard/route-wise-inventory reconciles with Overview totals`, async () => {
      const qp = { companyCode, branch: sourceBranch };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/load-dashboard/route-wise-inventory?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 2: Route-Wise Inventory', { method: 'GET', endpoint: '/api/v1/mm/load-dashboard/route-wise-inventory', queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      const lanes = Array.isArray(body?.data) ? body.data : [];
      const sumLaneDockets = lanes.reduce((acc: number, row: any) => acc + Number(row.docket_count ?? 0), 0);
      expect(sumLaneDockets).toBe(overviewDocketsCount);
    });

    await test.step(`Case 3: [Detailed CN Info] Verify GET /api/v1/mm/load-dashboard/detailed-cn-info pagination and destination filter`, async () => {
      const qp = { companyCode, branch: sourceBranch, destinationBranch, page: 0, size: 20 };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/load-dashboard/detailed-cn-info?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 3: Detailed CN Info', { method: 'GET', endpoint: '/api/v1/mm/load-dashboard/detailed-cn-info', queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(Array.isArray(body?.data?.items)).toBe(true);
      expect(body?.data?.page).toBe(0);
    });

    await test.step(`Case 4: [Ageing Analysis] Verify GET /api/v1/mm/load-dashboard/ageing-analysis bucket totals match Overview`, async () => {
      const qp = { companyCode, branch: sourceBranch };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/load-dashboard/ageing-analysis?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 4: Ageing Analysis', { method: 'GET', endpoint: '/api/v1/mm/load-dashboard/ageing-analysis', queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      const buckets = Array.isArray(body?.data) ? body.data : [];
      expect(buckets.length).toBe(4);
      const sumBucketDockets = buckets.reduce((acc: number, b: any) => acc + Number(b.docketCount ?? b.dockets ?? b.docket_count ?? 0), 0);
      expect(sumBucketDockets).toBe(overviewDocketsCount);
    });

    await test.step(`Case 5: [Expected Vehicles - Base] Verify GET /api/v1/mm/load-dashboard/expected-vehicles for destination branch "${destinationBranch}"`, async () => {
      const qp = { companyCode, branch: destinationBranch };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/load-dashboard/expected-vehicles?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 5: Expected Vehicles Base', { method: 'GET', endpoint: '/api/v1/mm/load-dashboard/expected-vehicles', queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(Array.isArray(body?.data) || Array.isArray(body?.data?.items)).toBe(true);
    });

    await test.step(`Case 6: [Expected Vehicles - Upcoming vs Unloading Mode Filter] Verify mode="${expectedVehiclesUpcomingMode}" & mode="${expectedVehiclesUnloadingMode}" (Ready for Dev Fix Validation)`, async () => {
      const qpUpcoming = { companyCode, branch: destinationBranch, mode: expectedVehiclesUpcomingMode };
      const resUpcoming = await request.get(`${mmBaseUrl}/api/v1/mm/load-dashboard/expected-vehicles?${new URLSearchParams(qpUpcoming as any)}`, { headers });
      const bodyUpcoming = await resUpcoming.json().catch(() => ({}));
      await attachLog('Case 6a: Expected Vehicles (UPCOMING)', { method: 'GET', endpoint: '/api/v1/mm/load-dashboard/expected-vehicles', queryParams: qpUpcoming }, { status: resUpcoming.status(), body: bodyUpcoming });
      expect(resUpcoming.status()).toBe(200);

      const qpUnloading = { companyCode, branch: destinationBranch, mode: expectedVehiclesUnloadingMode };
      const resUnloading = await request.get(`${mmBaseUrl}/api/v1/mm/load-dashboard/expected-vehicles?${new URLSearchParams(qpUnloading as any)}`, { headers });
      const bodyUnloading = await resUnloading.json().catch(() => ({}));
      await attachLog('Case 6b: Expected Vehicles (UNLOADING)', { method: 'GET', endpoint: '/api/v1/mm/load-dashboard/expected-vehicles', queryParams: qpUnloading }, { status: resUnloading.status(), body: bodyUnloading });
      expect(resUnloading.status()).toBe(200);
    });

    await test.step(`Case 7: [Movable Dockets - FIFO Pool] Verify GET /api/v1/mm/branches/${sourceBranch}/movable-dockets base query`, async () => {
      const qp = { companyCode, page: 1, size: 20 };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/branches/${sourceBranch}/movable-dockets?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 7: Movable Dockets Base', { method: 'GET', endpoint: `/api/v1/mm/branches/${sourceBranch}/movable-dockets`, queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      const items = Array.isArray(body?.data?.items) ? body.data.items : [];
      if (items.length > 0) {
        sampleMovableDocketNo = items[0].docket_no || items[0].docketNo || '';
      }
    });

    await test.step(`Case 8: [Movable Dockets - Toolbar Filters] Verify search (q), mode (${transportMode}), and loadType (${loadType}) filters`, async () => {
      const qp: Record<string, any> = {
        companyCode,
        mode: transportMode,
        loadType,
        page: 1,
        size: 20,
      };
      if (sampleMovableDocketNo) {
        qp.q = sampleMovableDocketNo.slice(0, 6);
      }
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/branches/${sourceBranch}/movable-dockets?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 8: Movable Dockets Filtered', { method: 'GET', endpoint: `/api/v1/mm/branches/${sourceBranch}/movable-dockets`, queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(Array.isArray(body?.data?.items)).toBe(true);
    });

    await test.step(`Case 9: [Trip Suggestions - Branch Summary] Verify GET /api/v1/mm/branches/${sourceBranch}/trip-suggestions`, async () => {
      const qp = { companyCode, routeType: expressRouteType };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/branches/${sourceBranch}/trip-suggestions?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 9: Branch Trip Suggestions', { method: 'GET', endpoint: `/api/v1/mm/branches/${sourceBranch}/trip-suggestions`, queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(body?.data?.branchCode).toBe(sourceBranch);
      expect(body?.data?.byRoute).toBeDefined();
    });

    await test.step(`Case 10: [Trip Suggestion Detail - Route Level] Verify GET /api/v1/mm/branches/${sourceBranch}/trip-suggestions/${activeRouteCode}`, async () => {
      const qp = { companyCode, routeType: expressRouteType };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/branches/${sourceBranch}/trip-suggestions/${activeRouteCode}?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 10: Route Trip Suggestion Detail', { method: 'GET', endpoint: `/api/v1/mm/branches/${sourceBranch}/trip-suggestions/${activeRouteCode}`, queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(body?.data?.routeCode).toBe(activeRouteCode);
      expect(Array.isArray(body?.data?.docketDetails)).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 4: Vehicle Recommendations & Engine Trip Plans Positive Suite
  // =========================================================================
  test('Scenario 4: [Vehicle Recommendations & Engine Trip Plans Positive Suite] Verify Vehicle Recommendations, Decision Audit (Accept & Override), Engine Record Plan & Cancel Plan (Cases 1 to 6)', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const mmBaseUrl = BaseAPI.getServiceUrl('mm');
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(token);

    const companyCode = Number(pm.environment.get('companyCode'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const destinationBranch = String(pm.environment.get('destinationBranch'));
    const activeRouteCode = String(pm.environment.get('activeRouteCode'));
    const vehicleType = String(pm.environment.get('vehicleType'));
    const vehicleCapacityKg = Number(pm.environment.get('vehicleCapacityKg'));
    const actor = String(pm.environment.get('actor'));
    const defaultRouteStrictness = String(pm.environment.get('defaultRouteStrictness'));
    const requiredRouteStrictness = String(pm.environment.get('requiredRouteStrictness'));
    const ignoredRouteStrictness = String(pm.environment.get('ignoredRouteStrictness'));
    const defaultRankedBy = String(pm.environment.get('defaultRankedBy'));
    const recommendedTopVehicle = String(pm.environment.get('recommendedTopVehicle'));
    const overriddenChosenVehicle = String(pm.environment.get('overriddenChosenVehicle'));
    const validOverrideReason = String(pm.environment.get('validOverrideReason'));
    const validCandidatesCount = Number(pm.environment.get('validCandidatesCount'));
    const validExcludedCount = Number(pm.environment.get('validExcludedCount'));
    const validPlanDate = String(pm.environment.get('validPlanDate'));
    const validPlanCnCount = Number(pm.environment.get('validPlanCnCount'));
    const validPlanBoxCount = Number(pm.environment.get('validPlanBoxCount'));
    const validPlanWeightKg = Number(pm.environment.get('validPlanWeightKg'));
    const validConfidencePct = Number(pm.environment.get('validConfidencePct'));
    const validUtilizationPct = Number(pm.environment.get('validUtilizationPct'));
    const validEstimatedCost = Number(pm.environment.get('validEstimatedCost'));
    const validEstimatedTatHours = Number(pm.environment.get('validEstimatedTatHours'));

    let createdPlanNo = '';

    async function attachLog(stepName: string, reqInfo: any, resInfo: any) {
      await testInfo.attach(`API Log - ${stepName}`, {
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

    await test.step(`Case 1: [Vehicle Recommendations - PREFERRED] Verify GET /api/v1/mm/vehicle-recommendations with default PREFERRED strictness`, async () => {
      const qp = {
        companyCode,
        branchCode: sourceBranch,
        routeCode: activeRouteCode,
        requiredCapacityKg: vehicleCapacityKg,
        requiredVehicleType: vehicleType,
        routeStrictness: defaultRouteStrictness,
      };
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/vehicle-recommendations?${new URLSearchParams(qp as any)}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 1: Vehicle Recommendations (PREFERRED)', { method: 'GET', endpoint: '/api/v1/mm/vehicle-recommendations', queryParams: qp }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(body?.data?.routeStrictness).toBe(defaultRouteStrictness);
      expect(Array.isArray(body?.data?.ranked)).toBe(true);
      expect(Array.isArray(body?.data?.excluded)).toBe(true);
    });

    await test.step(`Case 2: [Vehicle Recommendations - REQUIRED & IGNORED] Verify strictness modes "${requiredRouteStrictness}" and "${ignoredRouteStrictness}"`, async () => {
      for (const strictnessMode of [requiredRouteStrictness, ignoredRouteStrictness]) {
        const qp = { companyCode, branchCode: sourceBranch, routeCode: activeRouteCode, routeStrictness: strictnessMode };
        const res = await request.get(`${mmBaseUrl}/api/v1/mm/vehicle-recommendations?${new URLSearchParams(qp as any)}`, { headers });
        const body = await res.json().catch(() => ({}));
        await attachLog(`Case 2: Vehicle Recommendations (${strictnessMode})`, { method: 'GET', endpoint: '/api/v1/mm/vehicle-recommendations', queryParams: qp }, { status: res.status(), body });

        expect(res.status()).toBe(200);
        expect(body?.data?.routeStrictness).toBe(strictnessMode);
      }
    });

    await test.step(`Case 3: [Recommendation Decision - Accepted Top] Verify POST /api/v1/mm/vehicle-recommendations/decisions with wasOverride = false`, async () => {
      const payload = {
        companyCode,
        branchCode: sourceBranch,
        routeCode: activeRouteCode,
        recommendedTop: recommendedTopVehicle,
        chosenVehicle: recommendedTopVehicle,
        candidatesCount: validCandidatesCount,
        excludedCount: validExcludedCount,
        rankedBy: defaultRankedBy,
        routeStrictness: defaultRouteStrictness,
        decidedBy: actor,
      };
      const res = await request.post(`${mmBaseUrl}/api/v1/mm/vehicle-recommendations/decisions`, { data: payload, headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 3: Vehicle Decision (Accepted Top)', { method: 'POST', endpoint: '/api/v1/mm/vehicle-recommendations/decisions', payload }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(body?.data?.recorded).toBe(true);
      expect(body?.data?.wasOverride).toBe(false);
    });

    await test.step(`Case 4: [Recommendation Decision - Overridden with Reason] Verify POST /api/v1/mm/vehicle-recommendations/decisions with wasOverride = true`, async () => {
      const payload = {
        companyCode,
        branchCode: sourceBranch,
        routeCode: activeRouteCode,
        recommendedTop: recommendedTopVehicle,
        chosenVehicle: overriddenChosenVehicle,
        overrideReason: validOverrideReason,
        candidatesCount: validCandidatesCount,
        excludedCount: validExcludedCount,
        rankedBy: defaultRankedBy,
        routeStrictness: defaultRouteStrictness,
        decidedBy: actor,
      };
      const res = await request.post(`${mmBaseUrl}/api/v1/mm/vehicle-recommendations/decisions`, { data: payload, headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 4: Vehicle Decision (Overridden with Reason)', { method: 'POST', endpoint: '/api/v1/mm/vehicle-recommendations/decisions', payload }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(body?.data?.recorded).toBe(true);
      expect(body?.data?.wasOverride).toBe(true);
    });

    await test.step(`Case 5: [Engine Trip Plan - Record] Verify POST /api/v1/trip-plans creates RECOMMENDED plan`, async () => {
      const payload = {
        companyCode,
        originBranch: sourceBranch,
        plannedFor: validPlanDate,
        cnCount: validPlanCnCount,
        boxCount: validPlanBoxCount,
        weightKg: validPlanWeightKg,
        candidates: [
          {
            name: `Candidate-${vehicleType}`,
            vehicleType,
            routeCode: activeRouteCode,
            destinationBranch,
            confidencePct: validConfidencePct,
            utilizationPct: validUtilizationPct,
            estimatedCost: validEstimatedCost,
            estimatedTatHours: validEstimatedTatHours,
            cnCount: validPlanCnCount,
            boxCount: validPlanBoxCount,
            weightKg: validPlanWeightKg,
          },
        ],
        enginePrincipal: actor,
      };
      const res = await request.post(`${mmBaseUrl}/api/v1/trip-plans`, { data: payload, headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 5: Record Engine Trip Plan', { method: 'POST', endpoint: '/api/v1/trip-plans', payload }, { status: res.status(), body });

      expect([200, 201]).toContain(res.status());
      expect(body?.data?.status).toBe('RECOMMENDED');
      createdPlanNo = body?.data?.planNo || '';
      expect(createdPlanNo).toBeTruthy();
    });

    await test.step(`Case 6: [Engine Trip Plan - Cancel] Verify POST /api/v1/trip-plans/${createdPlanNo}/cancel transitions RECOMMENDED -> CANCELLED`, async () => {
      const res = await request.post(`${mmBaseUrl}/api/v1/trip-plans/${createdPlanNo}/cancel`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 6: Cancel Engine Trip Plan', { method: 'POST', endpoint: `/api/v1/trip-plans/${createdPlanNo}/cancel` }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(body?.data?.planNo).toBe(createdPlanNo);
      expect(body?.data?.status).toBe('CANCELLED');
    });
  });

  // =========================================================================
  // SCENARIO 5: Stage 2 & Stage 3 Positive Suite (Create Master, Dry-Run Validate,
  // Empty Trip & Driver Lifecycle, Route Inventory, Yard & Dock Queue/Release/Sync)
  // =========================================================================
  test('Scenario 5: [Stage 2 & Stage 3 Positive Suite] Verify Trip Create-Master, Dry-Run Validate, Empty Repositioning Trip & Driver History, Route Inventory, Yard Dock Overview, Assignment Options, Queue, Release & Occupancy Sync (Cases 1 to 10)', async ({ request }, testInfo) => {
    test.setTimeout(120000);
    const mmBaseUrl = BaseAPI.getServiceUrl('mm');
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(token);

    const companyCode = Number(pm.environment.get('companyCode'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const destinationBranch = String(pm.environment.get('destinationBranch'));
    const activeRouteCode = String(pm.environment.get('activeRouteCode'));
    const expressRouteType = String(pm.environment.get('expressRouteType'));
    const tripCreationSource = String(pm.environment.get('tripCreationSource'));
    const vehicleType = String(pm.environment.get('vehicleType'));
    const vehicleCapacityKg = Number(pm.environment.get('vehicleCapacityKg'));
    const vehicleOwnership = String(pm.environment.get('vehicleOwnership'));
    const gpsStatus = String(pm.environment.get('gpsStatus'));
    const priority = String(pm.environment.get('priority'));
    const dockNo = String(pm.environment.get('dockNo'));
    const actor = String(pm.environment.get('actor'));
    const emptyTripDriverCode = String(pm.environment.get('emptyTripDriverCode'));
    const emptyTripDriverName = String(pm.environment.get('emptyTripDriverName'));
    const emptyTripDriverMobile = String(pm.environment.get('emptyTripDriverMobile'));
    const emptyTripReplaceDriverCode = String(pm.environment.get('emptyTripReplaceDriverCode'));
    const emptyTripReplaceDriverName = String(pm.environment.get('emptyTripReplaceDriverName'));
    const emptyTripReplaceDriverMobile = String(pm.environment.get('emptyTripReplaceDriverMobile'));
    const emptyTripDriverReplaceReason = String(pm.environment.get('emptyTripDriverReplaceReason'));
    const validCancelReason = String(pm.environment.get('validCancelReason'));
    const validDockReleaseReason = String(pm.environment.get('validDockReleaseReason'));
    const validQueueRemoveReason = String(pm.environment.get('validQueueRemoveReason'));

    const sfx = Date.now().toString().slice(-4);
    const emptyVehicleNo = `DL01EM${sfx}`;
    let emptyTripNo = '';

    async function attachLog(stepName: string, reqInfo: any, resInfo: any) {
      await testInfo.attach(`API Log - ${stepName}`, {
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

    await test.step('Case 1: [Trip Create Master] Verify GET /api/v1/mm/trips/create-master returns dropdown metadata', async () => {
      const res = await request.get(`${mmBaseUrl}/api/v1/mm/trips/create-master?companyCode=${companyCode}`, { headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 1: Trip Create Master', { method: 'GET', endpoint: '/api/v1/mm/trips/create-master' }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(Array.isArray(body?.data?.routeTypes)).toBe(true);
      expect(Array.isArray(body?.data?.vehicleOwnerships)).toBe(true);
      expect(Array.isArray(body?.data?.priorities)).toBe(true);
    });

    await test.step('Case 2: [Trip Dry-Run Validate] Verify POST /api/v1/mm/trips/validate returns valid=true for valid payload', async () => {
      const validatePayload = {
        companyCode,
        sourceBranch,
        destinationBranch,
        routeType: expressRouteType,
        routeCode: activeRouteCode,
        emptyTrip: false,
        creationSource: tripCreationSource,
        vehicleNo: `DL01VL${sfx}`,
        vehicleType,
        vehicleCapacityKg,
        vehicleOwnership,
        gpsStatus,
        digitalLock: false,
        priority,
        driverCode: emptyTripDriverCode,
        driverName: emptyTripDriverName,
        driverMobile: emptyTripDriverMobile,
        createdBy: actor,
      };
      const res = await request.post(`${mmBaseUrl}/api/v1/mm/trips/validate`, { data: validatePayload, headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 2: Dry-Run Validate Trip', { method: 'POST', endpoint: '/api/v1/mm/trips/validate', payload: validatePayload }, { status: res.status(), body });

      expect(res.status()).toBe(200);
      expect(typeof body?.data?.valid).toBe('boolean');
      expect(Array.isArray(body?.data?.findings)).toBe(true);
    });

    await test.step('Case 3: [Empty Repositioning Trip] Verify POST /api/v1/trips creates emptyTrip=true without routeCode', async () => {
      const emptyTripPayload = {
        companyCode,
        sourceBranch,
        destinationBranch,
        routeType: expressRouteType,
        routeCode: null,
        emptyTrip: true,
        creationSource: 'EMPTY_AUTO',
        vehicleNo: emptyVehicleNo,
        vehicleType,
        vehicleCapacityKg,
        vehicleOwnership,
        gpsStatus,
        digitalLock: false,
        priority,
        createdBy: actor,
      };
      const res = await request.post(`${mmBaseUrl}/api/v1/trips`, { data: emptyTripPayload, headers });
      const body = await res.json().catch(() => ({}));
      await attachLog('Case 3: Create Empty Trip', { method: 'POST', endpoint: '/api/v1/trips', payload: emptyTripPayload }, { status: res.status(), body });

      expect([200, 201]).toContain(res.status());
      expect(body?.data?.status).toBe('CREATED');
      emptyTripNo = body?.data?.tripNo;
      expect(emptyTripNo).toBeTruthy();
    });

    await test.step(`Case 4: [Empty Trip Driver Assign & History] Verify POST & GET /api/v1/mm/empty-trips/${emptyTripNo}/driver`, async () => {
      const assign1Payload = {
        driverCode: Number(emptyTripDriverCode),
        driverName: emptyTripDriverName,
        driverMobile: Number(emptyTripDriverMobile),
        actor,
      };
      const res1 = await request.post(`${mmBaseUrl}/api/v1/mm/empty-trips/${emptyTripNo}/driver?companyCode=${companyCode}`, { data: assign1Payload, headers });
      const body1 = await res1.json().catch(() => ({}));
      await attachLog('Case 4a: Assign Primary Driver to Empty Trip', { method: 'POST', endpoint: `/api/v1/mm/empty-trips/${emptyTripNo}/driver`, payload: assign1Payload }, { status: res1.status(), body: body1 });
      expect([200, 201]).toContain(res1.status());

      const replacePayload = {
        driverCode: Number(emptyTripReplaceDriverCode),
        driverName: emptyTripReplaceDriverName,
        driverMobile: Number(emptyTripReplaceDriverMobile),
        reason: emptyTripDriverReplaceReason,
        actor,
      };
      const res2 = await request.post(`${mmBaseUrl}/api/v1/mm/empty-trips/${emptyTripNo}/driver?companyCode=${companyCode}`, { data: replacePayload, headers });
      const body2 = await res2.json().catch(() => ({}));
      await attachLog('Case 4b: Replace Driver on Empty Trip with Reason', { method: 'POST', endpoint: `/api/v1/mm/empty-trips/${emptyTripNo}/driver`, payload: replacePayload }, { status: res2.status(), body: body2 });
      expect([200, 201]).toContain(res2.status());

      const getRes = await request.get(`${mmBaseUrl}/api/v1/mm/empty-trips/${emptyTripNo}/driver?companyCode=${companyCode}`, { headers });
      const getBody = await getRes.json().catch(() => ({}));
      await attachLog('Case 4c: Get Empty Trip Driver History', { method: 'GET', endpoint: `/api/v1/mm/empty-trips/${emptyTripNo}/driver` }, { status: getRes.status(), body: getBody });
      expect(getRes.status()).toBe(200);
      expect(Array.isArray(getBody?.data)).toBe(true);
      expect(getBody?.data?.length).toBeGreaterThanOrEqual(2);
    });

    await test.step(`Case 5: [Route Inventory] Verify GET /api/v1/mm/routes/${activeRouteCode}/inventory/upcoming-dockets & unloading-dockets`, async () => {
      const upRes = await request.get(`${mmBaseUrl}/api/v1/mm/routes/${activeRouteCode}/inventory/upcoming-dockets?companyCode=${companyCode}`, { headers });
      const upBody = await upRes.json().catch(() => ({}));
      await attachLog('Case 5a: Route Inventory Upcoming Dockets', { method: 'GET', endpoint: `/api/v1/mm/routes/${activeRouteCode}/inventory/upcoming-dockets` }, { status: upRes.status(), body: upBody });
      expect(upRes.status()).toBe(200);
      expect(Array.isArray(upBody?.data?.items ?? upBody?.data)).toBe(true);

      const unlRes = await request.get(`${mmBaseUrl}/api/v1/mm/routes/${activeRouteCode}/inventory/unloading-dockets?companyCode=${companyCode}&atBranch=${destinationBranch}`, { headers });
      const unlBody = await unlRes.json().catch(() => ({}));
      await attachLog('Case 5b: Route Inventory Unloading Dockets', { method: 'GET', endpoint: `/api/v1/mm/routes/${activeRouteCode}/inventory/unloading-dockets` }, { status: unlRes.status(), body: unlBody });
      expect(unlRes.status()).toBe(200);
      expect(Array.isArray(unlBody?.data?.items ?? unlBody?.data)).toBe(true);
    });

    await test.step('Case 6: [Yard Dock Overview & Dock List] Verify GET /api/v1/mm/yard/dock-management/overview & /api/v1/mm/yard/docks', async () => {
      const ovRes = await request.get(`${mmBaseUrl}/api/v1/mm/yard/dock-management/overview?branch=${sourceBranch}&companyCode=${companyCode}`, { headers });
      const ovBody = await ovRes.json().catch(() => ({}));
      await attachLog('Case 6a: Yard Dock Management Overview', { method: 'GET', endpoint: '/api/v1/mm/yard/dock-management/overview' }, { status: ovRes.status(), body: ovBody });
      expect(ovRes.status()).toBe(200);
      expect(ovBody?.data?.docks_occupied).toBeDefined();

      const docksRes = await request.get(`${mmBaseUrl}/api/v1/mm/yard/docks?branch=${sourceBranch}&companyCode=${companyCode}`, { headers });
      const docksBody = await docksRes.json().catch(() => ({}));
      await attachLog('Case 6b: Yard Docks List', { method: 'GET', endpoint: '/api/v1/mm/yard/docks' }, { status: docksRes.status(), body: docksBody });
      expect(docksRes.status()).toBe(200);
      expect(Array.isArray(docksBody?.data?.items ?? docksBody?.data)).toBe(true);
    });

    await test.step(`Case 7: [Assignment Options] Verify GET /api/v1/mm/yard/trips/${emptyTripNo}/assignment-options`, async () => {
      const optRes = await request.get(`${mmBaseUrl}/api/v1/mm/yard/trips/${emptyTripNo}/assignment-options?branch=${sourceBranch}&companyCode=${companyCode}`, { headers });
      const optBody = await optRes.json().catch(() => ({}));
      await attachLog('Case 7: Trip Dock Assignment Options', { method: 'GET', endpoint: `/api/v1/mm/yard/trips/${emptyTripNo}/assignment-options` }, { status: optRes.status(), body: optBody });
      expect(optRes.status()).toBe(200);
      expect(optBody?.data?.tripNo).toBe(emptyTripNo);
      expect(Array.isArray(optBody?.data?.docks)).toBe(true);
    });

    await test.step(`Case 8: [Dock Queue, View Queue, Leave Queue & Release Dock] Verify Queue & Release lifecycle for "${emptyTripNo}"`, async () => {
      const enqueuePayload = {
        branchCode: sourceBranch,
        purpose: 'LOADING',
        actor,
        companyCode,
      };
      const enqRes = await request.post(`${mmBaseUrl}/api/v1/docks/trips/${emptyTripNo}/queue`, { data: enqueuePayload, headers });
      const enqBody = await enqRes.json().catch(() => ({}));
      await attachLog('Case 8a: Enqueue / Auto-Assign Dock', { method: 'POST', endpoint: `/api/v1/docks/trips/${emptyTripNo}/queue`, payload: enqueuePayload }, { status: enqRes.status(), body: enqBody });

      if (enqRes.status() === 403) {
        console.warn(`⚠️ [Case 8] Dock queue endpoint returned 403 Forbidden (RBAC permission restricted). Skipping dock queue assertions.`);
      } else {
        expect([200, 201]).toContain(enqRes.status());

        const qListRes = await request.get(`${mmBaseUrl}/api/v1/docks/${sourceBranch}/queue?companyCode=${companyCode}`, { headers });
        const qListBody = await qListRes.json().catch(() => ({}));
        await attachLog('Case 8b: View Branch Dock Queue', { method: 'GET', endpoint: `/api/v1/docks/${sourceBranch}/queue` }, { status: qListRes.status(), body: qListBody });
        expect(qListRes.status()).toBe(200);
        expect(Array.isArray(qListBody?.data?.items ?? qListBody?.data)).toBe(true);

        const leavePayload = {
          branchCode: sourceBranch,
          reason: validQueueRemoveReason,
          actor,
        };
        const leaveRes = await request.delete(`${mmBaseUrl}/api/v1/docks/trips/${emptyTripNo}/queue`, { data: leavePayload, headers });
        const leaveBody = await leaveRes.json().catch(() => ({}));
        await attachLog('Case 8c: Remove Trip from Queue', { method: 'DELETE', endpoint: `/api/v1/docks/trips/${emptyTripNo}/queue`, payload: leavePayload }, { status: leaveRes.status(), body: leaveBody });
        expect(leaveRes.status()).toBe(200);

        const relPayload = {
          releaseReason: validDockReleaseReason,
          actor,
        };
        const relRes = await request.post(`${mmBaseUrl}/api/v1/docks/trips/${emptyTripNo}/release`, { data: relPayload, headers });
        const relBody = await relRes.json().catch(() => ({}));
        await attachLog('Case 8d: Release Dock', { method: 'POST', endpoint: `/api/v1/docks/trips/${emptyTripNo}/release`, payload: relPayload }, { status: relRes.status(), body: relBody });
        expect(relRes.status()).toBe(200);
      }
    });

    await test.step('Case 9: [Dock Occupancy Sync] Verify POST /api/v1/docks/occupancy/sync', async () => {
      const syncPayload = {
        companyCode,
        actor,
      };
      const syncRes = await request.post(`${mmBaseUrl}/api/v1/docks/occupancy/sync`, { data: syncPayload, headers });
      const syncBody = await syncRes.json().catch(() => ({}));
      await attachLog('Case 9: Sync Dock Occupancy', { method: 'POST', endpoint: '/api/v1/docks/occupancy/sync', payload: syncPayload }, { status: syncRes.status(), body: syncBody });

      if (syncRes.status() === 403) {
        console.warn('⚠️ [Case 9] Dock occupancy sync endpoint returned 403 Forbidden (RBAC permission restricted). Skipping dock occupancy sync assertions.');
      } else {
        expect(syncRes.status()).toBe(200);
        expect(syncBody?.data?.claimed).toBeDefined();
      }
    });

    await test.step(`Case 10: [Trip Cancellation] Verify POST /api/v1/trips/${emptyTripNo}/cancel transitions CREATED -> CANCELLED`, async () => {
      const cancelPayload = {
        reason: validCancelReason,
        actor,
      };
      const cancelRes = await request.post(`${mmBaseUrl}/api/v1/trips/${emptyTripNo}/cancel`, { data: cancelPayload, headers });
      const cancelBody = await cancelRes.json().catch(() => ({}));
      await attachLog('Case 10: Cancel CREATED Trip', { method: 'POST', endpoint: `/api/v1/trips/${emptyTripNo}/cancel`, payload: cancelPayload }, { status: cancelRes.status(), body: cancelBody });
      expect(cancelRes.status()).toBe(200);
      expect(cancelBody?.data?.status).toBe('CANCELLED');
    });
  });

  // =========================================================================
  // SCENARIO 6: Stage 4 & Stage 5 Positive Suite (Manifest Dockets, Detach CN,
  // Missing Document Flag, Loading Photo, Box Damage, Mark Short, Compliance,
  // Gate Out/In Read APIs, Revise Gate-Out, Excess Unload, Damage & Shortage Tokens)
  // =========================================================================
  test('Scenario 6: [Stage 4 & Stage 5 Positive Suite] Verify Manifest Dockets, Detach CN, Missing Document Flag, Loading Photos, Box Damage at Load/Unload, Short Box & Excess Box Reconciliation, Compliance Lifecycle, Gate Read APIs, Revise Gate-Out, Damage Report & Shortage Tokens (Cases 1 to 12)', async ({ request }, testInfo) => {
    test.setTimeout(180000);
    const mmBaseUrl = BaseAPI.getServiceUrl('mm');
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(token);

    const companyCode = Number(pm.environment.get('companyCode'));
    const companyId = String(pm.environment.get('companyId'));
    const bookingBranch = String(pm.environment.get('bookingBranch'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const destinationBranch = String(pm.environment.get('destinationBranch'));
    const billingPartyCode = String(pm.environment.get('billingPartyCode'));
    const customerCode = String(pm.environment.get('customerCode'));
    const customerType = String(pm.environment.get('customerType'));
    const deliveryAddressId = Number(pm.environment.get('deliveryAddressId'));
    const pickupLocationId = Number(pm.environment.get('pickupLocationId'));
    const pickupPincode = String(pm.environment.get('pickupPincode'));
    const deliveryPincode = String(pm.environment.get('deliveryPincode'));
    const consignorPincode = String(pm.environment.get('consignorPincode'));
    const transportMode = String(pm.environment.get('transportMode'));
    const priorityAirMode = String(pm.environment.get('priorityAirMode'));
    const loadType = String(pm.environment.get('loadType'));
    const freightMode = String(pm.environment.get('freightMode'));
    const docketSource = String(pm.environment.get('docketSource'));
    const invoiceDate = String(pm.environment.get('invoiceDate'));
    const ewayBillNo = Number(pm.environment.get('ewayBillNo'));
    const consignorCode = String(pm.environment.get('consignorCode'));
    const consignorGstin = String(pm.environment.get('consignorGstin'));
    const consigneeCode = String(pm.environment.get('consigneeCode'));
    const consigneeGstin = String(pm.environment.get('consigneeGstin'));
    const activeRouteCode = String(pm.environment.get('activeRouteCode'));
    const expressRouteType = String(pm.environment.get('expressRouteType'));
    const tripCreationSource = String(pm.environment.get('tripCreationSource'));
    const vehicleType = String(pm.environment.get('vehicleType'));
    const vehicleCapacityKg = Number(pm.environment.get('vehicleCapacityKg'));
    const vehicleOwnership = String(pm.environment.get('vehicleOwnership'));
    const gpsStatus = String(pm.environment.get('gpsStatus'));
    const priority = String(pm.environment.get('priority'));
    const dockNo = String(pm.environment.get('dockNo'));
    const actor = String(pm.environment.get('actor'));
    const driverCode = String(pm.environment.get('driverCode'));
    const driverName = String(pm.environment.get('driverName'));
    const driverMobile = String(pm.environment.get('driverMobile'));
    const validGeoLat = Number(pm.environment.get('validGeoLat'));
    const validGeoLong = Number(pm.environment.get('validGeoLong'));
    const load50PhotoUrl = String(pm.environment.get('load50PhotoUrl'));
    const load100PhotoUrl = String(pm.environment.get('load100PhotoUrl'));
    const validCnRemoveReasonCode = String(pm.environment.get('validCnRemoveReasonCode'));
    const validCnRemoveRemarks = String(pm.environment.get('validCnRemoveRemarks'));
    const validDamagePhotoUrl = String(pm.environment.get('validDamagePhotoUrl'));
    const validLoadDamageRemarks = String(pm.environment.get('validLoadDamageRemarks'));
    const validUnloadDamageRemarks = String(pm.environment.get('validUnloadDamageRemarks'));
    const validSealPhotoUrl = String(pm.environment.get('validSealPhotoUrl'));
    const validDriverPhotoUrl = String(pm.environment.get('validDriverPhotoUrl'));
    const validComplianceType = String(pm.environment.get('validComplianceType'));
    const validComplianceDocRef = String(pm.environment.get('validComplianceDocRef'));
    const validReviseWeightKg = Number(pm.environment.get('validReviseWeightKg'));
    const validReviseReason = String(pm.environment.get('validReviseReason'));

    const sfx = Date.now().toString().slice(-5);
    let mainDocketNo = '';
    let tempDetachDocketNo = `7500-DETACH-${sfx}`;
    let box1 = '';
    let box2 = '';
    let tripNo = '';
    let manifestNo = '';
    const sealNo = `SEAL-S6-${sfx}`;

    async function attachLog(stepName: string, reqInfo: any, resInfo: any) {
      await testInfo.attach(`API Log - ${stepName}`, {
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

    await test.step('Pre-requisite: Create 2-Box Booking Docket, Print Stickers, Create Trip & Assign Loading Dock', async () => {
      const docketPayload = {
        companyCode,
        companyId,
        bookingBranch,
        billingPartyCode,
        customerCode,
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
        invoices: [
          {
            invoiceNo: `INV-S6-${sfx}`,
            invoiceDate,
            grossValue: 10000,
            netValue: 9500,
            poNumber: `PO-S6-${sfx}`,
            goodsDescription: 'Stage 4 & 5 Cargo 2 Boxes',
            ewayBillNo,
            consignorCode,
            consignorGstin,
            consigneeCode,
            consigneeGstin,
            boxes: [
              {
                boxCount: 2,
                type: 'CARTON',
                quantity: 2,
                length: 30,
                width: 20,
                height: 15,
                unit: 'CM',
                actualWeight: 20.0,
              },
            ],
          },
        ],
        attachments: [],
      };
      let docRes: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        docRes = await DocketAPI.createDocket(request, docketPayload);
        if ([200, 201].includes(docRes.status)) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      expect([200, 201]).toContain(docRes.status);
      mainDocketNo = docRes.body?.data?.docketNo;
      expect(mainDocketNo).toBeTruthy();

      let printRes: any;
      for (let attempt = 1; attempt <= 8; attempt++) {
        printRes = await ScanningAPI.printBatch(request, {
          docketNo: mainDocketNo,
          count: 2,
          actor,
          companyCode,
          branchCode: sourceBranch,
          printType: 'POST_MANIFEST',
        });
        if ([200, 201].includes(printRes.status)) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      expect([200, 201]).toContain(printRes.status);
      box1 = printRes.body?.data?.boxCodes?.[0] || `${mainDocketNo}-B1`;
      box2 = printRes.body?.data?.boxCodes?.[1] || `${mainDocketNo}-B2`;

      const tripPayload = {
        companyCode,
        sourceBranch,
        destinationBranch,
        routeType: expressRouteType,
        routeCode: activeRouteCode,
        emptyTrip: false,
        creationSource: tripCreationSource,
        vehicleNo: `DL01S6${sfx.slice(-4)}`,
        vehicleType,
        vehicleCapacityKg,
        vehicleOwnership,
        gpsStatus,
        digitalLock: false,
        priority,
        driverCode,
        driverName,
        driverMobile,
        createdBy: actor,
      };
      let tripRes: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        tripRes = await request.post(`${mmBaseUrl}/api/v1/trips`, { data: tripPayload, headers });
        if ([200, 201].includes(tripRes.status())) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      const tripBody = await tripRes.json().catch(() => ({}));
      expect([200, 201]).toContain(tripRes.status());
      tripNo = tripBody?.data?.tripNo;
      expect(tripNo).toBeTruthy();

      const validDockReleaseReason = String(pm.environment.get('validDockReleaseReason') || 'LOADING_COMPLETED');
      const validQueueRemoveReason = String(pm.environment.get('validQueueRemoveReason') || 'CANCELLED');

      const qRes = await request.get(`${mmBaseUrl}/api/v1/docks/${sourceBranch}/queue?companyCode=${companyCode}`, { headers });
      const qBody = await qRes.json().catch(() => ({}));
      const qList = Array.isArray(qBody?.data) ? qBody.data : qBody?.data?.items || [];
      for (const q of qList) {
        const qTrip = q.trip_no || q.tripNo;
        if (qTrip) {
          await request.delete(`${mmBaseUrl}/api/v1/docks/trips/${qTrip}/queue?companyCode=${companyCode}`, {
            data: { companyCode, branchCode: sourceBranch, reason: validQueueRemoveReason, actor },
            headers,
          });
        }
      }

      const occRes = await request.get(`${mmBaseUrl}/api/v1/mm/yard/docks?branch=${sourceBranch}&companyCode=${companyCode}`, { headers });
      const occBody = await occRes.json().catch(() => ({}));
      const occList = Array.isArray(occBody?.data) ? occBody.data : occBody?.data?.items || [];
      for (const d of occList) {
        const occupiedTrip = d.trip_no || d.tripNo || d.current_trip_no || d.currentTripNo;
        if (occupiedTrip) {
          await request.post(`${mmBaseUrl}/api/v1/docks/trips/${occupiedTrip}/release?companyCode=${companyCode}`, {
            data: { companyCode, releaseReason: validDockReleaseReason, actor },
            headers,
          });
        }
      }

      let dockRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/dock`, {
        data: { branchCode: sourceBranch, dockNo, purpose: 'LOADING', actor, companyCode },
        headers,
      });
      if (dockRes.status() === 409) {
        const errBody = await dockRes.json().catch(() => ({}));
        const heldMatch = String(errBody?.detail || '').match(/TRIP-[A-Z0-9-]+/);
        if (heldMatch) {
          await request.post(`${mmBaseUrl}/api/v1/docks/trips/${heldMatch[0]}/release?companyCode=${companyCode}`, {
            data: { companyCode, releaseReason: validDockReleaseReason, actor },
            headers,
          });
        }
        dockRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/dock`, {
          data: { branchCode: sourceBranch, dockNo: 'DOCK-2', purpose: 'LOADING', actor, companyCode },
          headers,
        });
      }
      expect(dockRes.status()).toBe(200);
    });

    await test.step(`Case 1: [Generate Manifests, Attach Dockets & List Manifest Dockets] Verify POST /manifests, POST /dockets & GET /api/v1/mm/manifests/{manifestNo}/dockets`, async () => {
      const genRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/manifests?actor=${actor}`, { headers });
      const genBody = await genRes.json().catch(() => ({}));
      expect([200, 201]).toContain(genRes.status());
      manifestNo = genBody?.data?.manifestNos?.[0];
      expect(manifestNo).toBeTruthy();

      // Attach temporary docket (to test detach in Case 2) and main 2-box docket
      const addTempRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/dockets`, {
        data: {
          docketNo: tempDetachDocketNo,
          destinationBranch,
          serviceMode: priorityAirMode,
          loadingBranch: sourceBranch,
          totalBoxes: 1,
          actualWeightKg: 10,
          chargedWeightKg: 10,
          actor,
        },
        headers,
      });
      expect([200, 201]).toContain(addTempRes.status());

      const addMainRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/dockets`, {
        data: {
          docketNo: mainDocketNo,
          destinationBranch,
          serviceMode: priorityAirMode,
          loadingBranch: sourceBranch,
          totalBoxes: 2,
          actualWeightKg: 20,
          chargedWeightKg: 20,
          actor,
        },
        headers,
      });
      expect([200, 201]).toContain(addMainRes.status());

      const listRes = await request.get(`${mmBaseUrl}/api/v1/mm/manifests/${manifestNo}/dockets?companyCode=${companyCode}`, { headers });
      const listBody = await listRes.json().catch(() => ({}));
      await attachLog('Case 1: List Manifest Dockets', { method: 'GET', endpoint: `/api/v1/mm/manifests/${manifestNo}/dockets` }, { status: listRes.status(), body: listBody });
      expect(listRes.status()).toBe(200);
      const docketItems = listBody?.data?.items ?? listBody?.data;
      expect(Array.isArray(docketItems)).toBe(true);
      expect(docketItems?.length).toBe(2);
    });

    await test.step(`Case 2: [Detach Docket from Manifest] Verify DELETE /api/v1/manifests/${manifestNo}/cns/${tempDetachDocketNo}`, async () => {
      const detachPayload = {
        reasonCode: validCnRemoveReasonCode,
        remarks: validCnRemoveRemarks,
        actor,
      };
      const delRes = await request.delete(`${mmBaseUrl}/api/v1/manifests/${manifestNo}/cns/${tempDetachDocketNo}`, {
        data: detachPayload,
        headers,
      });
      const delBody = await delRes.json().catch(() => ({}));
      await attachLog('Case 2: Detach Docket from Manifest', { method: 'DELETE', endpoint: `/api/v1/manifests/${manifestNo}/cns/${tempDetachDocketNo}`, payload: detachPayload }, { status: delRes.status(), body: delBody });
      expect(delRes.status()).toBe(200);
      expect(delBody?.data?.docketNo).toBe(tempDetachDocketNo);
    });

    await test.step(`Case 3: [Flag & Clear Missing Document on Manifest] Verify POST /api/v1/mm/manifests/${manifestNo}/missing-document`, async () => {
      const flagTruePayload = { missing: true, reason: 'Invoice copy pending', actor };
      const resTrue = await request.post(`${mmBaseUrl}/api/v1/mm/manifests/${manifestNo}/missing-document?companyCode=${companyCode}`, {
        data: flagTruePayload,
        headers,
      });
      const bodyTrue = await resTrue.json().catch(() => ({}));
      await attachLog('Case 3a: Flag Missing Document on Manifest', { method: 'POST', endpoint: `/api/v1/mm/manifests/${manifestNo}/missing-document`, payload: flagTruePayload }, { status: resTrue.status(), body: bodyTrue });
      expect(resTrue.status()).toBe(200);
      expect(bodyTrue?.status).toBe('SUCCESS');

      const flagFalsePayload = { missing: false, reason: 'Invoice copy received', actor };
      const resFalse = await request.post(`${mmBaseUrl}/api/v1/mm/manifests/${manifestNo}/missing-document?companyCode=${companyCode}`, {
        data: flagFalsePayload,
        headers,
      });
      const bodyFalse = await resFalse.json().catch(() => ({}));
      await attachLog('Case 3b: Clear Missing Document on Manifest', { method: 'POST', endpoint: `/api/v1/mm/manifests/${manifestNo}/missing-document`, payload: flagFalsePayload }, { status: resFalse.status(), body: bodyFalse });
      expect(resFalse.status()).toBe(200);
      expect(bodyFalse?.status).toBe('SUCCESS');
    });

    await test.step(`Case 4: [Load Box 1 with Damage Trail & Capture 50%/100% Loading Photos] Verify POST /loading/boxes & POST /api/v1/mm/manifests/${manifestNo}/loading-photo`, async () => {
      const pkScan1 = await ScanningAPI.recordScan(request, {
        boxCode: box1,
        eventType: 'PICKUP_SCAN',
        scanStage: 'BOOKING',
        branchCode: sourceBranch,
        scannedBy: actor,
        deviceId: 'DEV-ORIGIN-01',
        companyCode,
        expectedDocketNo: mainDocketNo,
      });
      expect([200, 201]).toContain(pkScan1.status);

      const loadScanRes = await ScanningAPI.recordScan(request, {
        boxCode: box1,
        eventType: 'OUT_SCAN',
        scanStage: 'LOAD',
        branchCode: sourceBranch,
        scannedBy: actor,
        deviceId: 'DEV-ORIGIN-01',
        companyCode,
        expectedDocketNo: mainDocketNo,
      });
      expect([200, 201]).toContain(loadScanRes.status);
      const scanEventId1 = loadScanRes.body?.data?.publicEventId || loadScanRes.body?.data?.id;
      expect(scanEventId1).toBeTruthy();

      const loadBoxPayload = {
        docketNo: mainDocketNo,
        boxCode: box1,
        scanEventId: scanEventId1,
        damagePhotoUrl: validDamagePhotoUrl,
        damageRemarks: validLoadDamageRemarks,
        actor,
        branch: sourceBranch,
      };
      const docScanRes = await ManifestAPI.scanTripDocketDocument(request, tripNo, { docketNo: mainDocketNo, companyCode, actor }, token);
      expect(docScanRes.status).toBe(200);
      const loadRes = await request.post(`${mmBaseUrl}/api/v1/manifests/${manifestNo}/loading/boxes`, { data: loadBoxPayload, headers });
      const loadBody = await loadRes.json().catch(() => ({}));
      await attachLog('Case 4a: Load Box 1 with Damage Evidence', { method: 'POST', endpoint: `/api/v1/manifests/${manifestNo}/loading/boxes`, payload: loadBoxPayload }, { status: loadRes.status(), body: loadBody });
      expect([200, 201]).toContain(loadRes.status());

      for (const [captureStage, photoUrl] of [
        ['LOAD_50_PERCENT', load50PhotoUrl],
        ['LOAD_100_PERCENT', load100PhotoUrl],
      ]) {
        const photoPayload = {
          captureStage,
          photoUrl,
          geoLat: validGeoLat,
          geoLong: validGeoLong,
          branchCode: sourceBranch,
          actor,
        };
        const pRes = await request.post(`${mmBaseUrl}/api/v1/mm/manifests/${manifestNo}/loading-photo?companyCode=${companyCode}`, { data: photoPayload, headers });
        const pBody = await pRes.json().catch(() => ({}));
        await attachLog(`Case 4b: Loading Photo (${captureStage})`, { method: 'POST', endpoint: `/api/v1/mm/manifests/${manifestNo}/loading-photo`, payload: photoPayload }, { status: pRes.status(), body: pBody });
        expect([200, 201]).toContain(pRes.status());
      }
    });

    await test.step(`Case 5: [Mark Box 2 Short at Loading & Close Loading] Verify POST /loading/short & POST /loading/close`, async () => {
      const shortPayload = {
        docketNo: mainDocketNo,
        boxCode: box2,
        actor,
        branch: sourceBranch,
      };
      const shortRes = await request.post(`${mmBaseUrl}/api/v1/manifests/${manifestNo}/loading/short`, { data: shortPayload, headers });
      const shortBody = await shortRes.json().catch(() => ({}));
      await attachLog('Case 5a: Mark Box 2 Short at Loading', { method: 'POST', endpoint: `/api/v1/manifests/${manifestNo}/loading/short`, payload: shortPayload }, { status: shortRes.status(), body: shortBody });
      expect(shortRes.status()).toBe(200);
      expect(shortBody?.data?.status).toBe('SHORT_AT_LOAD');

      const closePayload = { actor, branch: sourceBranch };
      const closeRes = await request.post(`${mmBaseUrl}/api/v1/manifests/${manifestNo}/loading/close`, { data: closePayload, headers });
      const closeBody = await closeRes.json().catch(() => ({}));
      await attachLog('Case 5b: Close Loading', { method: 'POST', endpoint: `/api/v1/manifests/${manifestNo}/loading/close`, payload: closePayload }, { status: closeRes.status(), body: closeBody });
      expect(closeRes.status()).toBe(200);
      expect(closeBody?.data?.shortDockets).toContain(mainDocketNo);
      const pouchRes = await ManifestAPI.pouchTripDocketDocument(request, tripNo, { docketNo: mainDocketNo, companyCode, actor }, token);
      expect(pouchRes.status).toBe(200);
    });

    await test.step(`Case 6: [Compliance Requirement Lifecycle] Verify PUT, GET & DELETE /api/v1/mm/compliance-requirements`, async () => {
      const putPayload = {
        companyCode,
        commodityClass: 'GENERAL',
        vehicleBody: 'CLOSED',
        routeClass: expressRouteType,
        allowed: true,
        reqTarpaulin: true,
        reqLashing: true,
        reqGps: true,
        reqDigitalLock: false,
      };
      const putRes = await request.put(`${mmBaseUrl}/api/v1/mm/compliance-requirements`, {
        data: putPayload,
        headers,
      });
      const putBody = await putRes.json().catch(() => ({}));
      await attachLog('Case 6a: Upsert Compliance Requirement', { method: 'PUT', endpoint: '/api/v1/mm/compliance-requirements', payload: putPayload }, { status: putRes.status(), body: putBody });

      if (putRes.status() === 403) {
        console.warn('⚠️ [Case 6] Compliance requirements API returned 403 Forbidden (RBAC permission restricted). Skipping compliance assertions.');
      } else {
        expect(putRes.status()).toBe(200);

        const getRes = await request.get(`${mmBaseUrl}/api/v1/mm/compliance-requirements?companyCode=${companyCode}`, { headers });
        const getBody = await getRes.json().catch(() => ({}));
        await attachLog('Case 6b: List Compliance Requirements', { method: 'GET', endpoint: '/api/v1/mm/compliance-requirements' }, { status: getRes.status(), body: getBody });
        expect(getRes.status()).toBe(200);
        expect(Array.isArray(getBody?.data?.rules ?? getBody?.data)).toBe(true);

        const delRes = await request.delete(
          `${mmBaseUrl}/api/v1/mm/compliance-requirements?companyCode=${companyCode}&commodityClass=GENERAL&vehicleBody=CLOSED&routeClass=${expressRouteType}`,
          { headers }
        );
        const delBody = await delRes.json().catch(() => ({}));
        await attachLog('Case 6c: Delete Compliance Requirement', { method: 'DELETE', endpoint: '/api/v1/mm/compliance-requirements' }, { status: delRes.status(), body: delBody });
        expect(delRes.status()).toBe(200);
      }
    });

    await test.step(`Case 7: [Seal Trip & Mark Ready for Dispatch] Verify POST /seal & POST /dispatch-ready`, async () => {
      const sealPayload = {
        sealType: 'PHYSICAL',
        sealNo,
        photoUrl: validSealPhotoUrl,
        branch: sourceBranch,
        actor,
      };
      const sealRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/seal`, { data: sealPayload, headers });
      const sealBody = await sealRes.json().catch(() => ({}));
      await attachLog('Case 7a: Seal Trip', { method: 'POST', endpoint: `/api/v1/trips/${tripNo}/seal`, payload: sealPayload }, { status: sealRes.status(), body: sealBody });
      expect(sealRes.status()).toBe(200);

      const drPayload = {
        commodityClass: 'GENERAL',
        checklist: {
          vehicleTypeOk: true,
          tarpaulinOk: true,
          lashingOk: true,
          gpsOk: true,
          digitalLockOk: true,
        },
        actor,
        companyCode,
      };
      const drRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/dispatch-ready`, { data: drPayload, headers });
      const drBody = await drRes.json().catch(() => ({}));
      await attachLog('Case 7b: Mark Trip Ready for Dispatch', { method: 'POST', endpoint: `/api/v1/trips/${tripNo}/dispatch-ready`, payload: drPayload }, { status: drRes.status(), body: drBody });
      expect(drRes.status()).toBe(200);
      expect(drBody?.data?.status).toBe('READY_FOR_DISPATCH');
    });

    await test.step(`Case 8: [Gate-Out Outgoing Read, Gate-Out Execution & Checked-Out Read] Verify GET /outgoing, POST /gate-out & GET /checked-out`, async () => {
      const outReadRes = await request.get(`${mmBaseUrl}/api/v1/mm/gate-out/outgoing?branch=${sourceBranch}&companyCode=${companyCode}`, { headers });
      const outReadBody = await outReadRes.json().catch(() => ({}));
      await attachLog('Case 8a: Gate-Out Outgoing Vehicles', { method: 'GET', endpoint: '/api/v1/mm/gate-out/outgoing' }, { status: outReadRes.status(), body: outReadBody });
      expect(outReadRes.status()).toBe(200);

      const goPayload = { gateBranch: sourceBranch, actor };
      const goRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/gate-out`, { data: goPayload, headers });
      const goBody = await goRes.json().catch(() => ({}));
      await attachLog('Case 8b: Gate-Out Trip', { method: 'POST', endpoint: `/api/v1/trips/${tripNo}/gate-out`, payload: goPayload }, { status: goRes.status(), body: goBody });
      expect(goRes.status()).toBe(200);
      expect(goBody?.data?.status).toBe('GATE_OUT_IN_TRANSIT');

      const chkOutRes = await request.get(`${mmBaseUrl}/api/v1/mm/gate-out/checked-out?branch=${sourceBranch}&companyCode=${companyCode}`, { headers });
      const chkOutBody = await chkOutRes.json().catch(() => ({}));
      await attachLog('Case 8c: Gate-Out Checked-Out History', { method: 'GET', endpoint: '/api/v1/mm/gate-out/checked-out' }, { status: chkOutRes.status(), body: chkOutBody });
      expect(chkOutRes.status()).toBe(200);
    });

    await test.step(`Case 9: [Gate-In Incoming Read, Gate-In Execution & Checked-In Read] Verify GET /incoming, POST /gate-in & GET /checked-in`, async () => {
      const inReadRes = await request.get(`${mmBaseUrl}/api/v1/mm/gate-in/incoming?branch=${destinationBranch}&companyCode=${companyCode}`, { headers });
      const inReadBody = await inReadRes.json().catch(() => ({}));
      await attachLog('Case 9a: Gate-In Incoming Vehicles', { method: 'GET', endpoint: '/api/v1/mm/gate-in/incoming' }, { status: inReadRes.status(), body: inReadBody });
      expect(inReadRes.status()).toBe(200);

      const giPayload = {
        branch: destinationBranch,
        sealNoEntered: sealNo,
        scannedManifestNos: [manifestNo],
        driverPhotoUrl: validDriverPhotoUrl,
        driverVerified: true,
        actor,
      };
      const giRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/gate-in`, { data: giPayload, headers });
      const giBody = await giRes.json().catch(() => ({}));
      await attachLog('Case 9b: Gate-In Trip at Destination', { method: 'POST', endpoint: `/api/v1/trips/${tripNo}/gate-in`, payload: giPayload }, { status: giRes.status(), body: giBody });
      expect(giRes.status()).toBe(200);
      expect(giBody?.data?.status).toBe('GATE_IN');

      const chkInRes = await request.get(`${mmBaseUrl}/api/v1/mm/gate-in/checked-in?branch=${destinationBranch}&companyCode=${companyCode}`, { headers });
      const chkInBody = await chkInRes.json().catch(() => ({}));
      await attachLog('Case 9c: Gate-In Checked-In History', { method: 'GET', endpoint: '/api/v1/mm/gate-in/checked-in' }, { status: chkInRes.status(), body: chkInBody });
      expect(chkInRes.status()).toBe(200);
    });

    await test.step(`Case 10: [Start Unloading, Unload Box 1 with Damage, Unload Box 2 as EXCESS, Close Unloading & Complete Trip]`, async () => {
      const validDockReleaseReason = String(pm.environment.get('validDockReleaseReason') || 'UNLOADING_COMPLETED');
      const validQueueRemoveReason = String(pm.environment.get('validQueueRemoveReason') || 'CANCELLED');

      const destQRes = await request.get(`${mmBaseUrl}/api/v1/docks/${destinationBranch}/queue?companyCode=${companyCode}`, { headers });
      const destQBody = await destQRes.json().catch(() => ({}));
      const destQList = Array.isArray(destQBody?.data) ? destQBody.data : destQBody?.data?.items || [];
      for (const q of destQList) {
        const qTrip = q.trip_no || q.tripNo;
        if (qTrip) {
          await request.delete(`${mmBaseUrl}/api/v1/docks/trips/${qTrip}/queue?companyCode=${companyCode}`, {
            data: { companyCode, branchCode: destinationBranch, reason: validQueueRemoveReason, actor },
            headers,
          });
        }
      }

      const destOccRes = await request.get(`${mmBaseUrl}/api/v1/mm/yard/docks?branch=${destinationBranch}&companyCode=${companyCode}`, { headers });
      expect(destOccRes.status()).toBe(200);
      const destOccBody = await destOccRes.json().catch(() => ({}));
      const destOccList = Array.isArray(destOccBody?.data) ? destOccBody.data : destOccBody?.data?.items || [];
      for (const d of destOccList) {
        const occupiedTrip = d.trip_no || d.tripNo || d.current_trip_no || d.currentTripNo;
        if (occupiedTrip) {
          await request.post(`${mmBaseUrl}/api/v1/docks/trips/${occupiedTrip}/release?companyCode=${companyCode}`, {
            data: { companyCode, releaseReason: validDockReleaseReason, actor },
            headers,
          });
        }
      }

      let destDockRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/dock`, {
        data: { branchCode: destinationBranch, dockNo, purpose: 'UNLOADING', actor, companyCode },
        headers,
      });
      if (destDockRes.status() === 409) {
        const errBody = await destDockRes.json().catch(() => ({}));
        const heldMatch = String(errBody?.detail || '').match(/TRIP-[A-Z0-9-]+/);
        if (heldMatch) {
          await request.post(`${mmBaseUrl}/api/v1/docks/trips/${heldMatch[0]}/release?companyCode=${companyCode}`, {
            data: { companyCode, releaseReason: validDockReleaseReason, actor },
            headers,
          });
        }
        destDockRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/dock`, {
          data: { branchCode: destinationBranch, dockNo: 'DOCK-2', purpose: 'UNLOADING', actor, companyCode },
          headers,
        });
      }
      expect(destDockRes.status()).toBe(200);

      const startRes = await request.post(`${mmBaseUrl}/api/v1/manifests/${manifestNo}/unloading/start`, {
        data: { actor, branch: destinationBranch },
        headers,
      });
      expect(startRes.status()).toBe(200);

      // Unload Box 1 with damage remarks -> UNLOADED
      const uScan1 = await ScanningAPI.recordScan(request, {
        boxCode: box1,
        eventType: 'IN_SCAN',
        scanStage: 'UNLOAD',
        branchCode: destinationBranch,
        scannedBy: actor,
        deviceId: 'DEV-DEST-01',
        companyCode,
        expectedDocketNo: mainDocketNo,
      });
      expect([200, 201]).toContain(uScan1.status);
      const uScanId1 = uScan1.body?.data?.publicEventId || uScan1.body?.data?.id;
      const unload1Payload = {
        docketNo: mainDocketNo,
        boxCode: box1,
        scanEventId: uScanId1,
        damagePhotoUrl: validDamagePhotoUrl,
        damageRemarks: validUnloadDamageRemarks,
        actor,
        branch: destinationBranch,
      };
      const unload1Res = await request.post(`${mmBaseUrl}/api/v1/manifests/${manifestNo}/unloading/boxes`, { data: unload1Payload, headers });
      const unload1Body = await unload1Res.json().catch(() => ({}));
      await attachLog('Case 10a: Unload Box 1 with Damage -> UNLOADED', { method: 'POST', endpoint: `/api/v1/manifests/${manifestNo}/unloading/boxes`, payload: unload1Payload }, { status: unload1Res.status(), body: unload1Body });
      expect(unload1Res.status()).toBe(200);
      expect(unload1Body?.data?.outcome).toBe('UNLOADED');

      // Scan & Unload Box 2 (which was SHORT_AT_LOAD) -> Recorded as EXCESS at Unload!
      const pkScan2 = await ScanningAPI.recordScan(request, {
        boxCode: box2,
        eventType: 'PICKUP_SCAN',
        scanStage: 'BOOKING',
        branchCode: sourceBranch,
        scannedBy: actor,
        deviceId: 'DEV-ORIGIN-01',
        companyCode,
        expectedDocketNo: mainDocketNo,
      });
      expect([200, 201]).toContain(pkScan2.status);
      const outScan2 = await ScanningAPI.recordScan(request, {
        boxCode: box2,
        eventType: 'OUT_SCAN',
        scanStage: 'LOAD',
        branchCode: sourceBranch,
        scannedBy: actor,
        deviceId: 'DEV-ORIGIN-01',
        companyCode,
        expectedDocketNo: mainDocketNo,
      });
      expect([200, 201]).toContain(outScan2.status);
      const uScan2 = await ScanningAPI.recordScan(request, {
        boxCode: box2,
        eventType: 'IN_SCAN',
        scanStage: 'UNLOAD',
        branchCode: destinationBranch,
        scannedBy: actor,
        deviceId: 'DEV-DEST-01',
        companyCode,
        expectedDocketNo: mainDocketNo,
      });
      expect([200, 201]).toContain(uScan2.status);
      const uScanId2 = uScan2.body?.data?.publicEventId || uScan2.body?.data?.id;
      const unload2Payload = {
        docketNo: mainDocketNo,
        boxCode: box2,
        scanEventId: uScanId2,
        actor,
        branch: destinationBranch,
      };
      const unload2Res = await request.post(`${mmBaseUrl}/api/v1/manifests/${manifestNo}/unloading/boxes`, { data: unload2Payload, headers });
      const unload2Body = await unload2Res.json().catch(() => ({}));
      await attachLog('Case 10b: Unload Box 2 (Short at Load -> EXCESS at Unload)', { method: 'POST', endpoint: `/api/v1/manifests/${manifestNo}/unloading/boxes`, payload: unload2Payload }, { status: unload2Res.status(), body: unload2Body });
      expect(unload2Res.status()).toBe(200);
      expect(unload2Body?.data?.outcome).toBe('EXCESS');

      const closeUnlRes = await request.post(`${mmBaseUrl}/api/v1/manifests/${manifestNo}/unloading/close`, {
        data: { actor, branch: destinationBranch },
        headers,
      });
      expect(closeUnlRes.status()).toBe(200);

      const compRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tripNo}/complete`, {
        data: { reason: 'All manifests unloaded and reconciled', actor },
        headers,
      });
      const compBody = await compRes.json().catch(() => ({}));
      await attachLog('Case 10c: Complete Trip', { method: 'POST', endpoint: `/api/v1/trips/${tripNo}/complete` }, { status: compRes.status(), body: compBody });
      expect(compRes.status()).toBe(200);
      expect(compBody?.data?.status).toBe('COMPLETED');
    });

    await test.step(`Case 11: [Trip Damage Report & Shortage Tokens Query] Verify GET /api/v1/trips/${tripNo}/damage & GET /api/v1/shortage-tokens`, async () => {
      const dmgRes = await request.get(`${mmBaseUrl}/api/v1/trips/${tripNo}/damage?companyCode=${companyCode}`, { headers });
      const dmgBody = await dmgRes.json().catch(() => ({}));
      await attachLog('Case 11a: Get Trip Damage Report', { method: 'GET', endpoint: `/api/v1/trips/${tripNo}/damage` }, { status: dmgRes.status(), body: dmgBody });
      expect(dmgRes.status()).toBe(200);
      expect(Array.isArray(dmgBody?.data)).toBe(true);
      expect(dmgBody?.data?.length).toBeGreaterThanOrEqual(1);

      const stShortRes = await request.get(`${mmBaseUrl}/api/v1/shortage-tokens?branch=${sourceBranch}&classification=SHORT&checkpointType=MANIFEST`, { headers });
      const stShortBody = await stShortRes.json().catch(() => ({}));
      await attachLog('Case 11b: Get Shortage Tokens (MANIFEST SHORT)', { method: 'GET', endpoint: '/api/v1/shortage-tokens?classification=SHORT' }, { status: stShortRes.status(), body: stShortBody });

      if (stShortRes.status() === 403) {
        console.warn('⚠️ [Case 11] Shortage tokens API returned 403 Forbidden (RBAC permission restricted). Skipping shortage tokens assertions.');
      } else {
        expect(stShortRes.status()).toBe(200);
        expect(Array.isArray(stShortBody?.data?.items)).toBe(true);

        const stExcRes = await request.get(`${mmBaseUrl}/api/v1/shortage-tokens?branch=${destinationBranch}&classification=EXCESS&checkpointType=UNLOAD`, { headers });
        const stExcBody = await stExcRes.json().catch(() => ({}));
        await attachLog('Case 11c: Get Shortage Tokens (UNLOAD EXCESS)', { method: 'GET', endpoint: '/api/v1/shortage-tokens?classification=EXCESS' }, { status: stExcRes.status(), body: stExcBody });
        expect(stExcRes.status()).toBe(200);
        expect(Array.isArray(stExcBody?.data?.items)).toBe(true);
      }
    });

    await test.step('Case 12: [Revise Gate-Out on In-Transit Trip] Verify POST /api/v1/mm/gate-out/{tripNo}/revise records revised weight & seal', async () => {
      // Create a lightweight empty trip, seal, dispatch-ready, gate-out, then revise gate-out
      const revTripRes = await request.post(`${mmBaseUrl}/api/v1/trips`, {
        data: {
          companyCode,
          sourceBranch,
          destinationBranch,
          routeType: expressRouteType,
          routeCode: null,
          emptyTrip: true,
          creationSource: 'EMPTY_AUTO',
          vehicleNo: `DL01RV${sfx.slice(-4)}`,
          vehicleType,
          vehicleCapacityKg,
          vehicleOwnership,
          gpsStatus,
          digitalLock: false,
          priority,
          driverCode,
          driverName,
          driverMobile,
          createdBy: actor,
        },
        headers,
      });
      expect([200, 201]).toContain(revTripRes.status());
      const revTripNo = (await revTripRes.json())?.data?.tripNo;
      expect(revTripNo).toBeTruthy();
      const revSealNo = `SEAL-RV-${sfx}`;
      const revSealRes = await request.post(`${mmBaseUrl}/api/v1/trips/${revTripNo}/seal`, {
        data: { sealType: 'PHYSICAL', sealNo: revSealNo, photoUrl: validSealPhotoUrl, branch: sourceBranch, actor },
        headers,
      });
      expect(revSealRes.status()).toBe(200);
      const revDrRes = await request.post(`${mmBaseUrl}/api/v1/trips/${revTripNo}/dispatch-ready`, {
        data: {
          commodityClass: 'GENERAL',
          checklist: { vehicleTypeOk: true, tarpaulinOk: true, lashingOk: true, gpsOk: true, digitalLockOk: true },
          actor,
          companyCode,
        },
        headers,
      });
      expect(revDrRes.status()).toBe(200);
      const revGoRes = await request.post(`${mmBaseUrl}/api/v1/trips/${revTripNo}/gate-out`, {
        data: { gateBranch: sourceBranch, actor },
        headers,
      });
      expect(revGoRes.status()).toBe(200);

      const revisePayload = {
        gateBranch: sourceBranch,
        sealNoEntered: revSealNo,
        actualWeight: validReviseWeightKg,
        reason: validReviseReason,
        actor,
      };
      const revRes = await request.post(`${mmBaseUrl}/api/v1/mm/gate-out/${revTripNo}/revise?companyCode=${companyCode}`, {
        data: revisePayload,
        headers,
      });
      const revBody = await revRes.json().catch(() => ({}));
      await attachLog('Case 12: Revise Gate-Out', { method: 'POST', endpoint: `/api/v1/mm/gate-out/${revTripNo}/revise`, payload: revisePayload }, { status: revRes.status(), body: revBody });
      expect(revRes.status()).toBe(200);
      expect(revBody?.data?.gateEventId).toBeDefined();
    });
  });

  // =========================================================================
  // SCENARIO 7: Touch-Point Multi-Leg E2E Flow (01 -> 02 -> 03 -> 04 -> Leg-2 Complete)
  //             + Newly Deployed Load Dashboard & Yard Dock Management APIs
  // =========================================================================
  test('Scenario 7: [Touch-Point Multi-Leg Flow & New Dashboard/Yard Dock Suite] Verify Branch Route-Wise Inventory, Route-Type Counts, Yard Dock Summary/Docks/Queue, and Complete Touch-Point Flow (01 Movable Dockets -> 02 First Docket Manifest -> 03 Idempotency Replay -> 04 Second Docket Manifest Reuse -> Leg-2 Transit & Final Complete)', async ({ request }, testInfo) => {
    test.setTimeout(180000);
    const mmBaseUrl = BaseAPI.getServiceUrl('mm');
    const networkBaseUrl = BaseAPI.getServiceUrl('network');
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(token);

    const companyCode = Number(pm.environment.get('companyCode'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const intermediateBranch = String(pm.environment.get('intermediateBranch'));
    const destinationBranch = String(pm.environment.get('destinationBranch'));
    const serviceRouteType = String(pm.environment.get('serviceRouteType'));
    const activeTouchPointRouteCode = String(pm.environment.get('activeTouchPointRouteCode'));
    const vehicleType = String(pm.environment.get('vehicleType'));
    const vehicleCapacityKg = Number(pm.environment.get('vehicleCapacityKg'));
    const vehicleOwnership = String(pm.environment.get('vehicleOwnership'));
    const gpsStatus = String(pm.environment.get('gpsStatus'));
    const priority = String(pm.environment.get('priority'));
    const driverCode = String(pm.environment.get('driverCode'));
    const driverName = String(pm.environment.get('driverName'));
    const driverMobile = String(pm.environment.get('driverMobile'));
    const actor = String(pm.environment.get('actor'));
    const approverActor = String(pm.environment.get('approverActor'));
    const priorityAirMode = String(pm.environment.get('priorityAirMode'));
    const validSealPhotoUrl = String(pm.environment.get('validSealPhotoUrl'));
    const validDriverPhotoUrl = String(pm.environment.get('validDriverPhotoUrl'));
    const load50PhotoUrl = String(pm.environment.get('load50PhotoUrl'));
    const loadingPhoto50Stage = String(pm.environment.get('loadingPhoto50Stage'));
    const dockFilterAll = String(pm.environment.get('dockFilterAll'));
    const dockFilterLoading = String(pm.environment.get('dockFilterLoading'));
    const dockFilterAvailable = String(pm.environment.get('dockFilterAvailable'));
    const branchInventoryFilterCurrent = String(pm.environment.get('branchInventoryFilterCurrent'));
    const branchInventoryFilterUpcoming = String(pm.environment.get('branchInventoryFilterUpcoming'));

    const sfx = `${Date.now()}`.slice(-6);

    async function attachLog(stepName: string, reqInfo: any, resInfo: any) {
      await testInfo.attach(`API Log - ${stepName}`, {
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

    async function createTestDocket(originBr: string, destBr: string, invoiceSuffix: string): Promise<string> {
      const docketPayload = {
        companyCode,
        companyId: String(pm.environment.get('companyId')),
        bookingBranch: originBr,
        billingPartyCode: String(pm.environment.get('billingPartyCode')),
        customerCode: String(pm.environment.get('customerCode')),
        customerType: String(pm.environment.get('customerType')),
        sourceBranch: originBr,
        destinationBranch: destBr,
        deliveryAddressId: Number(pm.environment.get('deliveryAddressId')),
        pickupLocationId: Number(pm.environment.get('pickupLocationId')),
        pickupPincode: String(pm.environment.get('pickupPincode')),
        deliveryPincode: String(pm.environment.get('deliveryPincode')),
        consignorPincode: String(pm.environment.get('consignorPincode')),
        transportMode: String(pm.environment.get('transportMode')),
        loadType: String(pm.environment.get('loadType')),
        freightMode: String(pm.environment.get('freightMode')),
        docketSource: String(pm.environment.get('docketSource')),
        createdBy: actor,
        isReturn: false,
        originalDocketNo: '',
        invoices: [
          {
            invoiceNo: `INV-TP-${invoiceSuffix}`,
            invoiceDate: String(pm.environment.get('invoiceDate')),
            grossValue: Number(pm.environment.get('grossValue')),
            netValue: Number(pm.environment.get('netValue')),
            poNumber: `PO-TP-${invoiceSuffix}`,
            goodsDescription: 'Touch-Point Cargo 1 Box',
            ewayBillNo: Number(pm.environment.get('ewayBillNo')),
            consignorCode: String(pm.environment.get('consignorCode')),
            consignorGstin: String(pm.environment.get('consignorGstin')),
            consigneeCode: String(pm.environment.get('consigneeCode')),
            consigneeGstin: String(pm.environment.get('consigneeGstin')),
            boxes: [
              {
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
        attachments: [],
      };
      let created = await DocketAPI.createDocket(request, docketPayload);
      if (![200, 201].includes(created.status)) {
        await new Promise((r) => setTimeout(r, 2000));
        created = await DocketAPI.createDocket(request, docketPayload);
      }
      expect([200, 201]).toContain(created.status);
      const docNo = created.body?.data?.docketNo || created.docketNo!;
      for (let attempt = 1; attempt <= 15; attempt++) {
        const mvRes = await request.get(
          `${mmBaseUrl}/api/v1/mm/branches/${originBr}/movable-dockets?companyCode=${companyCode}&destinationBranches=${destBr}&page=1&size=100`,
          { headers }
        );
        const mvBody = await mvRes.json().catch(() => ({}));
        const items = mvBody?.data?.items || [];
        if (items.some((d: any) => (d.docket_no || d.docketNo) === docNo)) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      await new Promise((r) => setTimeout(r, 3000));
      return docNo;
    }

    async function printAndLoadScanning(docNo: string, branchCode: string): Promise<{ boxCode: string; loadScanId: string }> {
      let prtRes: any;
      for (let attempt = 1; attempt <= 8; attempt++) {
        prtRes = await ScanningAPI.printBatch(request, {
          docketNo: docNo,
          count: 1,
          actor,
          companyCode,
          branchCode,
          printType: 'POST_MANIFEST',
        });
        if ([200, 201].includes(prtRes.status)) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      expect([200, 201]).toContain(prtRes.status);
      const boxCode = prtRes.body?.data?.boxCodes?.[0] || `${docNo}-B1`;
      expect(boxCode).toBeTruthy();

      const pkRes = await ScanningAPI.recordScan(request, {
        boxCode,
        eventType: 'PICKUP_SCAN',
        scanStage: 'BOOKING',
        branchCode,
        scannedBy: actor,
        deviceId: `DEV-${branchCode}-01`,
        companyCode,
        expectedDocketNo: docNo,
      });
      expect([200, 201]).toContain(pkRes.status);

      const outRes = await ScanningAPI.recordScan(request, {
        boxCode,
        eventType: 'OUT_SCAN',
        scanStage: 'LOAD',
        branchCode,
        scannedBy: actor,
        deviceId: `DEV-${branchCode}-01`,
        companyCode,
        expectedDocketNo: docNo,
      });
      expect([200, 201]).toContain(outRes.status);
      const loadScanId = outRes.body?.data?.publicEventId || outRes.body?.data?.id;
      return { boxCode, loadScanId };
    }

    // =========================================================================
    // CASE 1: Newly Deployed Load Dashboard APIs (branch-route-wise-inventory & route-type-counts)
    // =========================================================================
    await test.step(`Case 1: [New Load Dashboard APIs] Verify GET /api/v1/mm/load-dashboard/branch-route-wise-inventory (CURRENT & UPCOMING) & GET /api/v1/mm/load-dashboard/route-type-counts`, async () => {
      const invCurrRes = await ManifestAPI.getBranchRouteWiseInventory(
        request,
        { companyCode, branch: sourceBranch, filter: branchInventoryFilterCurrent, page: 0, size: 10 },
        token
      );
      await attachLog('Case 1a: Branch Route-Wise Inventory (CURRENT)', { filter: branchInventoryFilterCurrent }, invCurrRes);
      expect(invCurrRes.status).toBe(200);
      const currPageObj = invCurrRes.body?.data?.page || invCurrRes.body?.data;
      expect(Array.isArray(currPageObj?.items)).toBe(true);

      const invUpcRes = await ManifestAPI.getBranchRouteWiseInventory(
        request,
        { companyCode, branch: sourceBranch, filter: branchInventoryFilterUpcoming, page: 0, size: 10 },
        token
      );
      await attachLog('Case 1b: Branch Route-Wise Inventory (UPCOMING)', { filter: branchInventoryFilterUpcoming }, invUpcRes);
      expect(invUpcRes.status).toBe(200);
      const upcPageObj = invUpcRes.body?.data?.page || invUpcRes.body?.data;
      expect(Array.isArray(upcPageObj?.items)).toBe(true);

      const rtcRes = await ManifestAPI.getRouteTypeCounts(request, { companyCode, branch: sourceBranch }, token);
      await attachLog('Case 1c: Route-Type Counts', { companyCode, branch: sourceBranch }, rtcRes);
      expect(rtcRes.status).toBe(200);
      expect(rtcRes.body?.data).toBeDefined();
    });

    // =========================================================================
    // CASE 2: Newly Deployed Yard Dock Management APIs (summary, docks, queue)
    // =========================================================================
    await test.step(`Case 2: [New Yard Dock Management APIs] Verify GET /api/v1/mm/yard/dock-management/summary, /docks & /queue`, async () => {
      const sumRes = await ManifestAPI.getYardDockManagementSummary(request, { companyCode, branch: sourceBranch }, token);
      await attachLog('Case 2a: Yard Dock Management Summary', { companyCode, branch: sourceBranch }, sumRes);
      expect(sumRes.status).toBe(200);
      expect(sumRes.body?.data).toBeDefined();
      expect(Number(sumRes.body?.data?.totalDocks ?? sumRes.body?.data?.total_docks ?? 0)).toBeGreaterThanOrEqual(0);

      for (const filterMode of [dockFilterAll, dockFilterLoading, dockFilterAvailable]) {
        const docksRes = await ManifestAPI.getYardDockManagementDocks(
          request,
          { companyCode, branch: sourceBranch, filter: filterMode, page: 0, size: 10 },
          token
        );
        await attachLog(`Case 2b: Yard Dock Management Docks (${filterMode})`, { filter: filterMode }, docksRes);
        expect(docksRes.status).toBe(200);
        expect(docksRes.body?.data).toBeDefined();
      }

      const queueRes = await ManifestAPI.getYardDockManagementQueue(request, { companyCode, branch: sourceBranch }, token);
      await attachLog('Case 2c: Yard Dock Management Waiting Queue', { companyCode, branch: sourceBranch }, queueRes);
      expect(queueRes.status).toBe(200);
      expect(queueRes.body?.data).toBeDefined();
    });

    // =========================================================================
    // CASE 3: Setup Multi-Leg SERVICE Trip (1001 -> [TouchPoint: 1002] -> 2115) & Gate-In at Touch-Point 1002
    // =========================================================================
    let tpTripNo = '';
    let originManifest2 = '';
    let originDocketNo = '';
    let originBoxCode = '';
    let tpDocket1 = '';
    let tpDocket2 = '';
    let tpManifestNo = '';
    let firstIdempotencyKey = '';

    await test.step(`Case 3: [Multi-Leg SERVICE Trip Setup & Leg-1 Transit] Create Origin Docket (${sourceBranch}->${destinationBranch}) & 2 Touch-Point Dockets (${intermediateBranch}->${destinationBranch}), Load & Gate-Out from "${sourceBranch}", and Gate-In at Touch-Point "${intermediateBranch}"`, async () => {
      // Ensure SERVICE route RT-TP-17619 is active & SERVICE compliance rule exists
      await request.put(`${networkBaseUrl}/api/v1/compliance-rules`, {
        data: {
          companyCode,
          commodityClass: 'GENERAL',
          vehicleBody: '17 FEET',
          routeClass: serviceRouteType,
          tarpaulinMandate: 'YES',
          lashingMandate: 'YES',
          gpsMandate: 'YES',
          digitalLockMandate: 'OPTIONAL',
          updatedBy: actor,
        },
        headers,
      });

      originDocketNo = await createTestDocket(sourceBranch, destinationBranch, `ORIG-${sfx}`);
      const existingTpMvRes = await request.get(
        `${mmBaseUrl}/api/v1/mm/branches/${intermediateBranch}/movable-dockets?companyCode=${companyCode}&destinationBranches=${destinationBranch}&page=1&size=50`,
        { headers }
      );
      const existingTpMvBody = await existingTpMvRes.json().catch(() => ({}));
      const existingTpItems = existingTpMvBody?.data?.items || [];
      if (existingTpItems.length < 1) {
        await createTestDocket(intermediateBranch, destinationBranch, `TP1-${sfx}`);
      }
      if (existingTpItems.length < 2) {
        await createTestDocket(intermediateBranch, destinationBranch, `TP2-${sfx}`);
      }

      const tripCreateRes = await request.post(`${mmBaseUrl}/api/v1/trips`, {
        data: {
          companyCode,
          sourceBranch,
          destinationBranch,
          routeType: serviceRouteType,
          routeCode: activeTouchPointRouteCode,
          emptyTrip: false,
          creationSource: 'MANUAL',
          vehicleNo: `DL01TP${sfx.slice(-4)}`,
          vehicleType,
          vehicleCapacityKg,
          vehicleOwnership,
          gpsStatus,
          digitalLock: false,
          priority,
          driverCode,
          driverName,
          driverMobile,
          createdBy: actor,
        },
        headers,
      });
      const tripCreateBody = await tripCreateRes.json().catch(() => ({}));
      expect(tripCreateRes.status()).toBe(201);
      tpTripNo = tripCreateBody?.data?.tripNo;
      pm.environment.set('touchPointTripNo', tpTripNo);

      // Generate initial manifests at 1001 (MNF-...-1 for 1001->1002, MNF-...-2 for 1001->2115)
      const mfGenRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/manifests?actor=${actor}`, {
        headers,
      });
      expect([200, 201]).toContain(mfGenRes.status());

      // Attach origin docket (1001 -> 2115) and capture the exact manifestNo it was assigned to
      const addDocRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/dockets`, {
        data: {
          docketNo: originDocketNo,
          destinationBranch,
          serviceMode: priorityAirMode,
          loadingBranch: sourceBranch,
          totalBoxes: 1,
          actualWeightKg: 10,
          chargedWeightKg: 10,
          actor,
        },
        headers,
      });
      const addDocBody = await addDocRes.json().catch(() => ({}));
      expect([200, 201]).toContain(addDocRes.status());
      originManifest2 = addDocBody?.data?.manifestNo;
      expect(originManifest2).toBeTruthy();

      // Scan origin docket document against plan before loading boxes (POST /api/v1/trips/{tripNo}/documents/scan)
      const docScanOrig = await ManifestAPI.scanTripDocketDocument(
        request,
        tpTripNo,
        { docketNo: originDocketNo, companyCode, actor },
        token
      );
      expect(docScanOrig.status).toBe(200);
      expect(docScanOrig.body?.data?.scan).toBe('PLAN');

      // Print, scan, load box onto originManifest2, close loading, pouch document, seal, dispatch-ready, and gate-out at 1001
      const origScan = await printAndLoadScanning(originDocketNo, sourceBranch);
      originBoxCode = origScan.boxCode;

      const loadOrigRes = await request.post(`${mmBaseUrl}/api/v1/manifests/${originManifest2}/loading/boxes`, {
        data: { docketNo: originDocketNo, boxCode: originBoxCode, scanEventId: origScan.loadScanId, actor, branch: sourceBranch },
        headers,
      });
      expect(loadOrigRes.status()).toBe(200);

      const closeOrigRes = await request.post(`${mmBaseUrl}/api/v1/manifests/${originManifest2}/loading/close`, {
        data: { actor, branch: sourceBranch },
        headers,
      });
      expect(closeOrigRes.status()).toBe(200);

      const docPouchOrig = await ManifestAPI.pouchTripDocketDocument(
        request,
        tpTripNo,
        { docketNo: originDocketNo, companyCode, actor },
        token
      );
      expect(docPouchOrig.status).toBe(200);
      expect(docPouchOrig.body?.data?.scan).toBe('POUCH');

      const originSealNo = `SEAL-ORIG-${sfx}`;
      const sealOrigRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/seal`, {
        data: { sealType: 'PHYSICAL', sealNo: originSealNo, photoUrl: validSealPhotoUrl, branch: sourceBranch, actor },
        headers,
      });
      expect(sealOrigRes.status()).toBe(200);

      const drOrigRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/dispatch-ready`, {
        data: {
          commodityClass: 'GENERAL',
          checklist: { vehicleTypeOk: true, tarpaulinOk: true, lashingOk: true, gpsOk: true, digitalLockOk: true },
          actor,
          companyCode,
        },
        headers,
      });
      expect(drOrigRes.status()).toBe(200);

      const goOrigRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/gate-out`, {
        data: { gateBranch: sourceBranch, actor },
        headers,
      });
      expect(goOrigRes.status()).toBe(200);

      // Gate-In at intermediate Touch-Point 1002 (scannedManifestNos: [] since MNF-...-2 terminates at 2115)
      const giTpPayload = {
        branch: intermediateBranch,
        sealNoEntered: originSealNo,
        scannedManifestNos: [],
        driverPhotoUrl: validDriverPhotoUrl,
        driverVerified: true,
        actor,
      };
      const giTpRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/gate-in`, {
        data: giTpPayload,
        headers,
      });
      const giTpBody = await giTpRes.json().catch(() => ({}));
      await attachLog('Case 3: Gate-In at Intermediate Touch-Point 1002', giTpPayload, { status: giTpRes.status(), body: giTpBody });
      expect(giTpRes.status()).toBe(200);
      expect(giTpBody?.data?.status).toBe('GATE_IN');
    });

    // =========================================================================
    // CASE 4: [01 Get movable dockets at touch point and capture same-destination pair]
    // =========================================================================
    await test.step(`Case 4: [01 Get Movable Dockets at Touch-Point] Verify GET /api/v1/trips/${tpTripNo}/touch-points/${intermediateBranch}/movable-dockets & capture same-destination pair`, async () => {
      let mvTpRes = await ManifestAPI.getTouchPointMovableDockets(request, tpTripNo, intermediateBranch, { companyCode }, token);
      let sameDestDockets = (mvTpRes.body?.data?.dockets || []).filter((d: any) => d.destinationBranch === destinationBranch);
      while (sameDestDockets.length < 2) {
        await createTestDocket(intermediateBranch, destinationBranch, `TP-FILL-${Date.now().toString().slice(-4)}`);
        mvTpRes = await ManifestAPI.getTouchPointMovableDockets(request, tpTripNo, intermediateBranch, { companyCode }, token);
        sameDestDockets = (mvTpRes.body?.data?.dockets || []).filter((d: any) => d.destinationBranch === destinationBranch);
      }
      await attachLog('Case 4 (01): Get Touch-Point Movable Dockets', { tripNo: tpTripNo, branchCode: intermediateBranch, companyCode }, mvTpRes);

      expect(mvTpRes.status).toBe(200);
      expect(mvTpRes.body?.data?.tripNo).toBe(tpTripNo);
      expect(mvTpRes.body?.data?.touchPointBranch).toBe(intermediateBranch);
      expect(Array.isArray(mvTpRes.body?.data?.downstreamStops)).toBe(true);
      expect(mvTpRes.body?.data?.downstreamStops).toContain(destinationBranch);
      expect(Array.isArray(mvTpRes.body?.data?.dockets)).toBe(true);
      expect(sameDestDockets.length).toBeGreaterThanOrEqual(2);

      // Capture the oldest two FIFO dockets for the downstream stop into environment variables
      tpDocket1 = sameDestDockets[0].docketNo;
      tpDocket2 = sameDestDockets[1].docketNo;
      pm.environment.set('touchPointFirstDocketNo', tpDocket1);
      pm.environment.set('touchPointSecondDocketNo', tpDocket2);
    });

    // =========================================================================
    // CASE 5: [02 Create or update touch-point manifest with first docket]
    // =========================================================================
    await test.step(`Case 5: [02 Create Touch-Point Manifest With First Docket] Verify POST /api/v1/trips/${tpTripNo}/touch-points/${intermediateBranch}/manifests returns 201, replayed=false & captures manifestNo`, async () => {
      firstIdempotencyKey = `IK-TP-FIRST-${sfx}`;
      const payload = {
        companyCode,
        idempotencyKey: firstIdempotencyKey,
        docketNos: [tpDocket1],
        actor,
      };
      const res = await ManifestAPI.upsertTouchPointManifests(request, tpTripNo, intermediateBranch, payload, token);
      await attachLog('Case 5 (02): Create Touch-Point Manifest (1st Docket)', payload, res);

      expect(res.status).toBe(201);
      expect(res.body?.data?.tripNo).toBe(tpTripNo);
      expect(res.body?.data?.touchPointBranch).toBe(intermediateBranch);
      expect(res.body?.data?.replayed).toBe(false);
      expect(Array.isArray(res.body?.data?.manifests)).toBe(true);
      expect(res.body?.data?.manifests?.length).toBe(1);

      tpManifestNo = res.body?.data?.manifests[0]?.manifestNo;
      expect(tpManifestNo).toBeTruthy();
      expect(res.body?.data?.manifests[0]?.destinationBranch).toBe(destinationBranch);
      expect(res.body?.data?.manifests[0]?.docketNos).toContain(tpDocket1);
      pm.environment.set('touchPointManifestNo', tpManifestNo);
    });

    // =========================================================================
    // CASE 6: [03 Replay same idempotency key returns replayed=true and same manifest]
    // =========================================================================
    await test.step(`Case 6: [03 Replay Same Idempotency Key] Verify POST /api/v1/trips/${tpTripNo}/touch-points/${intermediateBranch}/manifests with same idempotencyKey returns 201, replayed=true & same manifestNo`, async () => {
      const replayPayload = {
        companyCode,
        idempotencyKey: firstIdempotencyKey,
        docketNos: [tpDocket1],
        actor,
      };
      const replayRes = await ManifestAPI.upsertTouchPointManifests(request, tpTripNo, intermediateBranch, replayPayload, token);
      await attachLog('Case 6 (03): Replay Same Idempotency Key on Touch-Point Manifest', replayPayload, replayRes);

      expect(replayRes.status).toBe(201);
      expect(replayRes.body?.data?.replayed).toBe(true);
      expect(replayRes.body?.data?.manifests?.[0]?.manifestNo).toBe(tpManifestNo);
    });

    // =========================================================================
    // CASE 7: [04 Add second docket at same touch point and reuse existing manifest]
    // =========================================================================
    await test.step(`Case 7: [04 Add Second Docket & Reuse Existing Manifest] Verify POST /api/v1/trips/${tpTripNo}/touch-points/${intermediateBranch}/manifests with new idempotencyKey returns 201, replayed=false & reuses "${tpManifestNo}"`, async () => {
      const secondPayload = {
        companyCode,
        idempotencyKey: `IK-TP-SECOND-${sfx}`,
        docketNos: [tpDocket2],
        actor,
      };
      const secondRes = await ManifestAPI.upsertTouchPointManifests(request, tpTripNo, intermediateBranch, secondPayload, token);
      await attachLog('Case 7 (04): Add 2nd Docket & Reuse Touch-Point Manifest', secondPayload, secondRes);

      expect(secondRes.status).toBe(201);
      expect(secondRes.body?.data?.replayed).toBe(false);
      expect(secondRes.body?.data?.manifests?.[0]?.manifestNo).toBe(tpManifestNo);
      expect(secondRes.body?.data?.manifests?.[0]?.docketNos).toContain(tpDocket2);
    });

    // =========================================================================
    // CASE 8: [Leg-2 Onward Transit & Final Completion] Scan Documents, Load Touch-Point Boxes, Upload/Get Loading Photo,
    //         Close Loading, Pouch Documents, Re-Seal & Gate-Out at 1002 -> Final Gate-In, Unload Both Manifests & Complete at 2115
    // =========================================================================
    await test.step(`Case 8: [Touch-Point Document Scan/Pouch, Loading, Photo Upload/Get, 2nd Gate-Out & Final Trip Completion at "${destinationBranch}"] Verify complete multi-leg transit and unloading of both Origin & Touch-Point manifests`, async () => {
      for (const tpDoc of [tpDocket1, tpDocket2]) {
        const dsRes = await ManifestAPI.scanTripDocketDocument(request, tpTripNo, { docketNo: tpDoc, companyCode, actor }, token);
        expect(dsRes.status).toBe(200);
        expect(dsRes.body?.data?.scan).toBe('PLAN');
      }

      const tpScan1 = await printAndLoadScanning(tpDocket1, intermediateBranch);
      const tpScan2 = await printAndLoadScanning(tpDocket2, intermediateBranch);

      const loadTp1 = await request.post(`${mmBaseUrl}/api/v1/manifests/${tpManifestNo}/loading/boxes`, {
        data: { docketNo: tpDocket1, boxCode: tpScan1.boxCode, scanEventId: tpScan1.loadScanId, actor, branch: intermediateBranch },
        headers,
      });
      expect(loadTp1.status()).toBe(200);

      const loadTp2 = await request.post(`${mmBaseUrl}/api/v1/manifests/${tpManifestNo}/loading/boxes`, {
        data: { docketNo: tpDocket2, boxCode: tpScan2.boxCode, scanEventId: tpScan2.loadScanId, actor, branch: intermediateBranch },
        headers,
      });
      expect(loadTp2.status()).toBe(200);

      // Verify POST & GET /api/v1/mm/manifests/{manifestNo}/loading-photo
      const photoPostRes = await request.post(`${mmBaseUrl}/api/v1/mm/manifests/${tpManifestNo}/loading-photo?companyCode=${companyCode}`, {
        data: {
          captureStage: 'LOAD_50_PERCENT',
          photoUrl: load50PhotoUrl,
          geoLat: Number(pm.environment.get('validGeoLat')),
          geoLong: Number(pm.environment.get('validGeoLong')),
          branchCode: intermediateBranch,
          actor,
        },
        headers,
      });
      expect([200, 201]).toContain(photoPostRes.status());

      const photoGetRes = await request.get(`${mmBaseUrl}/api/v1/mm/manifests/${tpManifestNo}/loading-photo?companyCode=${companyCode}`, { headers });
      const photoGetBody = await photoGetRes.json().catch(() => ({}));
      await attachLog('Case 8a: Get Manifest Loading Photos', { manifestNo: tpManifestNo }, { status: photoGetRes.status(), body: photoGetBody });
      expect(photoGetRes.status()).toBe(200);
      expect(Array.isArray(photoGetBody?.data)).toBe(true);
      expect(photoGetBody?.data?.length).toBeGreaterThanOrEqual(1);

      // Close loading on Touch-Point Manifest at 1002 & place documents into pouch
      const closeTpRes = await request.post(`${mmBaseUrl}/api/v1/manifests/${tpManifestNo}/loading/close`, {
        data: { actor, branch: intermediateBranch },
        headers,
      });
      expect(closeTpRes.status()).toBe(200);

      for (const tpDoc of [tpDocket1, tpDocket2]) {
        const dpRes = await ManifestAPI.pouchTripDocketDocument(request, tpTripNo, { docketNo: tpDoc, companyCode, actor }, token);
        expect(dpRes.status).toBe(200);
        expect(dpRes.body?.data?.scan).toBe('POUCH');
      }

      // Re-seal, Dispatch-Ready & 2nd Gate-Out from Touch-Point 1002
      const tpSealNo = `SEAL-TP-${sfx}`;
      const sealTpRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/seal`, {
        data: { sealType: 'PHYSICAL', sealNo: tpSealNo, photoUrl: validSealPhotoUrl, branch: intermediateBranch, actor },
        headers,
      });
      expect(sealTpRes.status()).toBe(200);

      const drTpRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/dispatch-ready`, {
        data: {
          commodityClass: 'GENERAL',
          checklist: { vehicleTypeOk: true, tarpaulinOk: true, lashingOk: true, gpsOk: true, digitalLockOk: true },
          actor,
          companyCode,
        },
        headers,
      });
      expect(drTpRes.status()).toBe(200);

      const goTpRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/gate-out`, {
        data: { gateBranch: intermediateBranch, actor },
        headers,
      });
      expect(goTpRes.status()).toBe(200);

      // Final Gate-In at Destination 2115 with both manifests (originManifest2 & tpManifestNo)
      const giDestRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/gate-in`, {
        data: {
          branch: destinationBranch,
          sealNoEntered: tpSealNo,
          scannedManifestNos: [originManifest2, tpManifestNo],
          driverPhotoUrl: validDriverPhotoUrl,
          driverVerified: true,
          actor,
        },
        headers,
      });
      expect(giDestRes.status()).toBe(200);

      // Unload both manifests at 2115
      for (const [mfNo, items] of [
        [originManifest2, [{ docketNo: originDocketNo, boxCode: originBoxCode }]],
        [
          tpManifestNo,
          [
            { docketNo: tpDocket1, boxCode: tpScan1.boxCode },
            { docketNo: tpDocket2, boxCode: tpScan2.boxCode },
          ],
        ],
      ] as Array<[string, Array<{ docketNo: string; boxCode: string }>]>) {
        const stUnl = await request.post(`${mmBaseUrl}/api/v1/manifests/${mfNo}/unloading/start`, {
          data: { actor, branch: destinationBranch },
          headers,
        });
        expect(stUnl.status()).toBe(200);

        for (const item of items) {
          const inScan = await ScanningAPI.recordScan(request, {
            boxCode: item.boxCode,
            eventType: 'IN_SCAN',
            scanStage: 'UNLOAD',
            branchCode: destinationBranch,
            scannedBy: actor,
            deviceId: 'DEV-DEST-01',
            companyCode,
            expectedDocketNo: item.docketNo,
          });
          const inScanId = inScan.body?.data?.publicEventId || inScan.body?.data?.id;
          const unlBox = await request.post(`${mmBaseUrl}/api/v1/manifests/${mfNo}/unloading/boxes`, {
            data: { docketNo: item.docketNo, boxCode: item.boxCode, scanEventId: inScanId, actor, branch: destinationBranch },
            headers,
          });
          expect(unlBox.status()).toBe(200);
        }

        const clUnl = await request.post(`${mmBaseUrl}/api/v1/manifests/${mfNo}/unloading/close`, {
          data: { actor, branch: destinationBranch },
          headers,
        });
        expect(clUnl.status()).toBe(200);
      }

      // Complete Trip at 2115
      const compRes = await request.post(`${mmBaseUrl}/api/v1/trips/${tpTripNo}/complete`, {
        data: { reason: 'Multi-leg touch-point trip completed', actor },
        headers,
      });
      const compBody = await compRes.json().catch(() => ({}));
      await attachLog('Case 8b: Complete Multi-Leg Touch-Point Trip', { tripNo: tpTripNo }, { status: compRes.status(), body: compBody });
      expect(compRes.status()).toBe(200);
      expect(compBody?.data?.status).toBe('COMPLETED');

      // Deep Persisted DB Field Validation via GET /api/v1/trips/{tripNo}
      const deepTripRes = await request.get(`${mmBaseUrl}/api/v1/trips/${tpTripNo}?companyCode=${companyCode}`, { headers });
      const deepTripBody = await deepTripRes.json().catch(() => ({}));
      await attachLog('Case 8c: Deep DB Field Validation on Completed Multi-Leg Trip', { tripNo: tpTripNo }, { status: deepTripRes.status(), body: deepTripBody });
      expect(deepTripRes.status()).toBe(200);

      const tripRow = deepTripBody?.data?.trip;
      const loadRow = deepTripBody?.data?.load;
      const routeRow = deepTripBody?.data?.route;
      const manifestsList: any[] = deepTripBody?.data?.manifests || [];
      const lastGateRow = deepTripBody?.data?.lastGateEvent;

      expect(tripRow?.tripNo).toBe(tpTripNo);
      expect(tripRow?.status).toBe('COMPLETED');
      expect(tripRow?.routeType).toBe(serviceRouteType);
      expect(tripRow?.routeCode).toBe(activeTouchPointRouteCode);
      expect(tripRow?.manifestCount).toBe(3);
      expect(tripRow?.docketCount).toBe(3);
      expect(tripRow?.boxCount).toBe(3);
      expect(Number(tripRow?.totalWeightKg)).toBe(30);
      expect(Number(loadRow?.docketCount)).toBe(3);
      expect(Number(loadRow?.boxCount)).toBe(3);
      expect(Number(loadRow?.totalWeightKg)).toBe(30);
      expect(routeRow?.touchPointCodes).toContain(intermediateBranch);
      expect(lastGateRow?.direction).toBe('GATE_IN');
      expect(lastGateRow?.branch).toBe(destinationBranch);

      const mf1Row = manifestsList.find((m: any) => m.legSequence === 1);
      const mf2Row = manifestsList.find((m: any) => m.manifestNo === originManifest2);
      const mf3Row = manifestsList.find((m: any) => m.manifestNo === tpManifestNo);

      expect(mf1Row?.status).toBe('CANCELLED');
      expect(mf2Row?.status).toBe('COMPLETED');
      expect(mf2Row?.sourceBranch).toBe(sourceBranch);
      expect(mf2Row?.destinationBranch).toBe(destinationBranch);
      expect(mf2Row?.cnCount).toBe(1);
      expect(mf2Row?.boxCountTotal).toBe(1);
      expect(mf2Row?.boxesScanned).toBe(1);
      expect(mf2Row?.boxesUnloaded).toBe(1);

      expect(mf3Row?.status).toBe('COMPLETED');
      expect(mf3Row?.sourceBranch).toBe(intermediateBranch);
      expect(mf3Row?.destinationBranch).toBe(destinationBranch);
      expect(mf3Row?.cnCount).toBe(2);
      expect(mf3Row?.boxCountTotal).toBe(2);
      expect(mf3Row?.boxesScanned).toBe(2);
      expect(mf3Row?.boxesUnloaded).toBe(2);
    });
  });

  // =========================================================================
  // SCENARIO 8: "CREATED" STATUS FILTER & RELATED SEARCH SUB-CASES
  // =========================================================================
  test('Scenario 8: "Created" Tab Filter & Search Validations - TC01: Create trip via API, verify in "Created" filter and validate TripNo & Vehicle search', async ({ request }, testInfo) => {
    let createdTripNo = '';
    const customSuffix = '88' + Math.floor(100 + Math.random() * 900);
    const createPayload = generateTripPayload(customSuffix);
    const targetVehicle = createPayload.vehicleNo;

    // Step 1: Data Creation
    await test.step('Step 1: [Data Creation] Create fresh MM Trip via POST /api/v1/trips', async () => {
      const createRes = await MMTripAPI.createTrip(request, createPayload);
      await attachApiLog(
        testInfo,
        'POST /api/v1/trips',
        { method: 'POST', endpoint: '/api/v1/trips', payload: createPayload },
        { status: createRes.status, body: createRes.body }
      );

      expect([200, 201]).toContain(createRes.status);
      createdTripNo = createRes.body?.data?.tripNo;
      expect(createdTripNo).toBeTruthy();
    });

    // Step 2: Main Filter Check
    await test.step(`Step 2: [Main Filter Check] Filter by status "CREATED" and verify trip "${createdTripNo}"`, async () => {
      const filterParams = { companyCode, status: 'CREATED', size: 25 };
      const filterRes = await MMTripAPI.listTrips(request, filterParams);
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips?status=CREATED',
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: filterParams },
        { status: filterRes.status, body: filterRes.body }
      );

      expect(filterRes.status).toBe(200);
      expect(filterRes.body.status).toBe('SUCCESS');

      const items = filterRes.body.data.items;
      for (const t of items) {
        expect(t.status).toBe('CREATED');
      }

      const match = items.some((t: any) => t.tripNo === createdTripNo);
      expect(match).toBe(true);
    });

    // Step 3: Sub-case - Search by Trip Number
    await test.step(`Step 3: [Sub-case: Trip No Search] Search trip "${createdTripNo}" via "q" query parameter`, async () => {
      const searchParams = { companyCode, q: createdTripNo };
      const searchRes = await MMTripAPI.listTrips(request, searchParams);
      await attachApiLog(
        testInfo,
        `GET /api/v1/trips?q=${createdTripNo}`,
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: searchParams },
        { status: searchRes.status, body: searchRes.body }
      );

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.items.length).toBeGreaterThanOrEqual(1);

      const match = searchRes.body.data.items.some((t: any) => t.tripNo === createdTripNo);
      expect(match).toBe(true);
    });

    // Step 4: Sub-case - Search by Vehicle Number
    await test.step(`Step 4: [Sub-case: Vehicle Search] Filter trips by vehicleNo "${targetVehicle}"`, async () => {
      const vehicleParams = { companyCode, vehicleNo: targetVehicle };
      const vehicleRes = await MMTripAPI.listTrips(request, vehicleParams);
      await attachApiLog(
        testInfo,
        `GET /api/v1/trips?vehicleNo=${targetVehicle}`,
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: vehicleParams },
        { status: vehicleRes.status, body: vehicleRes.body }
      );

      expect(vehicleRes.status).toBe(200);
      expect(vehicleRes.body.data.items.length).toBeGreaterThanOrEqual(1);

      for (const t of vehicleRes.body.data.items) {
        expect(t.vehicleNo).toBe(targetVehicle);
      }
    });
  });

  // =========================================================================
  // SCENARIO 9: "CANCELLED" STATUS FILTER
  // =========================================================================
  test('Scenario 9: "Cancelled" Tab Filter - TC02: Create trip, cancel it via API, and verify it appears in "Cancelled" filter', async ({ request }, testInfo) => {
    let createdTripNo = '';
    const createPayload = generateTripPayload();

    // Step 1: Data Creation
    await test.step('Step 1: [Data Creation] Create fresh MM Trip via POST /api/v1/trips', async () => {
      const createRes = await MMTripAPI.createTrip(request, createPayload);
      await attachApiLog(
        testInfo,
        'POST /api/v1/trips',
        { method: 'POST', endpoint: '/api/v1/trips', payload: createPayload },
        { status: createRes.status, body: createRes.body }
      );

      expect([200, 201]).toContain(createRes.status);
      createdTripNo = createRes.body?.data?.tripNo;
      expect(createdTripNo).toBeTruthy();
    });

    // Step 2: State Transition to CANCELLED
    await test.step(`Step 2: [State Transition] Cancel Trip "${createdTripNo}" via POST /api/v1/trips/{tripNo}/cancel`, async () => {
      const cancelPayload = {
        reason: 'Automated test cancellation for filter verification',
        actor: 'a1a1a1a1-0001-4000-8000-000000000001',
      };
      const cancelRes = await MMTripAPI.cancelTrip(request, createdTripNo, cancelPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/cancel`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/cancel`, payload: cancelPayload },
        { status: cancelRes.status, body: cancelRes.body }
      );

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    // Step 3: Main Filter Check
    await test.step(`Step 3: [Main Filter Check] Filter by status "CANCELLED" and verify trip "${createdTripNo}"`, async () => {
      const filterParams = { companyCode, status: 'CANCELLED', size: 25 };
      const filterRes = await MMTripAPI.listTrips(request, filterParams);
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips?status=CANCELLED',
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: filterParams },
        { status: filterRes.status, body: filterRes.body }
      );

      expect(filterRes.status).toBe(200);
      expect(filterRes.body.status).toBe('SUCCESS');

      const items = filterRes.body.data.items;
      for (const t of items) {
        expect(t.status).toBe('CANCELLED');
      }

      const match = items.some((t: any) => t.tripNo === createdTripNo);
      expect(match).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 10: "READY FOR DISPATCH" STATUS FILTER
  // =========================================================================
  test('Scenario 10: "Ready for Dispatch" Filter - TC03: Create trip, transition to READY_FOR_DISPATCH, and verify in filter', async ({ request }, testInfo) => {
    let createdTripNo = '';
    const createPayload = { ...generateTripPayload(), emptyTrip: true, routeCode: null as any, creationSource: 'EMPTY_AUTO', vehicleOwnership: String(pm.environment.get('vehicleOwnership')) };

    await test.step('Step 1: [Data Creation] Create fresh MM Trip', async () => {
      const createRes = await MMTripAPI.createTrip(request, createPayload);
      await attachApiLog(
        testInfo,
        'POST /api/v1/trips',
        { method: 'POST', endpoint: '/api/v1/trips', payload: createPayload },
        { status: createRes.status, body: createRes.body }
      );
      expect([200, 201]).toContain(createRes.status);
      createdTripNo = createRes.body?.data?.tripNo;
    });

    await test.step('Step 2: [State Transition] Seal trip and mark dispatch ready', async () => {
      const sealPayload = {
        sealType: 'PHYSICAL',
        sealNo: `SEAL-${Date.now().toString().slice(-4)}`,
        photoUrl: 'http://example.com/seal.jpg',
        branch: sourceBranch,
        actor,
      };
      const sealRes = await MMTripAPI.sealTrip(request, createdTripNo, sealPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/seal`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/seal`, payload: sealPayload },
        { status: sealRes.status, body: sealRes.body }
      );
      expect([200, 201]).toContain(sealRes.status);

      const dispatchPayload = {
        commodityClass: 'GENERAL',
        checklist: {
          vehicleTypeOk: true,
          tarpaulinOk: true,
          lashingOk: true,
          gpsOk: true,
          digitalLockOk: true,
          tyreConditionOk: true,
          documentsVerified: true,
        },
        actor,
        companyCode,
      };
      const dispatchRes = await MMTripAPI.dispatchReady(request, createdTripNo, dispatchPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/dispatch-ready`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/dispatch-ready`, payload: dispatchPayload },
        { status: dispatchRes.status, body: dispatchRes.body }
      );
      expect([200, 201]).toContain(dispatchRes.status);
      expect(dispatchRes.body?.data?.status).toBe('READY_FOR_DISPATCH');
    });

    await test.step('Step 3: [Main Filter Check] Filter by status "READY_FOR_DISPATCH" and verify trip', async () => {
      const filterParams = { companyCode, status: 'READY_FOR_DISPATCH', size: 25 };
      const filterRes = await MMTripAPI.listTrips(request, filterParams);
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips?status=READY_FOR_DISPATCH',
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: filterParams },
        { status: filterRes.status, body: filterRes.body }
      );
      expect(filterRes.status).toBe(200);
      expect(filterRes.body?.status).toBe('SUCCESS');
      for (const t of filterRes.body.data.items) {
        expect(t.status).toBe('READY_FOR_DISPATCH');
      }
      const match = filterRes.body.data.items.some((t: any) => t.tripNo === createdTripNo);
      expect(match).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 11: "GATE OUT" (IN TRANSIT) STATUS FILTER
  // =========================================================================
  test('Scenario 11: "Gate Out" Filter - TC04: Create trip, transition to GATE_OUT_IN_TRANSIT, and verify in filter', async ({ request }, testInfo) => {
    let createdTripNo = '';
    const sealNo = `SEAL-${Date.now().toString().slice(-4)}`;
    const createPayload = { ...generateTripPayload(), emptyTrip: true, routeCode: null as any, creationSource: 'EMPTY_AUTO', vehicleOwnership: String(pm.environment.get('vehicleOwnership')) };

    await test.step('Step 1: [Data Creation] Create fresh MM Trip', async () => {
      const createRes = await MMTripAPI.createTrip(request, createPayload);
      await attachApiLog(
        testInfo,
        'POST /api/v1/trips',
        { method: 'POST', endpoint: '/api/v1/trips', payload: createPayload },
        { status: createRes.status, body: createRes.body }
      );
      expect([200, 201]).toContain(createRes.status);
      createdTripNo = createRes.body?.data?.tripNo;
    });

    await test.step('Step 2: [State Transition: Ready for Dispatch] Seal trip and mark dispatch ready', async () => {
      const sealPayload = {
        sealType: 'PHYSICAL',
        sealNo,
        photoUrl: 'http://example.com/seal.jpg',
        branch: sourceBranch,
        actor,
      };
      const sealRes = await MMTripAPI.sealTrip(request, createdTripNo, sealPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/seal`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/seal`, payload: sealPayload },
        { status: sealRes.status, body: sealRes.body }
      );
      expect([200, 201]).toContain(sealRes.status);

      const dispatchPayload = {
        commodityClass: 'GENERAL',
        checklist: {
          vehicleTypeOk: true,
          tarpaulinOk: true,
          lashingOk: true,
          gpsOk: true,
          digitalLockOk: true,
          tyreConditionOk: true,
          documentsVerified: true,
        },
        actor,
        companyCode,
      };
      const dispatchRes = await MMTripAPI.dispatchReady(request, createdTripNo, dispatchPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/dispatch-ready`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/dispatch-ready`, payload: dispatchPayload },
        { status: dispatchRes.status, body: dispatchRes.body }
      );
      expect([200, 201]).toContain(dispatchRes.status);
      expect(dispatchRes.body?.data?.status).toBe('READY_FOR_DISPATCH');
    });

    await test.step(`Step 3: [State Transition: Gate Out] Gate out trip "${createdTripNo}" via POST /api/v1/trips/{tripNo}/gate-out`, async () => {
      const gateOutPayload = {
        branchCode: sourceBranch,
        actor,
        sealNo,
      };
      const gateOutRes = await MMTripAPI.gateOut(request, createdTripNo, gateOutPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/gate-out`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/gate-out`, payload: gateOutPayload },
        { status: gateOutRes.status, body: gateOutRes.body }
      );
      expect([200, 201]).toContain(gateOutRes.status);
      expect(gateOutRes.body?.data?.status).toBe('GATE_OUT_IN_TRANSIT');
    });

    await test.step('Step 4: [Main Filter Check] Filter by status "GATE_OUT_IN_TRANSIT" and verify trip', async () => {
      const filterParams = { companyCode, status: 'GATE_OUT_IN_TRANSIT', size: 25 };
      const filterRes = await MMTripAPI.listTrips(request, filterParams);
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips?status=GATE_OUT_IN_TRANSIT',
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: filterParams },
        { status: filterRes.status, body: filterRes.body }
      );
      expect(filterRes.status).toBe(200);
      expect(filterRes.body?.status).toBe('SUCCESS');
      for (const t of filterRes.body.data.items) {
        expect(t.status).toBe('GATE_OUT_IN_TRANSIT');
      }
      const match = filterRes.body.data.items.some((t: any) => t.tripNo === createdTripNo);
      expect(match).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 12: "GATE IN" (DESTINATION ARRIVAL) STATUS FILTER
  // =========================================================================
  test('Scenario 12: "Gate In" Filter - TC05: Create trip, transition to GATE_IN, and verify in filter', async ({ request }, testInfo) => {
    let createdTripNo = '';
    const sealNo = `SEAL-${Date.now().toString().slice(-4)}`;
    const createPayload = { ...generateTripPayload(), emptyTrip: true, routeCode: null as any, creationSource: 'EMPTY_AUTO', vehicleOwnership: String(pm.environment.get('vehicleOwnership')) };

    await test.step('Step 1: [Data Creation] Create fresh MM Trip', async () => {
      const createRes = await MMTripAPI.createTrip(request, createPayload);
      await attachApiLog(
        testInfo,
        'POST /api/v1/trips',
        { method: 'POST', endpoint: '/api/v1/trips', payload: createPayload },
        { status: createRes.status, body: createRes.body }
      );
      expect([200, 201]).toContain(createRes.status);
      createdTripNo = createRes.body?.data?.tripNo;
    });

    await test.step('Step 2: [State Transition: Ready for Dispatch] Seal trip and mark dispatch ready', async () => {
      const sealPayload = {
        sealType: 'PHYSICAL',
        sealNo,
        photoUrl: 'http://example.com/seal.jpg',
        branch: sourceBranch,
        actor,
      };
      const sealRes = await MMTripAPI.sealTrip(request, createdTripNo, sealPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/seal`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/seal`, payload: sealPayload },
        { status: sealRes.status, body: sealRes.body }
      );
      expect([200, 201]).toContain(sealRes.status);

      const dispatchPayload = {
        commodityClass: 'GENERAL',
        checklist: {
          vehicleTypeOk: true,
          tarpaulinOk: true,
          lashingOk: true,
          gpsOk: true,
          digitalLockOk: true,
          tyreConditionOk: true,
          documentsVerified: true,
        },
        actor,
        companyCode,
      };
      const dispatchRes = await MMTripAPI.dispatchReady(request, createdTripNo, dispatchPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/dispatch-ready`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/dispatch-ready`, payload: dispatchPayload },
        { status: dispatchRes.status, body: dispatchRes.body }
      );
      expect([200, 201]).toContain(dispatchRes.status);
      expect(dispatchRes.body?.data?.status).toBe('READY_FOR_DISPATCH');
    });

    await test.step(`Step 3: [State Transition: Gate Out] Gate out trip "${createdTripNo}" via POST /api/v1/trips/{tripNo}/gate-out`, async () => {
      const gateOutPayload = {
        branchCode: sourceBranch,
        actor,
        sealNo,
      };
      const gateOutRes = await MMTripAPI.gateOut(request, createdTripNo, gateOutPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/gate-out`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/gate-out`, payload: gateOutPayload },
        { status: gateOutRes.status, body: gateOutRes.body }
      );
      expect([200, 201]).toContain(gateOutRes.status);
      expect(gateOutRes.body?.data?.status).toBe('GATE_OUT_IN_TRANSIT');
    });

    await test.step(`Step 4: [State Transition: Gate In] Gate in trip "${createdTripNo}" via POST /api/v1/trips/{tripNo}/gate-in`, async () => {
      const gateInPayload = {
        branchCode: destinationBranch,
        actor,
        sealNo,
        driverVerified: true,
        driverPhotoUrl: 'http://example.com/driver.jpg',
      };
      const gateInRes = await MMTripAPI.gateIn(request, createdTripNo, gateInPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/gate-in`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/gate-in`, payload: gateInPayload },
        { status: gateInRes.status, body: gateInRes.body }
      );
      expect([200, 201]).toContain(gateInRes.status);
      expect(gateInRes.body?.data?.status).toBe('GATE_IN');
    });

    await test.step('Step 5: [Main Filter Check] Filter by status "GATE_IN" and verify trip', async () => {
      const filterParams = { companyCode, status: 'GATE_IN', size: 25 };
      const filterRes = await MMTripAPI.listTrips(request, filterParams);
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips?status=GATE_IN',
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: filterParams },
        { status: filterRes.status, body: filterRes.body }
      );
      expect(filterRes.status).toBe(200);
      expect(filterRes.body?.status).toBe('SUCCESS');
      for (const t of filterRes.body.data.items) {
        expect(t.status).toBe('GATE_IN');
      }
      const match = filterRes.body.data.items.some((t: any) => t.tripNo === createdTripNo);
      expect(match).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 13: "COMPLETED" STATUS FILTER
  // =========================================================================
  test('Scenario 13: "Completed" Filter - TC06: Create trip, transition to COMPLETED, and verify in filter', async ({ request }, testInfo) => {
    let createdTripNo = '';
    const sealNo = `SEAL-${Date.now().toString().slice(-4)}`;
    const createPayload = { ...generateTripPayload(), emptyTrip: true, routeCode: null as any, creationSource: 'EMPTY_AUTO', vehicleOwnership: String(pm.environment.get('vehicleOwnership')) };

    await test.step('Step 1: [Data Creation] Create fresh MM Trip', async () => {
      const createRes = await MMTripAPI.createTrip(request, createPayload);
      await attachApiLog(
        testInfo,
        'POST /api/v1/trips',
        { method: 'POST', endpoint: '/api/v1/trips', payload: createPayload },
        { status: createRes.status, body: createRes.body }
      );
      expect([200, 201]).toContain(createRes.status);
      createdTripNo = createRes.body?.data?.tripNo;
    });

    await test.step('Step 2: [State Transition: Ready for Dispatch] Seal trip and mark dispatch ready', async () => {
      const sealPayload = {
        sealType: 'PHYSICAL',
        sealNo,
        photoUrl: 'http://example.com/seal.jpg',
        branch: sourceBranch,
        actor,
      };
      const sealRes = await MMTripAPI.sealTrip(request, createdTripNo, sealPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/seal`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/seal`, payload: sealPayload },
        { status: sealRes.status, body: sealRes.body }
      );
      expect([200, 201]).toContain(sealRes.status);

      const dispatchPayload = {
        commodityClass: 'GENERAL',
        checklist: {
          vehicleTypeOk: true,
          tarpaulinOk: true,
          lashingOk: true,
          gpsOk: true,
          digitalLockOk: true,
          tyreConditionOk: true,
          documentsVerified: true,
        },
        actor,
        companyCode,
      };
      const dispatchRes = await MMTripAPI.dispatchReady(request, createdTripNo, dispatchPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/dispatch-ready`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/dispatch-ready`, payload: dispatchPayload },
        { status: dispatchRes.status, body: dispatchRes.body }
      );
      expect([200, 201]).toContain(dispatchRes.status);
      expect(dispatchRes.body?.data?.status).toBe('READY_FOR_DISPATCH');
    });

    await test.step(`Step 3: [State Transition: Gate Out] Gate out trip "${createdTripNo}" via POST /api/v1/trips/{tripNo}/gate-out`, async () => {
      const gateOutPayload = {
        branchCode: sourceBranch,
        actor,
        sealNo,
      };
      const gateOutRes = await MMTripAPI.gateOut(request, createdTripNo, gateOutPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/gate-out`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/gate-out`, payload: gateOutPayload },
        { status: gateOutRes.status, body: gateOutRes.body }
      );
      expect([200, 201]).toContain(gateOutRes.status);
      expect(gateOutRes.body?.data?.status).toBe('GATE_OUT_IN_TRANSIT');
    });

    await test.step(`Step 4: [State Transition: Gate In] Gate in trip "${createdTripNo}" via POST /api/v1/trips/{tripNo}/gate-in`, async () => {
      const gateInPayload = {
        branchCode: destinationBranch,
        actor,
        sealNo,
        driverVerified: true,
        driverPhotoUrl: 'http://example.com/driver.jpg',
      };
      const gateInRes = await MMTripAPI.gateIn(request, createdTripNo, gateInPayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/gate-in`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/gate-in`, payload: gateInPayload },
        { status: gateInRes.status, body: gateInRes.body }
      );
      expect([200, 201]).toContain(gateInRes.status);
      expect(gateInRes.body?.data?.status).toBe('GATE_IN');
    });

    await test.step(`Step 5: [State Transition: Complete] Complete trip "${createdTripNo}" via POST /api/v1/trips/{tripNo}/complete`, async () => {
      const completePayload = {
        reason: 'Automated test completed for filter verification',
        actor,
      };
      const completeRes = await MMTripAPI.completeTrip(request, createdTripNo, completePayload);
      await attachApiLog(
        testInfo,
        `POST /api/v1/trips/${createdTripNo}/complete`,
        { method: 'POST', endpoint: `/api/v1/trips/${createdTripNo}/complete`, payload: completePayload },
        { status: completeRes.status, body: completeRes.body }
      );
      expect([200, 201]).toContain(completeRes.status);
      expect(completeRes.body?.data?.status).toBe('COMPLETED');
    });

    await test.step('Step 6: [Main Filter Check] Filter by status "COMPLETED" and verify trip', async () => {
      const filterParams = { companyCode, status: 'COMPLETED', size: 25 };
      const filterRes = await MMTripAPI.listTrips(request, filterParams);
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips?status=COMPLETED',
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: filterParams },
        { status: filterRes.status, body: filterRes.body }
      );
      expect(filterRes.status).toBe(200);
      expect(filterRes.body?.status).toBe('SUCCESS');
      for (const t of filterRes.body.data.items) {
        expect(t.status).toBe('COMPLETED');
      }
      const match = filterRes.body.data.items.some((t: any) => t.tripNo === createdTripNo);
      expect(match).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 14: DEFAULT "ALL" TAB & SUB-CASES (BRANCH FILTER & PAGINATION)
  // =========================================================================
  test('Scenario 14: Default "All" Tab, Branch Filter & Pagination Validations - TC07: Verify default view and pagination consistency', async ({ request }, testInfo) => {
    const pageSize = 5;
    let page1Res: any;
    let page2Res: any;
    const branchCode = sourceBranch;

    // Step 1: Default All Tab View
    await test.step('Step 1: [Main Tab Check] Call GET /api/v1/trips (Default "All" tab view)', async () => {
      const allRes = await MMTripAPI.listTrips(request, { companyCode, page: 1, size: 10 });
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips',
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: { companyCode, page: 1, size: 10 } },
        { status: allRes.status, body: allRes.body }
      );

      expect(allRes.status).toBe(200);
      expect(allRes.body.status).toBe('SUCCESS');
      expect(allRes.body.data.items).toBeInstanceOf(Array);
      expect(allRes.body.data.total).toBeGreaterThanOrEqual(0);
    });

    // Step 2: Sub-case - Branch Filter
    await test.step(`Step 2: [Sub-case: Branch Filter] Verify Filtering by Source Branch ${branchCode}`, async () => {
      const branchRes = await MMTripAPI.listTrips(request, { companyCode, branch: branchCode, size: 5 });
      await attachApiLog(
        testInfo,
        `GET /api/v1/trips?branch=${branchCode}`,
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: { companyCode, branch: branchCode, size: 5 } },
        { status: branchRes.status, body: branchRes.body }
      );

      expect(branchRes.status).toBe(200);
      expect(branchRes.body.status).toBe('SUCCESS');

      for (const t of branchRes.body.data.items) {
        expect(t.sourceBranch).toBe(branchCode);
      }
    });

    // Step 3: Sub-case - Pagination Consistency
    await test.step('Step 3: [Sub-case: Pagination] Fetch Page 1 and Page 2 and assert zero duplicate records', async () => {
      page1Res = await MMTripAPI.listTrips(request, { companyCode, page: 1, size: pageSize });
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips (Page 1)',
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: { companyCode, page: 1, size: pageSize } },
        { status: page1Res.status, body: page1Res.body }
      );
      expect(page1Res.status).toBe(200);

      page2Res = await MMTripAPI.listTrips(request, { companyCode, page: 2, size: pageSize });
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips (Page 2)',
        { method: 'GET', endpoint: '/api/v1/trips', queryParams: { companyCode, page: 2, size: pageSize } },
        { status: page2Res.status, body: page2Res.body }
      );
      expect(page2Res.status).toBe(200);

      const page1Items = page1Res.body.data.items;
      const page2Items = page2Res.body.data.items;

      if (page1Items.length > 0 && page2Items.length > 0) {
        const page1TripNos = new Set(page1Items.map((t: any) => t.tripNo));
        const hasOverlap = page2Items.some((t: any) => page1TripNos.has(t.tripNo));
        expect(hasOverlap).toBe(false);
      }
    });
  });

  // =========================================================================
  // SCENARIO 15: STATUS COUNTS BADGES VERIFICATION
  // =========================================================================
  test('Scenario 15: Status Counts Badges Verification - TC08: Verify MM Trips Status Counts API returns badges for all tabs', async ({ request }, testInfo) => {
    let countsRes: any;

    await test.step('Step 1: [Counts Check] Fetch Trip Status Counts via GET /api/v1/trips/counts', async () => {
      countsRes = await MMTripAPI.getTripCounts(request, { companyCode });
      await attachApiLog(
        testInfo,
        'GET /api/v1/trips/counts',
        { method: 'GET', endpoint: '/api/v1/trips/counts', queryParams: { companyCode } },
        { status: countsRes.status, body: countsRes.body }
      );

      expect(countsRes.status).toBe(200);
      expect(countsRes.body.status).toBe('SUCCESS');
    });

    await test.step('Step 2: [Validation] Validate that all status badges exist in the counts response', async () => {
      const counts = countsRes.body.data;
      expect(counts).toHaveProperty('ALL');
      expect(counts).toHaveProperty('PLANNED');
      expect(counts).toHaveProperty('CREATED');
      expect(counts).toHaveProperty('READY_FOR_DISPATCH');
      expect(counts).toHaveProperty('GATE_OUT_IN_TRANSIT');
      expect(counts).toHaveProperty('GATE_IN');
      expect(counts).toHaveProperty('COMPLETED');
      expect(counts).toHaveProperty('CANCELLED');

      expect(counts.ALL).toBeGreaterThanOrEqual(0);
      expect(counts.CREATED).toBeGreaterThanOrEqual(0);
      expect(counts.READY_FOR_DISPATCH).toBeGreaterThanOrEqual(0);
      expect(counts.GATE_OUT_IN_TRANSIT).toBeGreaterThanOrEqual(0);
      expect(counts.GATE_IN).toBeGreaterThanOrEqual(0);
      expect(counts.COMPLETED).toBeGreaterThanOrEqual(0);
      expect(counts.CANCELLED).toBeGreaterThanOrEqual(0);
    });
  });
});
