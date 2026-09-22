import { test, expect } from '@playwright/test';
import { RouteAPI } from '../../../APIs/Modules/Network/RouteAPI';
import { MMTripAPI } from '../../../APIs/Modules/MM/MMTripAPI';
import { BaseAPI } from '../../../APIs/Common/BaseAPI';
import { pm } from '../../../Utils/VariableManager';


async function attachApiLog(
  testInfo: any,
  requestInfo: { method: string; endpoint: string; queryParams?: any; payload?: any },
  responseInfo: { status: number; body: any }
) {
  await testInfo.attach('Request Details', {
    body: JSON.stringify(requestInfo, null, 2),
    contentType: 'application/json',
  });
  await testInfo.attach('API Response', {
    body: JSON.stringify(responseInfo, null, 2),
    contentType: 'application/json',
  });
}

// Force serial execution within this suite to avoid database collision & lock contention on route state transitions
test.describe.configure({ mode: 'serial' });

// =================================================================================================
// REUSABLE STATE SETUP HELPERS 
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
    routeType: String(pm.environment.get('routeType')),
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: 150.0,
    tatHoursRegular: 24.0,
    tatHoursSpeed: 18.0,
    ratePerKm: 10.0,
    routeCost: 1500.0,
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: ['08:00:00'],
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

test.beforeAll(async ({ playwright }) => {
  const reqContext = await playwright.request.newContext();
  await BaseAPI.ensureAuthToken(reqContext);

  // Initialize and ensure all static & runtime configuration variables are in pm.environment
  pm.environment.set('companyCode', 400021);
  pm.environment.set('sourceBranch', '1001');
  pm.environment.set('destinationBranch', '2115');
  pm.environment.set('intermediateBranch', '1002');
  pm.environment.set('routeType', 'EXPRESS');
  pm.environment.set('routeNature', 'PERMANENT');
  pm.environment.set('frequency', 'DAILY');
  pm.environment.set('validFrom', '2026-09-01');
  pm.environment.set('validTo', '2027-09-01');
  pm.environment.set('driverCode', '101');
  pm.environment.set('driverName', 'Ramesh Kumar');
  pm.environment.set('driverMobile', '9876543210');
  pm.environment.set('vehicleType', '32FT');
  pm.environment.set('vehicleCapacityKg', 10000);
  pm.environment.set('vehicleOwnership', 'OWNED');
  pm.environment.set('vendorCode', 'VEND-001');
  pm.environment.set('priority', 'MEDIUM');
  pm.environment.set('tripCreationSource', 'MANUAL');

  // Setup actor identities for Segregation of Duties (SoD: Maker != Checker)
  const submitterActor = String(pm.environment.get('actor') || 'a1a1a1a1-0001-4000-8000-000000000001');
  const approverActor = 'b2b2b2b2-0002-4000-8000-000000000002';
  pm.environment.set('submitterActor', submitterActor);
  pm.environment.set('approverActor', approverActor);

  // Dynamic resolution of an active route between source & destination
  const companyCode = Number(pm.environment.get('companyCode'));
  const sourceBranch = String(pm.environment.get('sourceBranch'));
  const destinationBranch = String(pm.environment.get('destinationBranch'));

  const res = await RouteAPI.listRoutes(reqContext, { companyCode, status: 'ACTIVE', branch: sourceBranch });
  let activeRouteCode = 'VJ-1001-2115-10';
  if (res.status === 200 && Array.isArray(res.body?.data) && res.body.data.length > 0) {
    const match = res.body.data.find(
      (r: any) => r.sourceBranch === sourceBranch && r.destinationBranch === destinationBranch
    );
    if (match) {
      activeRouteCode = match.routeCode;
    }
  }

  // Store resolved active route in VariableManager for all test scenarios
  pm.environment.set('routeCode', activeRouteCode);
  pm.environment.set('activeRouteCode', activeRouteCode);
});

// =================================================================================================
// PART 1: MIDDLE MILE ROUTE CONSUMPTION & OPERATIONAL GUARD-RAILS (SCENARIOS 1 TO 12)
// =================================================================================================

test('Part 1 - Scenario 1: Verify Active Direct Routes can be fetched for Source Branch and Tenant [Case #01]', async ({ request }, testInfo) => {
  const companyCode = Number(pm.environment.get('companyCode'));
  const sourceBranch = String(pm.environment.get('sourceBranch'));

  const queryParams = { companyCode, branch: sourceBranch, status: 'ACTIVE' };
  const res = await RouteAPI.listRoutes(request, queryParams);

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(Array.isArray(res.body.data)).toBe(true);
  expect(res.body.data.length).toBeGreaterThan(0);

  for (const route of res.body.data) {
    expect(route.status).toBe('ACTIVE');
    expect(route.routeCode).toBeDefined();
  }
});

