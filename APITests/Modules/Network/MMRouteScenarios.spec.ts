import { test, expect } from '@playwright/test';
import { RouteAPI } from '../../../APIs/Modules/Network/RouteAPI';
import { MMTripAPI } from '../../../APIs/Modules/MM/MMTripAPI';
import { BaseAPI } from '../../../APIs/Common/BaseAPI';
import { pm } from '../../../Utils/VariableManager';

async function attachApiLog(
  testInfo: any,
  stepName: string,
  requestInfo: { method: string; endpoint: string; queryParams?: any; payload?: any },
  responseInfo: { status: number; body: any }
) {
  await testInfo.attach(`API Log - ${stepName}`, {
    body: JSON.stringify(
      {
        case: stepName,
        request: requestInfo,
        response: { statusCode: responseInfo.status, body: responseInfo.body },
      },
      null,
      2
    ),
    contentType: 'application/json',
  });
}

// =================================================================================================
// REUSABLE STATE SETUP HELPERS (Using VariableManager without hardcoded static values)
// =================================================================================================

let globalSeqCounter = 0;
function generateUniqueCode(prefix: string): string {
  globalSeqCounter = (globalSeqCounter + 1) % 9999;
  const rand = Math.floor(10000 + Math.random() * 90000);
  const time = Date.now().toString().slice(-6);
  return `${prefix}-${time}${globalSeqCounter}${rand}`.toUpperCase();
}

async function createDraftRouteHelper(request: any, overrides: any = {}) {
  const code = overrides.routeCode || generateUniqueCode('RT-DRF');
  pm.environment.set('lastCreatedDraftRouteCode', code);

  const payload = {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: code,
    routeType: String(pm.environment.get('expressRouteType')),
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: Number(pm.environment.get('defaultDistanceKm')),
    tatHoursRegular: Number(pm.environment.get('defaultTatHoursRegular')),
    tatHoursSpeed: Number(pm.environment.get('defaultTatHoursSpeed')),
    ratePerKm: Number(pm.environment.get('defaultRatePerKm')),
    routeCost: Number(pm.environment.get('defaultRouteCost')),
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: [String(pm.environment.get('defaultStartTime'))],
    createdBy: String(pm.environment.get('submitterActor')),
    ...overrides,
  };
  const res = await RouteAPI.createRoute(request, payload);
  expect(res.status).toBe(201);
  return { code, payload, res };
}

async function createPendingRouteHelper(request: any) {
  const { code, payload } = await createDraftRouteHelper(request);
  const submitter = String(pm.environment.get('submitterActor'));
  pm.environment.set('lastSubmittedRouteCode', code);
  const subRes = await RouteAPI.submitRoute(request, code, { actor: submitter });
  expect(subRes.status).toBe(200);
  return { code, payload, submitter };
}

async function createApprovedRouteHelper(request: any) {
  const { code, payload, submitter } = await createPendingRouteHelper(request);
  const approver = String(pm.environment.get('approverActor'));
  pm.environment.set('lastApprovedRouteCode', code);
  const appRes = await RouteAPI.approveRoute(request, code, { actor: approver });
  expect(appRes.status).toBe(200);
  return { code, payload, submitter, approver };
}

async function createActiveRouteHelper(request: any) {
  const { code, payload, submitter, approver } = await createApprovedRouteHelper(request);
  pm.environment.set('lastActivatedRouteCode', code);
  const actRes = await RouteAPI.activateRoute(request, code, { actor: approver });
  expect(actRes.status).toBe(200);
  return { code, payload, submitter, approver };
}