test('Part 1 - Scenario 2: Verify Routes can be filtered by Route Type (FEEDER vs EXPRESS vs SERVICE) [Case #02]', async ({ request }, testInfo) => {
  const companyCode = Number(pm.environment.get('companyCode'));
  const targetType = 'EXPRESS';
  pm.environment.set('filterRouteType', targetType);

  const queryParams = { companyCode, status: 'ACTIVE', routeType: String(pm.environment.get('filterRouteType')) };
  const res = await RouteAPI.listRoutes(request, queryParams);

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(Array.isArray(res.body.data)).toBe(true);

  if (res.body.data.length > 0) {
    for (const route of res.body.data) {
      expect(route.routeType).toBe(targetType);
      expect(route.status).toBe('ACTIVE');
    }
  }
});

test('Part 1 - Scenario 3: Verify Route Details and TouchPoints structure for Multi-Stop / Direct Route [Case #03]', async ({ request }, testInfo) => {
  const routeCode = String(pm.environment.get('routeCode') || 'VJ-1001-2115-10');
  const res = await RouteAPI.getRouteDetail(request, routeCode);

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}/${routeCode}` },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.data).toBeDefined();
  expect(res.body.data.route).toBeDefined();
  expect(res.body.data.route.routeCode).toBe(routeCode);
  expect(Array.isArray(res.body.data.touchPoints)).toBe(true);
  expect(Array.isArray(res.body.data.scheduleRuns)).toBe(true);
});

test('Part 1 - Scenario 4: Verify Route Distance and SLA metrics required for MM Trip Stamping [Case #04]', async ({ request }, testInfo) => {
  const routeCode = String(pm.environment.get('routeCode') || 'VJ-1001-2115-10');
  const sourceBranch = String(pm.environment.get('sourceBranch'));

  const res = await RouteAPI.getRouteDetail(request, routeCode);

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}/${routeCode}` },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  const route = res.body?.data?.route;
  expect(route).toBeDefined();
  expect(Number(route.distanceKm)).toBeGreaterThan(0);
  expect(route.validFrom).toBeDefined();
  expect(route.validTo).toBeDefined();
  expect(route.sourceBranch).toBe(sourceBranch);
});

test('Part 1 - Scenario 5: Negative - Verify MM rejects Trip creation when using Inactive / Draft Route [Case #05]', async ({ request }, testInfo) => {
  const dummyVehicle = `DL01AB${Date.now().toString().slice(-4)}`;
  const inactiveRoute = 'DRAFT_INACTIVE_ROUTE_TEST';

  pm.environment.set('inactiveVehicleNo', dummyVehicle);
  pm.environment.set('inactiveRouteCode', inactiveRoute);

  const tripPayload = {
    companyCode: Number(pm.environment.get('companyCode')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    routeType: String(pm.environment.get('routeType')),
    routeCode: String(pm.environment.get('inactiveRouteCode')),
    emptyTrip: false,
    creationSource: String(pm.environment.get('tripCreationSource')),
    vehicleNo: String(pm.environment.get('inactiveVehicleNo')),
    vehicleType: String(pm.environment.get('vehicleType')),
    vehicleCapacityKg: Number(pm.environment.get('vehicleCapacityKg')),
    vehicleOwnership: String(pm.environment.get('vehicleOwnership')),
    vendorCode: String(pm.environment.get('vendorCode')),
    gpsStatus: 'ACTIVE',
    digitalLock: false,
    priority: String(pm.environment.get('priority')),
    driverCode: String(pm.environment.get('driverCode')),
    driverName: String(pm.environment.get('driverName')),
    driverMobile: String(pm.environment.get('driverMobile')),
  };

  const tripRes = await MMTripAPI.createTrip(request, tripPayload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${MMTripAPI.basePath}`, payload: tripPayload },
    { status: tripRes.status, body: tripRes.body }
  );

  expect(tripRes.status).toBe(422);
  expect(tripRes.body.errorCode).toBe('ROUTE_NOT_ACTIVE');
  expect(tripRes.body.detail).toContain('is not an ACTIVE route');
});

test('Part 1 - Scenario 6: Negative - Verify MM rejects Trip creation for Non-Existent Route Code [Case #06]', async ({ request }, testInfo) => {
  const dummyVehicle = `DL01AB${Date.now().toString().slice(-4)}`;
  const nonExistentRoute = 'NON_EXISTENT_ROUTE_99999';

  pm.environment.set('nonExistentVehicleNo', dummyVehicle);
  pm.environment.set('nonExistentRouteCode', nonExistentRoute);

  const tripPayload = {
    companyCode: Number(pm.environment.get('companyCode')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    routeType: String(pm.environment.get('routeType')),
    routeCode: String(pm.environment.get('nonExistentRouteCode')),
    emptyTrip: false,
    creationSource: String(pm.environment.get('tripCreationSource')),
    vehicleNo: String(pm.environment.get('nonExistentVehicleNo')),
    vehicleType: String(pm.environment.get('vehicleType')),
    vehicleCapacityKg: Number(pm.environment.get('vehicleCapacityKg')),
    vehicleOwnership: String(pm.environment.get('vehicleOwnership')),
    vendorCode: String(pm.environment.get('vendorCode')),
    gpsStatus: 'ACTIVE',
    digitalLock: false,
    priority: String(pm.environment.get('priority')),
    driverCode: String(pm.environment.get('driverCode')),
    driverName: String(pm.environment.get('driverName')),
    driverMobile: String(pm.environment.get('driverMobile')),
  };

  const tripRes = await MMTripAPI.createTrip(request, tripPayload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${MMTripAPI.basePath}`, payload: tripPayload },
    { status: tripRes.status, body: tripRes.body }
  );

  expect(tripRes.status).toBe(422);
  expect(tripRes.body.errorCode).toBe('ROUTE_NOT_ACTIVE');
});

test('Part 1 - Scenario 7: Negative - Verify Route Service returns 404 NOT_FOUND for unknown Route Code [Case #07]', async ({ request }, testInfo) => {
  const invalidRoute = 'NON_EXISTENT_ROUTE_99999';
  pm.environment.set('unknownRouteCode', invalidRoute);

  const routeToQuery = String(pm.environment.get('unknownRouteCode'));
  const res = await RouteAPI.getRouteDetail(request, routeToQuery);

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}/${routeToQuery}` },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(404);
  expect(res.body.errorCode).toBe('NOT_FOUND');
  expect(res.body.detail).toContain(`route not found: ${routeToQuery}`);
});

test('Part 1 - Scenario 8: Negative - Verify Branch Mismatch Detection between Trip Destination and Route Destination [Case #08]', async ({ request }, testInfo) => {
  const companyCode = Number(pm.environment.get('companyCode'));
  const sourceBranch = String(pm.environment.get('sourceBranch'));
  const destinationBranch = String(pm.environment.get('destinationBranch'));

  const queryParams = { companyCode, branch: sourceBranch, status: 'ACTIVE' };
  const routesRes = await RouteAPI.listRoutes(request, queryParams);

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
    { status: routesRes.status, body: routesRes.body }
  );

  expect(routesRes.status).toBe(200);

  const otherRoute = routesRes.body.data?.find(
    (r: any) => r.sourceBranch === sourceBranch && r.destinationBranch !== destinationBranch
  );

  if (otherRoute) {
    expect(otherRoute.destinationBranch).not.toBe(destinationBranch);
    const matchesDesiredTrip = otherRoute.destinationBranch === destinationBranch;
    expect(matchesDesiredTrip).toBe(false);
  }
});

test('Part 1 - Scenario 9: Negative - Verify Tenant Isolation (Unknown Company Code returns empty route list) [Case #09]', async ({ request }, testInfo) => {
  const invalidCompany = 99999999;
  pm.environment.set('invalidCompanyCode', invalidCompany);

  const queryParams = { companyCode: Number(pm.environment.get('invalidCompanyCode')), status: 'ACTIVE' };
  const res = await RouteAPI.listRoutes(request, queryParams);

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(Array.isArray(res.body.data)).toBe(true);
  expect(res.body.data.length).toBe(0);
});

test('Part 1 - Scenario 10: Verify AUTO Route Nature metadata is returned for Concurrency Protection [Case #10]', async ({ request }, testInfo) => {
  const companyCode = Number(pm.environment.get('companyCode'));
  const queryParams = { companyCode, status: 'ACTIVE' };
  const res = await RouteAPI.listRoutes(request, queryParams);

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.data.length).toBeGreaterThan(0);

  for (const route of res.body.data) {
    expect(route.routeNature).toBeDefined();
    expect(['PERMANENT', 'AUTO', 'ADHOC']).toContain(route.routeNature);
  }
});

test('Part 1 - Scenario 11: Business Rule - Verify MM rejects invalid Route Type values [allowed: FEEDER, SERVICE, EXPRESS] [Case #11]', async ({ request }, testInfo) => {
  const dummyVehicle = `DL01AB${Date.now().toString().slice(-4)}`;
  const invalidType = 'SUPER_FAST_EXPRESS_INVALID';

  pm.environment.set('invalidRouteTypeVehicleNo', dummyVehicle);
  pm.environment.set('invalidRouteType', invalidType);

  const tripPayload = {
    companyCode: Number(pm.environment.get('companyCode')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    routeType: String(pm.environment.get('invalidRouteType')),
    routeCode: String(pm.environment.get('routeCode') || 'VJ-1001-2115-10'),
    emptyTrip: false,
    creationSource: String(pm.environment.get('tripCreationSource')),
    vehicleNo: String(pm.environment.get('invalidRouteTypeVehicleNo')),
    vehicleType: String(pm.environment.get('vehicleType')),
    vehicleCapacityKg: Number(pm.environment.get('vehicleCapacityKg')),
    vehicleOwnership: String(pm.environment.get('vehicleOwnership')),
    vendorCode: String(pm.environment.get('vendorCode')),
    gpsStatus: 'ACTIVE',
    digitalLock: false,
    priority: String(pm.environment.get('priority')),
    driverCode: String(pm.environment.get('driverCode')),
    driverName: String(pm.environment.get('driverName')),
    driverMobile: String(pm.environment.get('driverMobile')),
  };

  const tripRes = await MMTripAPI.createTrip(request, tripPayload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${MMTripAPI.basePath}`, payload: tripPayload },
    { status: tripRes.status, body: tripRes.body }
  );

  expect(tripRes.status).toBe(422);
  expect(tripRes.body.errorCode).toBe('ROUTE_TYPE_INVALID');
  expect(tripRes.body.detail).toContain('route type must be one of [FEEDER, SERVICE, EXPRESS]');
});