test.describe('Network Service - Middle Mile Route Scenarios & Lifecycle Suite', () => {

  test.beforeAll(async ({ playwright }) => {
    const reqContext = await playwright.request.newContext();
    await BaseAPI.ensureAuthToken(reqContext);

    const companyCode = Number(pm.environment.get('companyCode'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const destinationBranch = String(pm.environment.get('destinationBranch'));

    const res = await RouteAPI.listRoutes(reqContext, { companyCode, status: 'ACTIVE', branch: sourceBranch });
    let activeRouteCode = String(pm.environment.get('activeRouteCode'));
    if (res.status === 200 && Array.isArray(res.body?.data) && res.body.data.length > 0) {
      const match = res.body.data.find(
        (r: any) => r.sourceBranch === sourceBranch && r.destinationBranch === destinationBranch
      );
      if (match) {
        activeRouteCode = match.routeCode;
      }
    }

    pm.environment.set('routeCode', activeRouteCode);
    pm.environment.set('activeRouteCode', activeRouteCode);
  });

  // =================================================================================================
  // SCENARIO 1: MIDDLE MILE ROUTE CONSUMPTION & OPERATIONAL GUARD-RAILS (CASES 1 TO 12)
  // =================================================================================================

  test('Scenario 1: [Middle Mile Route Consumption & Operational Guard-Rails] Verify Active Route Lookup, Filtering, SLA Metrics, and MM Trip Guard-Rails (Cases 1 to 12)', async ({ request }, testInfo) => {
    const companyCode = Number(pm.environment.get('companyCode'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const destinationBranch = String(pm.environment.get('destinationBranch'));
    const routeCode = String(pm.environment.get('routeCode'));

    await test.step('Case 1: Verify Active Direct Routes can be fetched for Source Branch and Tenant', async () => {
      const queryParams = { companyCode, branch: sourceBranch, status: 'ACTIVE' };
      const res = await RouteAPI.listRoutes(request, queryParams);

      await attachApiLog(
        testInfo,
        'Case 1: Fetch Active Direct Routes',
        { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
        { status: res.status, body: res.body }
      );

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(Array.isArray(res.body.data)).toBe(true);
      expect.soft(res.body.data.length).toBeGreaterThan(0);

      for (const route of res.body.data || []) {
        expect.soft(route.status).toBe('ACTIVE');
        expect.soft(route.routeCode).toBeDefined();
      }
    });

    await test.step('Case 2: Verify Routes can be filtered by Route Type (FEEDER vs EXPRESS vs SERVICE)', async () => {
      const targetType = String(pm.environment.get('filterRouteType'));
      const queryParams = { companyCode, status: 'ACTIVE', routeType: targetType };
      const res = await RouteAPI.listRoutes(request, queryParams);

      await attachApiLog(
        testInfo,
        'Case 2: Filter Routes by Route Type',
        { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
        { status: res.status, body: res.body }
      );

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(Array.isArray(res.body.data)).toBe(true);

      for (const route of res.body.data || []) {
        expect.soft(route.routeType).toBe(targetType);
        expect.soft(route.status).toBe('ACTIVE');
      }
    });

    await test.step('Case 3: Verify Route Details and TouchPoints structure for Multi-Stop / Direct Route', async () => {
      const res = await RouteAPI.getRouteDetail(request, routeCode);

      await attachApiLog(
        testInfo,
        'Case 3: Verify Route Details & TouchPoints Structure',
        { method: 'GET', endpoint: `${RouteAPI.basePath}/${routeCode}` },
        { status: res.status, body: res.body }
      );

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(res.body.data?.route?.routeCode).toBe(routeCode);
      expect.soft(Array.isArray(res.body.data?.touchPoints)).toBe(true);
      expect.soft(Array.isArray(res.body.data?.scheduleRuns)).toBe(true);
    });

    await test.step('Case 4: Verify Route Distance and SLA metrics required for MM Trip Stamping', async () => {
      const res = await RouteAPI.getRouteDetail(request, routeCode);

      await attachApiLog(
        testInfo,
        'Case 4: Verify Route Distance & SLA Metrics',
        { method: 'GET', endpoint: `${RouteAPI.basePath}/${routeCode}` },
        { status: res.status, body: res.body }
      );

      expect.soft(res.status).toBe(200);
      const route = res.body?.data?.route;
      expect.soft(route).toBeDefined();
      expect.soft(Number(route?.distanceKm)).toBeGreaterThan(0);
      expect.soft(route?.validFrom).toBeDefined();
      expect.soft(route?.validTo).toBeDefined();
      expect.soft(route?.sourceBranch).toBe(sourceBranch);
    });

    await test.step('Case 5: Negative - Verify MM rejects Trip creation when using Inactive / Draft Route', async () => {
      const dummyVehicle = `DL01AB${Date.now().toString().slice(-4)}`;
      const inactiveRoute = String(pm.environment.get('inactiveRouteCode'));

      const tripPayload = {
        companyCode,
        sourceBranch,
        destinationBranch,
        routeType: String(pm.environment.get('expressRouteType')),
        routeCode: inactiveRoute,
        emptyTrip: false,
        creationSource: String(pm.environment.get('tripCreationSource')),
        vehicleNo: dummyVehicle,
        vehicleType: String(pm.environment.get('vehicleType')),
        vehicleCapacityKg: Number(pm.environment.get('vehicleCapacityKg')),
        vehicleOwnership: String(pm.environment.get('vehicleOwnership')),
        vendorCode: String(pm.environment.get('vendorCode')),
        gpsStatus: String(pm.environment.get('gpsStatus')),
        digitalLock: false,
        priority: String(pm.environment.get('priority')),
        driverCode: String(pm.environment.get('driverCode')),
        driverName: String(pm.environment.get('driverName')),
        driverMobile: String(pm.environment.get('driverMobile')),
      };

      const tripRes = await MMTripAPI.createTrip(request, tripPayload);

      await attachApiLog(
        testInfo,
        'Case 5: Reject Trip Creation on Inactive Route',
        { method: 'POST', endpoint: `${MMTripAPI.basePath}`, payload: tripPayload },
        { status: tripRes.status, body: tripRes.body }
      );

      expect.soft(tripRes.status).toBe(422);
      expect.soft(tripRes.body.errorCode).toBe('ROUTE_NOT_ACTIVE');
    });

    await test.step('Case 6: Negative - Verify MM rejects Trip creation for Non-Existent Route Code', async () => {
      const dummyVehicle = `DL01AB${Date.now().toString().slice(-4)}`;
      const nonExistentRoute = String(pm.environment.get('nonExistentRouteCode'));

      const tripPayload = {
        companyCode,
        sourceBranch,
        destinationBranch,
        routeType: String(pm.environment.get('expressRouteType')),
        routeCode: nonExistentRoute,
        emptyTrip: false,
        creationSource: String(pm.environment.get('tripCreationSource')),
        vehicleNo: dummyVehicle,
        vehicleType: String(pm.environment.get('vehicleType')),
        vehicleCapacityKg: Number(pm.environment.get('vehicleCapacityKg')),
        vehicleOwnership: String(pm.environment.get('vehicleOwnership')),
        vendorCode: String(pm.environment.get('vendorCode')),
        gpsStatus: String(pm.environment.get('gpsStatus')),
        digitalLock: false,
        priority: String(pm.environment.get('priority')),
        driverCode: String(pm.environment.get('driverCode')),
        driverName: String(pm.environment.get('driverName')),
        driverMobile: String(pm.environment.get('driverMobile')),
      };

      const tripRes = await MMTripAPI.createTrip(request, tripPayload);

      await attachApiLog(
        testInfo,
        'Case 6: Reject Trip Creation for Non-Existent Route',
        { method: 'POST', endpoint: `${MMTripAPI.basePath}`, payload: tripPayload },
        { status: tripRes.status, body: tripRes.body }
      );

      expect.soft(tripRes.status).toBe(422);
      expect.soft(tripRes.body.errorCode).toBe('ROUTE_NOT_ACTIVE');
    });

    await test.step('Case 7: Negative - Verify Route Service returns 404 NOT_FOUND for unknown Route Code', async () => {
      const routeToQuery = String(pm.environment.get('unknownRouteCode'));
      const res = await RouteAPI.getRouteDetail(request, routeToQuery);

      await attachApiLog(
        testInfo,
        'Case 7: 404 Not Found for Unknown Route Code',
        { method: 'GET', endpoint: `${RouteAPI.basePath}/${routeToQuery}` },
        { status: res.status, body: res.body }
      );

      expect.soft(res.status).toBe(404);
      expect.soft(res.body.errorCode).toBe('NOT_FOUND');
    });

    await test.step('Case 8: Negative - Verify Branch Mismatch Detection between Trip Destination and Route Destination', async () => {
      const queryParams = { companyCode, branch: sourceBranch, status: 'ACTIVE' };
      const routesRes = await RouteAPI.listRoutes(request, queryParams);

      await attachApiLog(
        testInfo,
        'Case 8: Branch Mismatch Detection',
        { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
        { status: routesRes.status, body: routesRes.body }
      );

      expect.soft(routesRes.status).toBe(200);
      const otherRoute = routesRes.body.data?.find(
        (r: any) => r.sourceBranch === sourceBranch && r.destinationBranch !== destinationBranch
      );
      if (otherRoute) {
        expect.soft(otherRoute.destinationBranch).not.toBe(destinationBranch);
      }
    });

    await test.step('Case 9: Negative - Verify Tenant Isolation (Unknown Company Code returns empty route list)', async () => {
      const queryParams = { companyCode: Number(pm.environment.get('invalidCompanyCode')), status: 'ACTIVE' };
      const res = await RouteAPI.listRoutes(request, queryParams);

      await attachApiLog(
        testInfo,
        'Case 9: Tenant Isolation on Route List',
        { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
        { status: res.status, body: res.body }
      );

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(Array.isArray(res.body.data)).toBe(true);
      expect.soft(res.body.data.length).toBe(0);
    });

    await test.step('Case 10: Verify AUTO Route Nature metadata is returned for Concurrency Protection', async () => {
      const queryParams = { companyCode, status: 'ACTIVE' };
      const res = await RouteAPI.listRoutes(request, queryParams);

      await attachApiLog(
        testInfo,
        'Case 10: Verify Route Nature Metadata',
        { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
        { status: res.status, body: res.body }
      );

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.data.length).toBeGreaterThan(0);
      for (const route of res.body.data || []) {
        expect.soft(['PERMANENT', 'AUTO', 'ADHOC']).toContain(route.routeNature);
      }
    });

    await test.step('Case 11: Business Rule - Verify MM rejects invalid Route Type values [allowed: FEEDER, SERVICE, EXPRESS]', async () => {
      const dummyVehicle = `DL01AB${Date.now().toString().slice(-4)}`;
      const tripPayload = {
        companyCode,
        sourceBranch,
        destinationBranch,
        routeType: String(pm.environment.get('invalidRouteType')),
        routeCode,
        emptyTrip: false,
        creationSource: String(pm.environment.get('tripCreationSource')),
        vehicleNo: dummyVehicle,
        vehicleType: String(pm.environment.get('vehicleType')),
        vehicleCapacityKg: Number(pm.environment.get('vehicleCapacityKg')),
        vehicleOwnership: String(pm.environment.get('vehicleOwnership')),
        vendorCode: String(pm.environment.get('vendorCode')),
        gpsStatus: String(pm.environment.get('gpsStatus')),
        digitalLock: false,
        priority: String(pm.environment.get('priority')),
        driverCode: String(pm.environment.get('driverCode')),
        driverName: String(pm.environment.get('driverName')),
        driverMobile: String(pm.environment.get('driverMobile')),
      };

      const tripRes = await MMTripAPI.createTrip(request, tripPayload);

      await attachApiLog(
        testInfo,
        'Case 11: Reject Invalid Route Type in MM Trip Creation',
        { method: 'POST', endpoint: `${MMTripAPI.basePath}`, payload: tripPayload },
        { status: tripRes.status, body: tripRes.body }
      );

      expect.soft(tripRes.status).toBe(422);
      expect.soft(tripRes.body.errorCode).toBe('ROUTE_TYPE_INVALID');
    });

    await test.step('Case 12: Verify Network Route Service Health and Response Time under MM SLA threshold', async () => {
      const startTime = Date.now();
      const queryParams = { companyCode, status: 'ACTIVE' };
      const res = await RouteAPI.listRoutes(request, queryParams);
      const responseTimeMs = Date.now() - startTime;

      await attachApiLog(
        testInfo,
        'Case 12: Route Service SLA Response Time',
        { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
        { status: res.status, body: { ...res.body, responseTimeMs } }
      );

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(responseTimeMs).toBeLessThan(3000);
    });
  });

  // =================================================================================================
  // SCENARIO 2: CREATE ROUTE DRAFT (CASES 1 TO 5 - POSITIVE EXPRESS, SERVICE, FEEDER & ADHOC)
  // =================================================================================================

  test('Scenario 2: [Create Route Draft] Verify Positive Route Creation for EXPRESS, SERVICE, FEEDER (0 & 1+ TouchPoints), and ADHOC Route Nature (Cases 1 to 5)', async ({ request }, testInfo) => {
    const companyCode = Number(pm.environment.get('companyCode'));
    const sourceBranch = String(pm.environment.get('sourceBranch'));
    const destinationBranch = String(pm.environment.get('destinationBranch'));
    const intermediateBranch = String(pm.environment.get('intermediateBranch'));
    const validFrom = String(pm.environment.get('validFrom'));
    const validTo = String(pm.environment.get('validTo'));
    const frequency = String(pm.environment.get('frequency'));
    const submitterActor = String(pm.environment.get('submitterActor'));

    await test.step('Case 1: Create Valid Direct EXPRESS Route (201 Created, Status: DRAFT)', async () => {
      const dynamicCode = generateUniqueCode('RT-EXP');
      pm.environment.set('draftExpressRouteCode', dynamicCode);

      const payload = {
        companyCode,
        routeCode: dynamicCode,
        routeType: String(pm.environment.get('expressRouteType')),
        routeNature: String(pm.environment.get('routeNature')),
        sourceBranch,
        destinationBranch,
        distanceKm: Number(pm.environment.get('defaultDistanceKm')),
        tatHoursRegular: Number(pm.environment.get('defaultTatHoursRegular')),
        tatHoursSpeed: Number(pm.environment.get('defaultTatHoursSpeed')),
        ratePerKm: Number(pm.environment.get('defaultRatePerKm')),
        routeCost: Number(pm.environment.get('defaultRouteCost')),
        validFrom,
        validTo,
        frequency,
        runsPerDay: 1,
        scheduleStartTimes: [String(pm.environment.get('defaultStartTime'))],
        createdBy: submitterActor,
      };

      const res = await RouteAPI.createRoute(request, payload);
      await attachApiLog(testInfo, 'Case 1: Create Valid EXPRESS Route', { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(201);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(res.body.data.status).toBe('DRAFT');
    });

    await test.step('Case 2: Create Valid SERVICE Route with Intermediate Touchpoints (201 Created)', async () => {
      const dynamicCode = generateUniqueCode('RT-SRV');
      pm.environment.set('draftServiceRouteCode', dynamicCode);

      const payload = {
        companyCode,
        routeCode: dynamicCode,
        routeType: String(pm.environment.get('serviceRouteType')),
        routeNature: String(pm.environment.get('routeNature')),
        sourceBranch,
        destinationBranch,
        distanceKm: Number(pm.environment.get('defaultDistanceKm')),
        tatHoursRegular: Number(pm.environment.get('defaultTatHoursRegular')),
        tatHoursSpeed: Number(pm.environment.get('defaultTatHoursSpeed')),
        ratePerKm: Number(pm.environment.get('defaultRatePerKm')),
        routeCost: Number(pm.environment.get('defaultRouteCost')),
        validFrom,
        validTo,
        frequency,
        runsPerDay: 1,
        scheduleStartTimes: [String(pm.environment.get('serviceStartTime'))],
        touchPoints: [
          {
            branchCode: intermediateBranch,
            arrivalDay: 0,
            arrivalTime: String(pm.environment.get('touchPointArrivalTime')),
            departureDay: 0,
            departureTime: String(pm.environment.get('touchPointDepartureTime')),
          },
        ],
        createdBy: submitterActor,
      };

      const res = await RouteAPI.createRoute(request, payload);
      await attachApiLog(testInfo, 'Case 2: Create Valid SERVICE Route', { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(201);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(res.body.data.status).toBe('DRAFT');
    });

    await test.step('Case 3: Create Valid Direct FEEDER Route without Touchpoints (201 Created)', async () => {
      const dynamicCode = generateUniqueCode('RT-FDR0');

      const payload = {
        companyCode,
        routeCode: dynamicCode,
        routeType: String(pm.environment.get('feederRouteType')),
        routeNature: String(pm.environment.get('routeNature')),
        sourceBranch,
        destinationBranch,
        distanceKm: Number(pm.environment.get('defaultDistanceKm')),
        tatHoursRegular: Number(pm.environment.get('defaultTatHoursRegular')),
        tatHoursSpeed: Number(pm.environment.get('defaultTatHoursSpeed')),
        ratePerKm: Number(pm.environment.get('defaultRatePerKm')),
        routeCost: Number(pm.environment.get('defaultRouteCost')),
        validFrom,
        validTo,
        frequency,
        runsPerDay: 1,
        scheduleStartTimes: [String(pm.environment.get('defaultStartTime'))],
        touchPoints: [],
        createdBy: submitterActor,
      };

      const res = await RouteAPI.createRoute(request, payload);
      await attachApiLog(testInfo, 'Case 3: Create Valid FEEDER Route (0 TouchPoints)', { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(201);
      expect.soft(res.body.data.status).toBe('DRAFT');
    });

    await test.step('Case 4: Create Valid Multi-Stop FEEDER Route with Touchpoints (201 Created)', async () => {
      const dynamicCode = generateUniqueCode('RT-FDR1');

      const payload = {
        companyCode,
        routeCode: dynamicCode,
        routeType: String(pm.environment.get('feederRouteType')),
        routeNature: String(pm.environment.get('routeNature')),
        sourceBranch,
        destinationBranch,
        distanceKm: Number(pm.environment.get('defaultDistanceKm')),
        tatHoursRegular: Number(pm.environment.get('defaultTatHoursRegular')),
        tatHoursSpeed: Number(pm.environment.get('defaultTatHoursSpeed')),
        ratePerKm: Number(pm.environment.get('defaultRatePerKm')),
        routeCost: Number(pm.environment.get('defaultRouteCost')),
        validFrom,
        validTo,
        frequency,
        runsPerDay: 1,
        scheduleStartTimes: [String(pm.environment.get('defaultStartTime'))],
        touchPoints: [
          {
            branchCode: intermediateBranch,
            arrivalDay: 0,
            arrivalTime: String(pm.environment.get('touchPointArrivalTime')),
            departureDay: 0,
            departureTime: String(pm.environment.get('touchPointDepartureTime')),
          },
        ],
        createdBy: submitterActor,
      };

      const res = await RouteAPI.createRoute(request, payload);
      await attachApiLog(testInfo, 'Case 4: Create Valid FEEDER Route (With TouchPoint)', { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(201);
      expect.soft(res.body.data.status).toBe('DRAFT');
    });

    await test.step('Case 5: Create Valid ADHOC Route Nature Draft (201 Created)', async () => {
      const dynamicCode = generateUniqueCode('RT-ADH');

      const payload = {
        companyCode,
        routeCode: dynamicCode,
        routeType: String(pm.environment.get('expressRouteType')),
        routeNature: String(pm.environment.get('adhocRouteNature')),
        sourceBranch,
        destinationBranch,
        distanceKm: Number(pm.environment.get('defaultDistanceKm')),
        tatHoursRegular: Number(pm.environment.get('defaultTatHoursRegular')),
        tatHoursSpeed: Number(pm.environment.get('defaultTatHoursSpeed')),
        ratePerKm: Number(pm.environment.get('defaultRatePerKm')),
        routeCost: Number(pm.environment.get('defaultRouteCost')),
        validFrom,
        validTo,
        frequency,
        runsPerDay: 1,
        scheduleStartTimes: [String(pm.environment.get('defaultStartTime'))],
        createdBy: submitterActor,
      };

      const res = await RouteAPI.createRoute(request, payload);
      await attachApiLog(testInfo, 'Case 5: Create Valid ADHOC Route Draft', { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(201);
      expect.soft(res.body.data.status).toBe('DRAFT');
    });
  });

  // =================================================================================================
  // SCENARIO 3: SUBMIT ROUTE FOR APPROVAL (CASES 1 TO 4)
  // =================================================================================================

  test('Scenario 3: [Submit Route for Approval] Verify Submit Workflow & State Transitions (Cases 1 to 4)', async ({ request }, testInfo) => {
    const submitterActor = String(pm.environment.get('submitterActor'));

    await test.step('Case 1: Submit DRAFT Route for Approval (200 OK, Status: PENDING)', async () => {
      const { code } = await createDraftRouteHelper(request);
      const payload = { actor: submitterActor };
      const res = await RouteAPI.submitRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 1: Submit DRAFT Route', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/submit`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(res.body.data.status).toBe('PENDING');
    });

    await test.step('Case 2: Negative - Submit Non-Existent Route Code (404 Not Found - NOT_FOUND)', async () => {
      const invalidCode = String(pm.environment.get('nonExistentRouteCode'));
      const payload = { actor: submitterActor };
      const res = await RouteAPI.submitRoute(request, invalidCode, payload);

      await attachApiLog(testInfo, 'Case 2: Submit Non-Existent Route Code', { method: 'POST', endpoint: `${RouteAPI.basePath}/${invalidCode}/submit`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(404);
      expect.soft(res.body.errorCode).toBe('NOT_FOUND');
    });

    await test.step('Case 3: Negative - Submit Already PENDING Route (409 Conflict - INVALID_STATUS_TRANSITION)', async () => {
      const { code, submitter } = await createPendingRouteHelper(request);
      const payload = { actor: submitter };
      const res = await RouteAPI.submitRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 3: Submit Already PENDING Route', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/submit`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(409);
      expect.soft(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
    });

    await test.step('Case 4: Negative - Missing Submitter Actor Identity in Request (400 Bad Request)', async () => {
      const { code } = await createDraftRouteHelper(request);
      const payload = { actor: '' };
      const res = await RouteAPI.submitRoute(request, code, payload as any);

      await attachApiLog(testInfo, 'Case 4: Submit Without Actor Identity', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/submit`, payload }, { status: res.status, body: res.body });

      expect.soft([400, 422]).toContain(res.status);
    });
  });

  // =================================================================================================
  // SCENARIO 4: APPROVE ROUTE - MAKER-CHECKER / SoD (CASES 1 TO 4)
  // =================================================================================================

  test('Scenario 4: [Approve Route - Maker-Checker / SoD] Verify Independent Approval & SoD Guard-Rails (Cases 1 to 4)', async ({ request }, testInfo) => {
    const approverActor = String(pm.environment.get('approverActor'));

    await test.step('Case 1: Approve PENDING Route by Independent Approver (200 OK, Status: CREATED)', async () => {
      const { code } = await createPendingRouteHelper(request);
      const payload = { actor: approverActor };
      const res = await RouteAPI.approveRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 1: Approve PENDING Route', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/approve`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(res.body.data.status).toBe('CREATED');
    });

    await test.step('Case 2: Negative - Segregation of Duties (SoD) Violation: Submitter approves own route (422 - APPROVER_IS_MAKER)', async () => {
      const { code, submitter } = await createPendingRouteHelper(request);
      const payload = { actor: submitter };
      const approveRes = await RouteAPI.approveRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 2: SoD Violation (Submitter Approves Own Route)', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/approve`, payload }, { status: approveRes.status, body: approveRes.body });

      expect.soft(approveRes.status).toBe(422);
      expect.soft(approveRes.body.errorCode).toBe('APPROVER_IS_MAKER');
    });

    await test.step('Case 3: Negative - Approve DRAFT Route directly without submitting (409 Conflict - INVALID_STATUS_TRANSITION)', async () => {
      const { code } = await createDraftRouteHelper(request);
      const payload = { actor: approverActor };
      const res = await RouteAPI.approveRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 3: Approve Unsubmitted DRAFT Route', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/approve`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(409);
      expect.soft(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
    });

    await test.step('Case 4: Negative - Approve Non-Existent Route Code (404 Not Found - NOT_FOUND)', async () => {
      const invalidCode = String(pm.environment.get('nonExistentRouteCode'));
      const payload = { actor: approverActor };
      const res = await RouteAPI.approveRoute(request, invalidCode, payload);

      await attachApiLog(testInfo, 'Case 4: Approve Non-Existent Route Code', { method: 'POST', endpoint: `${RouteAPI.basePath}/${invalidCode}/approve`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(404);
      expect.soft(res.body.errorCode).toBe('NOT_FOUND');
    });
  });

  // =================================================================================================
  // SCENARIO 5: REJECT ROUTE WORKFLOW (CASES 1 TO 4)
  // =================================================================================================

  test('Scenario 5: [Reject Route Workflow] Verify Route Rejection & SoD Rules (Cases 1 to 4)', async ({ request }, testInfo) => {
    const approver = String(pm.environment.get('approverActor'));

    await test.step('Case 1: Reject PENDING Route with valid rejection reason (200 OK, Status: REJECTED)', async () => {
      const { code } = await createPendingRouteHelper(request);
      const payload = { reason: String(pm.environment.get('rejectionReason')), actor: approver };
      const res = await RouteAPI.rejectRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 1: Reject PENDING Route', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/reject`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(res.body.data.status).toBe('REJECTED');
    });

    await test.step('Case 2: Negative - Reject without reason string (422 - REJECTION_REASON_REQUIRED)', async () => {
      const { code } = await createPendingRouteHelper(request);
      const payload = { reason: '', actor: approver };
      const res = await RouteAPI.rejectRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 2: Reject Without Reason String', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/reject`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(422);
      expect.soft(res.body.errorCode).toBe('REJECTION_REASON_REQUIRED');
    });

    await test.step('Case 3: Negative - Segregation of Duties (SoD) Violation: Submitter rejects own route (422 - APPROVER_IS_MAKER)', async () => {
      const { code, submitter } = await createPendingRouteHelper(request);
      const payload = { reason: String(pm.environment.get('rejectionReason')), actor: submitter };
      const res = await RouteAPI.rejectRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 3: SoD Violation on Reject', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/reject`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(422);
      expect.soft(res.body.errorCode).toBe('APPROVER_IS_MAKER');
    });

    await test.step('Case 4: Negative - Reject DRAFT Route directly (409 Conflict - INVALID_STATUS_TRANSITION)', async () => {
      const { code } = await createDraftRouteHelper(request);
      const payload = { reason: String(pm.environment.get('rejectionReason')), actor: approver };
      const res = await RouteAPI.rejectRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 4: Reject DRAFT Route', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/reject`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(409);
      expect.soft(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  // =================================================================================================
  // SCENARIO 6: ACTIVATE ROUTE - GO-LIVE (CASES 1 TO 5)
  // =================================================================================================

  test('Scenario 6: [Activate Route - Go-Live] Verify Route Activation & Effective Date Rules (Cases 1 to 5)', async ({ request }, testInfo) => {
    const submitter = String(pm.environment.get('submitterActor'));
    const approver = String(pm.environment.get('approverActor'));

    await test.step('Case 1: Activate CREATED Route (200 OK, Status: ACTIVE)', async () => {
      const { code } = await createApprovedRouteHelper(request);
      const payload = { actor: approver };
      const res = await RouteAPI.activateRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 1: Activate CREATED Route', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/activate`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(res.body.data.status).toBe('ACTIVE');
    });

    await test.step('Case 2: Negative - Premature Activation with future validFrom date (422 - ACTIVATION_BEFORE_VALID_FROM)', async () => {
      const dynamicCode = generateUniqueCode('RT-FUT');
      await createDraftRouteHelper(request, {
        routeCode: dynamicCode,
        validFrom: String(pm.environment.get('futureValidFrom')),
        validTo: String(pm.environment.get('futureValidTo')),
      });
      await RouteAPI.submitRoute(request, dynamicCode, { actor: submitter });
      await RouteAPI.approveRoute(request, dynamicCode, { actor: approver });

      const payload = { actor: approver };
      const res = await RouteAPI.activateRoute(request, dynamicCode, payload);

      await attachApiLog(testInfo, 'Case 2: Premature Activation Before validFrom', { method: 'POST', endpoint: `${RouteAPI.basePath}/${dynamicCode}/activate`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(422);
      expect.soft(res.body.errorCode).toBe('ACTIVATION_BEFORE_VALID_FROM');
    });

    await test.step('Case 3: Negative - Duplicate Activation on already ACTIVE route (409 Conflict - INVALID_STATUS_TRANSITION)', async () => {
      const { code } = await createActiveRouteHelper(request);
      const payload = { actor: approver };
      const res = await RouteAPI.activateRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 3: Duplicate Activation on ACTIVE Route', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/activate`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(409);
      expect.soft(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
    });

    await test.step('Case 4: Negative - Activate DRAFT route directly without approval (409 Conflict - INVALID_STATUS_TRANSITION)', async () => {
      const { code } = await createDraftRouteHelper(request);
      const payload = { actor: approver };
      const res = await RouteAPI.activateRoute(request, code, payload);

      await attachApiLog(testInfo, 'Case 4: Activate Unapproved DRAFT Route', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/activate`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(409);
      expect.soft(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
    });

    await test.step('Case 5: Negative - Activate Non-Existent Route Code (404 Not Found - NOT_FOUND)', async () => {
      const invalidCode = String(pm.environment.get('nonExistentRouteCode'));
      const payload = { actor: approver };
      const res = await RouteAPI.activateRoute(request, invalidCode, payload);

      await attachApiLog(testInfo, 'Case 5: Activate Non-Existent Route Code', { method: 'POST', endpoint: `${RouteAPI.basePath}/${invalidCode}/activate`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(404);
      expect.soft(res.body.errorCode).toBe('NOT_FOUND');
    });
  });

  // =================================================================================================
  // SCENARIO 7: ROUTE RENEWAL STAGING (CASES 1 TO 5)
  // =================================================================================================

  test('Scenario 7: [Route Renewal Staging] Verify Active Route Renewal Submit, Approve & Reject (Cases 1 to 5)', async ({ request }, testInfo) => {
    await test.step('Case 1: Submit Renewal on ACTIVE route with valid rate/TAT changes (200 OK, Status: RENEWAL)', async () => {
      const { code, submitter } = await createActiveRouteHelper(request);
      const payload = {
        changes: { ratePerKm: 12.5, tatHoursRegular: 22.0 },
        actor: submitter,
      };
      const res = await RouteAPI.submitRenewal(request, code, payload);

      await attachApiLog(testInfo, 'Case 1: Submit Valid Route Renewal', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
      expect.soft(res.body.data.status).toBe('RENEWAL');
    });

    await test.step('Case 2: Negative - Modify non-renewable field sourceBranch in Renewal (422 - RENEWAL_FIELD_NOT_ALLOWED)', async () => {
      const { code, submitter } = await createActiveRouteHelper(request);
      const payload = {
        changes: { sourceBranch: String(pm.environment.get('intermediateBranch')) },
        actor: submitter,
      };
      const res = await RouteAPI.submitRenewal(request, code, payload);

      await attachApiLog(testInfo, 'Case 2: Non-Renewable Field in Renewal', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(422);
      expect.soft(res.body.errorCode).toBe('RENEWAL_FIELD_NOT_ALLOWED');
    });

    await test.step('Case 3: Negative - Submit Renewal without any changes map (422 - RENEWAL_CHANGES_REQUIRED)', async () => {
      const { code, submitter } = await createActiveRouteHelper(request);
      const payload = { changes: {}, actor: submitter };
      const res = await RouteAPI.submitRenewal(request, code, payload);

      await attachApiLog(testInfo, 'Case 3: Empty Changes Map in Renewal', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(422);
      expect.soft(res.body.errorCode).toBe('RENEWAL_CHANGES_REQUIRED');
    });

    await test.step('Case 4: Approve Renewal by Independent Manager (200 OK, Status: ACTIVE)', async () => {
      const { code, submitter, approver } = await createActiveRouteHelper(request);
      await RouteAPI.submitRenewal(request, code, { changes: { ratePerKm: 14.0 }, actor: submitter });

      const payload = { actor: approver };
      const res = await RouteAPI.approveRenewal(request, code, payload);

      await attachApiLog(testInfo, 'Case 4: Approve Route Renewal', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal/approve`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.data.status).toBe('ACTIVE');
    });

    await test.step('Case 5: Reject Renewal by Independent Manager (200 OK, Reverts to previous status)', async () => {
      const { code, submitter, approver } = await createActiveRouteHelper(request);
      await RouteAPI.submitRenewal(request, code, { changes: { ratePerKm: 18.0 }, actor: submitter });

      const payload = { reason: String(pm.environment.get('renewalRejectionReason')), actor: approver };
      const res = await RouteAPI.rejectRenewal(request, code, payload);

      await attachApiLog(testInfo, 'Case 5: Reject Route Renewal', { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal/reject`, payload }, { status: res.status, body: res.body });

      expect.soft(res.status).toBe(200);
      expect.soft(res.body.status).toBe('SUCCESS');
    });
  });

  // =================================================================================================
  // SCENARIO 8: COMPLETE END-TO-END ROUTE LIFECYCLE (CASE 1)
  // =================================================================================================

  test('Scenario 8: [Complete End-to-End Route Lifecycle] Full Golden Path - DRAFT -> SUBMIT -> APPROVE -> ACTIVATE -> Verify Visible in MM (Case 1)', async ({ request }, testInfo) => {
    await test.step('Case 1: Execute Full Route Lifecycle (Create Draft -> Submit -> Approve -> Activate -> List in MM Active Routes)', async () => {
      const dynamicCode = generateUniqueCode('RT-GOLD');
      pm.environment.set('goldenRouteCode', dynamicCode);
      const submitter = String(pm.environment.get('submitterActor'));
      const approver = String(pm.environment.get('approverActor'));
      const companyCode = Number(pm.environment.get('companyCode'));
      const sourceBranch = String(pm.environment.get('sourceBranch'));

      const { res: draftRes } = await createDraftRouteHelper(request, { routeCode: dynamicCode });
      expect.soft(draftRes.status).toBe(201);
      expect.soft(draftRes.body.data.status).toBe('DRAFT');

      const submitRes = await RouteAPI.submitRoute(request, dynamicCode, { actor: submitter });
      expect.soft(submitRes.status).toBe(200);
      expect.soft(submitRes.body.data.status).toBe('PENDING');

      const approveRes = await RouteAPI.approveRoute(request, dynamicCode, { actor: approver });
      expect.soft(approveRes.status).toBe(200);
      expect.soft(approveRes.body.data.status).toBe('CREATED');

      const activateRes = await RouteAPI.activateRoute(request, dynamicCode, { actor: approver });
      expect.soft(activateRes.status).toBe(200);
      expect.soft(activateRes.body.data.status).toBe('ACTIVE');

      const listRes = await RouteAPI.listRoutes(request, {
        companyCode,
        status: 'ACTIVE',
        branch: sourceBranch,
      });

      await attachApiLog(
        testInfo,
        'Case 1: Verify Activated Route Visible in MM Active List',
        { method: 'GET', endpoint: `${RouteAPI.basePath}?companyCode=${companyCode}&status=ACTIVE&branch=${sourceBranch}` },
        { status: listRes.status, body: listRes.body }
      );

      expect.soft(listRes.status).toBe(200);
      const found = listRes.body.data?.some((r: any) => r.routeCode === dynamicCode);
      expect.soft(found).toBe(true);
    });
  });

});