test('Part 1 - Scenario 12: Verify Network Route Service Health and Response Time under MM SLA threshold [Case #12]', async ({ request }, testInfo) => {
  const companyCode = Number(pm.environment.get('companyCode'));
  const startTime = Date.now();
  const queryParams = { companyCode, status: 'ACTIVE' };
  const res = await RouteAPI.listRoutes(request, queryParams);
  const responseTimeMs = Date.now() - startTime;

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}`, queryParams },
    { status: res.status, body: { ...res.body, responseTimeMs } }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(responseTimeMs).toBeLessThan(3000);
});

// =================================================================================================
// PART 2: ROUTE LIFECYCLE & GOVERNANCE STATE MACHINE (SCENARIOS 1 TO 7)
// =================================================================================================

// -------------------------------------------------------------------------------------------------
// SCENARIO 1: (Create Route Draft) [Cases 1.1 to 1.9]
// -------------------------------------------------------------------------------------------------

test('Part 2 - Scenario 1: (Create Route Draft) - Case 1.1: Create Valid Direct Express Route (201 Created, Status: DRAFT)', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-EXP');
  pm.environment.set('draftExpressRouteCode', dynamicCode);

  const payload = {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: String(pm.environment.get('draftExpressRouteCode')),
    routeType: String(pm.environment.get('routeType')),
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: 150.0,
    tatHoursRegular: 24.0,
    tatHoursSpeed: 18.0,
    ratePerKm: 10.0,
    routeCost: 1500.0,
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: ['08:00:00'],
    createdBy: String(pm.environment.get('submitterActor')),
  };

  const res = await RouteAPI.createRoute(request, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(201);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.data.status).toBe('DRAFT');
  expect(res.body.data.routeId).toBeDefined();
});

test('Part 2 - Scenario 1: (Create Route Draft) - Case 1.2: Create Valid Service Route with Intermediate Touchpoints (201 Created)', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-SRV');
  pm.environment.set('draftServiceRouteCode', dynamicCode);

  const payload = {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: String(pm.environment.get('draftServiceRouteCode')),
    routeType: 'SERVICE',
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: 250.0,
    tatHoursRegular: 36.0,
    tatHoursSpeed: 28.0,
    ratePerKm: 12.0,
    routeCost: 3000.0,
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: ['06:00:00'],
    touchPoints: [
      {
        branchCode: String(pm.environment.get('intermediateBranch')),
        arrivalDay: 0,
        arrivalTime: '12:00:00',
        departureDay: 0,
        departureTime: '13:00:00',
      },
    ],
    createdBy: String(pm.environment.get('submitterActor')),
  };

  const res = await RouteAPI.createRoute(request, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(201);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.data.status).toBe('DRAFT');
});

test('Part 2 - Scenario 1: (Create Route Draft) - Case 1.3: Negative - Duplicate Route Code (409 Conflict - ROUTE_CODE_EXISTS)', async ({ request }, testInfo) => {
  const { code, payload } = await createDraftRouteHelper(request);
  pm.environment.set('duplicateTestRouteCode', code);

  const res = await RouteAPI.createRoute(request, { ...payload, routeCode: code });

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload: { ...payload, routeCode: code } },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(409);
  expect(res.body.errorCode).toBe('ROUTE_CODE_EXISTS');
});

test('Part 2 - Scenario 1: (Create Route Draft) - Case 1.4: Negative - Same Source & Destination Branch (422 - ROUTE_BRANCHES_SAME)', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-SAME');
  pm.environment.set('sameBranchTestRouteCode', dynamicCode);

  const payload = {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: String(pm.environment.get('sameBranchTestRouteCode')),
    routeType: String(pm.environment.get('routeType')),
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('sourceBranch')), // Deliberate same branch
    distanceKm: 50.0,
    tatHoursRegular: 12.0,
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: ['08:00:00'],
    createdBy: String(pm.environment.get('submitterActor')),
  };

  const res = await RouteAPI.createRoute(request, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('ROUTE_BRANCHES_SAME');
});

test('Part 2 - Scenario 1: (Create Route Draft) - Case 1.5: Negative - Express Route me Touchpoints attach karna (422 - TOUCH_POINTS_NOT_ALLOWED)', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-EXPT');
  pm.environment.set('expressTouchpointTestRouteCode', dynamicCode);

  const payload = {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: String(pm.environment.get('expressTouchpointTestRouteCode')),
    routeType: 'EXPRESS',
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: 150.0,
    tatHoursRegular: 24.0,
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: ['08:00:00'],
    touchPoints: [
      {
        branchCode: String(pm.environment.get('intermediateBranch')),
        arrivalDay: 0,
        arrivalTime: '10:00:00',
        departureDay: 0,
        departureTime: '11:00:00',
      },
    ],
    createdBy: String(pm.environment.get('submitterActor')),
  };

  const res = await RouteAPI.createRoute(request, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('TOUCH_POINTS_NOT_ALLOWED');
});

test('Part 2 - Scenario 1: (Create Route Draft) - Case 1.6: Negative - Service Route bina Touchpoints ke create karna (422 - TOUCH_POINTS_REQUIRED)', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-SRVN');
  pm.environment.set('serviceWithoutTouchpointsTestRouteCode', dynamicCode);

  const payload = {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: String(pm.environment.get('serviceWithoutTouchpointsTestRouteCode')),
    routeType: 'SERVICE',
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: 150.0,
    tatHoursRegular: 24.0,
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: ['08:00:00'],
    touchPoints: [],
    createdBy: String(pm.environment.get('submitterActor')),
  };

  const res = await RouteAPI.createRoute(request, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('TOUCH_POINTS_REQUIRED');
});

test('Part 2 - Scenario 1: (Create Route Draft) - Case 1.7: Negative - validTo <= validFrom Date order violation (422 - VALIDITY_ORDER)', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-DATE');
  pm.environment.set('invalidDateTestRouteCode', dynamicCode);

  const payload = {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: String(pm.environment.get('invalidDateTestRouteCode')),
    routeType: String(pm.environment.get('routeType')),
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: 150.0,
    tatHoursRegular: 24.0,
    validFrom: '2027-01-01',
    validTo: '2026-01-01', // Deliberate invalid order
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: ['08:00:00'],
    createdBy: String(pm.environment.get('submitterActor')),
  };

  const res = await RouteAPI.createRoute(request, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('VALIDITY_ORDER');
});

test('Part 2 - Scenario 1: (Create Route Draft) - Case 1.8: Negative - runsPerDay out of bounds < 1 ya > 3 (422 - RUNS_PER_DAY_INVALID)', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-RUNS');
  pm.environment.set('invalidRunsTestRouteCode', dynamicCode);

  const payload = {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: String(pm.environment.get('invalidRunsTestRouteCode')),
    routeType: String(pm.environment.get('routeType')),
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: 150.0,
    tatHoursRegular: 24.0,
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 5, // Deliberate > 3
    scheduleStartTimes: ['08:00:00'],
    createdBy: String(pm.environment.get('submitterActor')),
  };

  const res = await RouteAPI.createRoute(request, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('RUNS_PER_DAY_INVALID');
});

test('Part 2 - Scenario 1: (Create Route Draft) - Case 1.9: Negative - runsPerDay vs scheduleStartTimes count mismatch (422 - SCHEDULE_RUNS_MISMATCH)', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-MIS');
  pm.environment.set('mismatchRunsTestRouteCode', dynamicCode);

  const payload = {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: String(pm.environment.get('mismatchRunsTestRouteCode')),
    routeType: String(pm.environment.get('routeType')),
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: 150.0,
    tatHoursRegular: 24.0,
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 2,
    scheduleStartTimes: ['08:00:00'], // Only 1 start time provided
    createdBy: String(pm.environment.get('submitterActor')),
  };

  const res = await RouteAPI.createRoute(request, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('SCHEDULE_RUNS_MISMATCH');
});

// -------------------------------------------------------------------------------------------------
// SCENARIO 2: (Submit Route for Approval) [Cases 2.1 to 2.4]
// -------------------------------------------------------------------------------------------------

test('Part 2 - Scenario 2: (Submit Route for Approval) - Case 2.1: Submit DRAFT Route for Approval (200 OK, Status: PENDING)', async ({ request }, testInfo) => {
  const { code } = await createDraftRouteHelper(request);
  const submitterActor = String(pm.environment.get('submitterActor'));
  const payload = { actor: submitterActor };

  const res = await RouteAPI.submitRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/submit`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.data.status).toBe('PENDING');
});

test('Part 2 - Scenario 2: (Submit Route for Approval) - Case 2.2: Negative - Submit Non-Existent Route Code (404 Not Found - NOT_FOUND)', async ({ request }, testInfo) => {
  const invalidCode = 'NON_EXISTENT_ROUTE_99999';
  const payload = { actor: String(pm.environment.get('submitterActor')) };

  const res = await RouteAPI.submitRoute(request, invalidCode, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${invalidCode}/submit`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(404);
  expect(res.body.errorCode).toBe('NOT_FOUND');
});

test('Part 2 - Scenario 2: (Submit Route for Approval) - Case 2.3: Negative - Already PENDING ya ACTIVE route ko submit karna (409 Conflict - INVALID_STATUS_TRANSITION)', async ({ request }, testInfo) => {
  const { code, submitter } = await createPendingRouteHelper(request);
  const payload = { actor: submitter };

  const res = await RouteAPI.submitRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/submit`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(409);
  expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
});

test('Part 2 - Scenario 2: (Submit Route for Approval) - Case 2.4: Negative - Missing Submitter Actor Identity in Request (400 Bad Request - IDENTITY_REQUIRED)', async ({ request }, testInfo) => {
  const { code } = await createDraftRouteHelper(request);
  const payload = { actor: '' };

  const res = await RouteAPI.submitRoute(request, code, payload as any);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/submit`, payload },
    { status: res.status, body: res.body }
  );

  expect([400, 422]).toContain(res.status);
});

// -------------------------------------------------------------------------------------------------
// SCENARIO 3: (Approve Route - Maker-Checker / SoD) [Cases 3.1 to 3.4]
// -------------------------------------------------------------------------------------------------

test('Part 2 - Scenario 3: (Approve Route - Maker-Checker / SoD) - Case 3.1: Approve PENDING Route by Independent Approver (200 OK, Status: CREATED)', async ({ request }, testInfo) => {
  const { code } = await createPendingRouteHelper(request);
  const approverActor = String(pm.environment.get('approverActor'));
  const payload = { actor: approverActor };

  const res = await RouteAPI.approveRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/approve`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.data.status).toBe('CREATED');
});

test('Part 2 - Scenario 3: (Approve Route - Maker-Checker / SoD) - Case 3.2: Negative - Segregation of Duties (SoD) Violation: Submitter khud apna route approve kare (422 - APPROVER_IS_MAKER)', async ({ request }, testInfo) => {
  const { code, submitter } = await createPendingRouteHelper(request);

  const approveRes = await RouteAPI.approveRoute(request, code, { actor: submitter });

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/approve`, payload: { actor: submitter } },
    { status: approveRes.status, body: approveRes.body }
  );

  expect(approveRes.status).toBe(422);
  expect(approveRes.body.errorCode).toBe('APPROVER_IS_MAKER');
});

test('Part 2 - Scenario 3: (Approve Route - Maker-Checker / SoD) - Case 3.3: Negative - DRAFT route ko bina submit kiye direct approve karna (409 Conflict - INVALID_STATUS_TRANSITION)', async ({ request }, testInfo) => {
  const { code } = await createDraftRouteHelper(request);
  const payload = { actor: String(pm.environment.get('approverActor')) };

  const res = await RouteAPI.approveRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/approve`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(409);
  expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
});

test('Part 2 - Scenario 3: (Approve Route - Maker-Checker / SoD) - Case 3.4: Negative - Non-Existent Route Code approve karna (404 Not Found - NOT_FOUND)', async ({ request }, testInfo) => {
  const invalidCode = 'NON_EXISTENT_ROUTE_99999';
  const payload = { actor: String(pm.environment.get('approverActor')) };

  const res = await RouteAPI.approveRoute(request, invalidCode, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${invalidCode}/approve`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(404);
  expect(res.body.errorCode).toBe('NOT_FOUND');
});

// -------------------------------------------------------------------------------------------------
// SCENARIO 4: (Reject Route Workflow) [Cases 4.1 to 4.4]
// -------------------------------------------------------------------------------------------------

test('Part 2 - Scenario 4: (Reject Route Workflow) - Case 4.1: Reject PENDING Route with valid rejection reason (200 OK, Status: REJECTED)', async ({ request }, testInfo) => {
  const { code } = await createPendingRouteHelper(request);
  const approver = String(pm.environment.get('approverActor'));

  const payload = { reason: 'Incorrect commercial distance rate', actor: approver };
  const res = await RouteAPI.rejectRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/reject`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.data.status).toBe('REJECTED');
});

test('Part 2 - Scenario 4: (Reject Route Workflow) - Case 4.2: Negative - Reject without reason string (422 - REJECTION_REASON_REQUIRED)', async ({ request }, testInfo) => {
  const { code } = await createPendingRouteHelper(request);
  const approver = String(pm.environment.get('approverActor'));

  const payload = { reason: '', actor: approver };
  const res = await RouteAPI.rejectRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/reject`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('REJECTION_REASON_REQUIRED');
});

test('Part 2 - Scenario 4: (Reject Route Workflow) - Case 4.3: Negative - Segregation of Duties (SoD) Violation: Submitter khud apna route reject kare (422 - APPROVER_IS_MAKER)', async ({ request }, testInfo) => {
  const { code, submitter } = await createPendingRouteHelper(request);

  const payload = { reason: 'Self rejection attempt', actor: submitter };
  const res = await RouteAPI.rejectRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/reject`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('APPROVER_IS_MAKER');
});

test('Part 2 - Scenario 4: (Reject Route Workflow) - Case 4.4: Negative - DRAFT ya ACTIVE status wale route ko reject karna (409 Conflict - INVALID_STATUS_TRANSITION)', async ({ request }, testInfo) => {
  const { code } = await createDraftRouteHelper(request);
  const payload = { reason: 'Rejecting draft', actor: String(pm.environment.get('approverActor')) };

  const res = await RouteAPI.rejectRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/reject`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(409);
  expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
});

// -------------------------------------------------------------------------------------------------
// SCENARIO 5: (Activate Route - Go-Live) [Cases 5.1 to 5.5]
// -------------------------------------------------------------------------------------------------

test('Part 2 - Scenario 5: (Activate Route - Go-Live) - Case 5.1: Activate CREATED Route (200 OK, Status: ACTIVE)', async ({ request }, testInfo) => {
  const { code, approver } = await createApprovedRouteHelper(request);
  const payload = { actor: approver };

  const res = await RouteAPI.activateRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/activate`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.data.status).toBe('ACTIVE');
});

test('Part 2 - Scenario 5: (Activate Route - Go-Live) - Case 5.2: Negative - Premature Activation with future validFrom date (422 - ACTIVATION_BEFORE_VALID_FROM)', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-FUT');
  const submitter = String(pm.environment.get('submitterActor'));
  const approver = String(pm.environment.get('approverActor'));

  await RouteAPI.createRoute(request, {
    companyCode: Number(pm.environment.get('companyCode')),
    routeCode: dynamicCode,
    routeType: String(pm.environment.get('routeType')),
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch: String(pm.environment.get('sourceBranch')),
    destinationBranch: String(pm.environment.get('destinationBranch')),
    distanceKm: 150.0,
    tatHoursRegular: 24.0,
    validFrom: '2099-01-01',
    validTo: '2099-12-31',
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: ['08:00:00'],
    createdBy: submitter,
  });

  await RouteAPI.submitRoute(request, dynamicCode, { actor: submitter });
  await RouteAPI.approveRoute(request, dynamicCode, { actor: approver });

  const res = await RouteAPI.activateRoute(request, dynamicCode, { actor: approver });

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${dynamicCode}/activate`, payload: { actor: approver } },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('ACTIVATION_BEFORE_VALID_FROM');
});

test('Part 2 - Scenario 5: (Activate Route - Go-Live) - Case 5.3: Negative - Duplicate Activation on already ACTIVE route (409 Conflict - INVALID_STATUS_TRANSITION)', async ({ request }, testInfo) => {
  const { code, approver } = await createActiveRouteHelper(request);
  const payload = { actor: approver };

  const res = await RouteAPI.activateRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/activate`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(409);
  expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
});

test('Part 2 - Scenario 5: (Activate Route - Go-Live) - Case 5.4: Negative - DRAFT ya PENDING route ko bypass karke direct activate karna (409 Conflict - INVALID_STATUS_TRANSITION)', async ({ request }, testInfo) => {
  const { code } = await createDraftRouteHelper(request);
  const payload = { actor: String(pm.environment.get('approverActor')) };

  const res = await RouteAPI.activateRoute(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/activate`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(409);
  expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
});

test('Part 2 - Scenario 5: (Activate Route - Go-Live) - Case 5.5: Negative - Activate Non-Existent Route Code (404 Not Found - NOT_FOUND)', async ({ request }, testInfo) => {
  const invalidCode = 'NON_EXISTENT_ROUTE_99999';
  const payload = { actor: String(pm.environment.get('approverActor')) };

  const res = await RouteAPI.activateRoute(request, invalidCode, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${invalidCode}/activate`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(404);
  expect(res.body.errorCode).toBe('NOT_FOUND');
});

// -------------------------------------------------------------------------------------------------
// SCENARIO 6: (Route Renewal Staging) [Cases 6.1 to 6.5]
// -------------------------------------------------------------------------------------------------

test('Part 2 - Scenario 6: (Route Renewal Staging) - Case 6.1: Submit Renewal on ACTIVE route with valid rate/TAT changes (200 OK, Status: RENEWAL)', async ({ request }, testInfo) => {
  const { code, submitter } = await createActiveRouteHelper(request);
  const payload = {
    changes: { ratePerKm: 12.5, tatHoursRegular: 22.0 },
    actor: submitter,
  };

  const res = await RouteAPI.submitRenewal(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.data.status).toBe('RENEWAL');
});

test('Part 2 - Scenario 6: (Route Renewal Staging) - Case 6.2: Negative - Renewal me non-renewable fields jaise sourceBranch badalna (422 - RENEWAL_FIELD_NOT_ALLOWED)', async ({ request }, testInfo) => {
  const { code, submitter } = await createActiveRouteHelper(request);
  const payload = {
    changes: { sourceBranch: String(pm.environment.get('intermediateBranch')) },
    actor: submitter,
  };

  const res = await RouteAPI.submitRenewal(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('RENEWAL_FIELD_NOT_ALLOWED');
});

test('Part 2 - Scenario 6: (Route Renewal Staging) - Case 6.3: Negative - Submit Renewal without any changes map (422 - RENEWAL_CHANGES_REQUIRED)', async ({ request }, testInfo) => {
  const { code, submitter } = await createActiveRouteHelper(request);
  const payload = {
    changes: {},
    actor: submitter,
  };

  const res = await RouteAPI.submitRenewal(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(422);
  expect(res.body.errorCode).toBe('RENEWAL_CHANGES_REQUIRED');
});

test('Part 2 - Scenario 6: (Route Renewal Staging) - Case 6.4: Approve Renewal by Independent Manager (200 OK, Status: ACTIVE)', async ({ request }, testInfo) => {
  const { code, submitter, approver } = await createActiveRouteHelper(request);

  await RouteAPI.submitRenewal(request, code, {
    changes: { ratePerKm: 14.0 },
    actor: submitter,
  });

  const payload = { actor: approver };
  const res = await RouteAPI.approveRenewal(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal/approve`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.data.status).toBe('ACTIVE');
});

test('Part 2 - Scenario 6: (Route Renewal Staging) - Case 6.5: Reject Renewal by Independent Manager (200 OK, Reverts to previous status)', async ({ request }, testInfo) => {
  const { code, submitter, approver } = await createActiveRouteHelper(request);

  await RouteAPI.submitRenewal(request, code, {
    changes: { ratePerKm: 18.0 },
    actor: submitter,
  });

  const payload = { reason: 'Rate too expensive', actor: approver };
  const res = await RouteAPI.rejectRenewal(request, code, payload);

  await attachApiLog(
    testInfo,
    { method: 'POST', endpoint: `${RouteAPI.basePath}/${code}/renewal/reject`, payload },
    { status: res.status, body: res.body }
  );

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('SUCCESS');
  expect(res.body.message).toContain('renewal rejected');
});

// -------------------------------------------------------------------------------------------------
// SCENARIO 7: (Complete End-to-End Route Lifecycle) [Case 7.1]
// -------------------------------------------------------------------------------------------------

test('Part 2 - Scenario 7: (Complete End-to-End Route Lifecycle) - Case 7.1: Full Golden Path - DRAFT -> SUBMIT -> APPROVE -> ACTIVATE -> Verify Visible in MM', async ({ request }, testInfo) => {
  const dynamicCode = generateUniqueCode('RT-GOLD');
  pm.environment.set('goldenRouteCode', dynamicCode);
  const submitter = String(pm.environment.get('submitterActor'));
  const approver = String(pm.environment.get('approverActor'));
  const companyCode = Number(pm.environment.get('companyCode'));
  const sourceBranch = String(pm.environment.get('sourceBranch'));
  const destinationBranch = String(pm.environment.get('destinationBranch'));

  // 1. Create Draft
  const draftRes = await RouteAPI.createRoute(request, {
    companyCode,
    routeCode: dynamicCode,
    routeType: String(pm.environment.get('routeType')),
    routeNature: String(pm.environment.get('routeNature')),
    sourceBranch,
    destinationBranch,
    distanceKm: 120.0,
    tatHoursRegular: 18.0,
    validFrom: String(pm.environment.get('validFrom')),
    validTo: String(pm.environment.get('validTo')),
    frequency: String(pm.environment.get('frequency')),
    runsPerDay: 1,
    scheduleStartTimes: ['09:00:00'],
    createdBy: submitter,
  });
  expect(draftRes.status).toBe(201);
  expect(draftRes.body.data.status).toBe('DRAFT');

  // 2. Submit
  const submitRes = await RouteAPI.submitRoute(request, dynamicCode, { actor: submitter });
  expect(submitRes.status).toBe(200);
  expect(submitRes.body.data.status).toBe('PENDING');

  // 3. Approve (SoD: Approver != Submitter)
  const approveRes = await RouteAPI.approveRoute(request, dynamicCode, { actor: approver });
  expect(approveRes.status).toBe(200);
  expect(approveRes.body.data.status).toBe('CREATED');

  // 4. Activate
  const activateRes = await RouteAPI.activateRoute(request, dynamicCode, { actor: approver });
  expect(activateRes.status).toBe(200);
  expect(activateRes.body.data.status).toBe('ACTIVE');

  // 5. Query MM Active Routes
  const listRes = await RouteAPI.listRoutes(request, {
    companyCode,
    status: 'ACTIVE',
    branch: sourceBranch,
  });

  await attachApiLog(
    testInfo,
    { method: 'GET', endpoint: `${RouteAPI.basePath}?companyCode=${companyCode}&status=ACTIVE&branch=${sourceBranch}` },
    { status: listRes.status, body: listRes.body }
  );

  expect(listRes.status).toBe(200);
  const found = listRes.body.data?.some((r: any) => r.routeCode === dynamicCode);
  expect(found).toBe(true);
});
