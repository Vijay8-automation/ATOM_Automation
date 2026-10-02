import * as fs from 'fs';
import * as path from 'path';

/**
 * Path to the environment variables JSON file.
 * Defaults to TestData/environment.json.
 */
const ENV_FILE_PATH = path.resolve(__dirname, '../TestData/environment.json');

/**
 * Centralized Static Configuration Values.
 * Defined directly in VariableManager so all API modules (Booking, LMFM, MM, Network, Scanning, etc.)
 * can reuse them without duplicating values in individual test scripts.
 */
export const DEFAULT_STATIC_CONFIG: Record<string, any> = {
  companyCode: 400021,
  companyId: 'bc6e8034-70eb-5804-8dc5-0bad36f31812',
  bookingBranch: '7500',
  sourceBranch: '1001',
  destinationBranch: '2115',
  intermediateBranch: '1002',
  secondIntermediateBranch: '1003',
  thirdIntermediateBranch: '1004',
  multiBranch1: '1001',
  multiBranch2: '1002',
  multiBranch3: '1003',
  multiBranch4: '1004',
  deviceTouchPoint1Id: 'DEV-B2-01',
  deviceTouchPoint2Id: 'DEV-B3-01',
  deviceDestinationId: 'DEV-B4-01',
  networkBaseUrl: 'http://10.10.130.123:30085',
  mmBaseUrl: 'http://10.10.130.123:30084',
  scanningBaseUrl: 'http://10.10.130.123:30088',
  bookingBaseUrl: 'http://10.10.130.123:30081',
  defaultDistanceKm4Br: 420.0,
  defaultTatHoursRegular4Br: 32.0,
  defaultTatHoursSpeed4Br: 24.0,
  defaultRatePerKm4Br: 15.0,
  defaultRouteCost4Br: 6300.0,
  billingPartyCode: 'CUS0009873B',
  customerCode: 'CUS0009873B',
  customerType: 'BUSINESS',
  pickupPincode: '201309',
  deliveryPincode: '400604',
  consignorPincode: '201309',
  consignorCode: 'CUS0009873B',
  consignorGstin: '33AFSPR6315L1ZW',
  consigneeCode: 'CUS0000024R',
  consigneeGstin: '06AJOPK4609C1ZD',
  deliveryAddressId: 1,
  pickupLocationId: 1,
  transportMode: 'ROAD',
  loadType: 'PTL',
  freightMode: 'CREDIT',
  docketSource: 'WEB',
  invoiceDate: '2026-09-02',
  grossValue: 10000,
  netValue: 9500,
  ewayBillNo: 302327052774,
  boxType: 'CARTON',
  boxUnit: 'CM',
  boxLength: 30,
  boxWidth: 20,
  boxHeight: 15,
  boxWeight: 10.0,
  createdBy: 'a1a1a1a1-0001-4000-8000-000000000001',
  actor: 'a1a1a1a1-0001-4000-8000-000000000001',
  submitterActor: 'a1a1a1a1-0001-4000-8000-000000000001',
  approverActor: 'b2b2b2b2-0002-4000-8000-000000000002',
  thirdUserActor: 'c3c3c3c3-0003-4000-8000-000000000003',
  fakeActorUuid: '00000000-0000-0000-0000-000000000001',
  fakeApproverUuid: '00000000-0000-0000-0000-000000000002',
  nonUuidActor: 'admin-user',
  driverCode: '101',
  planDriverCode: '999001',
  driverName: 'Ramesh Kumar',
  driverMobile: '9876543210',
  priority: 'MEDIUM',
  vehicleType: '32FT',
  vehicleCapacityKg: 10000,
  vehicleOwnership: 'OWNED',
  vendorCode: 'VEND-001',
  gpsStatus: 'ACTIVE',
   dockNo: 'DOCK-1',
  originDeviceId: 'DEV-ORIGIN-01',
  deviceOriginId: 'DEV-ORIGIN-01',
  routeType: 'EXPRESS',
  expressRouteType: 'EXPRESS',
  serviceRouteType: 'SERVICE',
  feederRouteType: 'FEEDER',
  routeNature: 'PERMANENT',
  adhocRouteNature: 'ADHOC',
  frequency: 'DAILY',
  weeklyFrequency: 'WEEKLY',
  validFrom: '2026-09-01',
  validTo: '2027-09-01',
  defaultStartTime: '08:00:00',
  serviceStartTime: '06:00:00',
  touchPointArrivalTime: '12:00:00',
  touchPointDepartureTime: '13:00:00',
  defaultDistanceKm: 150.0,
  defaultTatHoursRegular: 24.0,
  defaultTatHoursSpeed: 18.0,
  defaultRatePerKm: 10.0,
  defaultRouteCost: 1500.0,
  routeCode: 'RT-DRF-0232841399402',
  activeRouteCode: 'RT-DRF-0232841399402',
  filterRouteType: 'EXPRESS',
  tripCreationSource: 'MANUAL',
  creationSource: 'MANUAL',
  inactiveRouteCode: 'DRAFT_INACTIVE_ROUTE_TEST',
  nonExistentRouteCode: 'NON_EXISTENT_ROUTE_99999',
  unknownRouteCode: 'NON_EXISTENT_ROUTE_99999',
  invalidCompanyCode: 999999,
  negativeCompanyCode: -1,
  invalidRouteType: 'SUPER_FAST_EXPRESS_INVALID',
  invalidRouteNature: 'SEASONAL',
  invalidFrequency: 'MONTHLY',
  invalidDateFormat: '01-09-2026',
  fakeSourceBranch: 'FAKE9999',
  fakeDestinationBranch: 'FAKE8888',
  fakeTouchPointBranch: 'FAKE_TP_99',
  wrongGateInBranch: '9999',
  fakeTripNo: 'TRIP-FAKE-99999999',
  negativeDistanceKm: -500.0,
  overflowDistanceKm: 9999999999,
  negativeTatHoursRegular: -10.0,
  negativeTatHoursSpeed: -10.0,
  negativeRatePerKm: -15.0,
  negativeRouteCost: -5000.0,
  reversedRegularTat: 20.0,
  reversedSpeedTat: 30.0,
  outOfRangeRunsPerDayHigh: 5,
  outOfRangeRunsPerDayNegative: -1,
  negativeTouchPointArrivalDay: -5,
  outOfRangeTouchPointDepartureDay: 35,
  futureValidFrom: '2099-01-01',
  futureValidTo: '2099-12-31',
  expiredValidFrom: '2020-01-01',
  expiredValidTo: '2020-12-31',
  invertedValidFrom: '2028-01-01',
  invertedValidTo: '2026-01-01',
  rejectionReason: 'Incorrect commercial distance rate',
  renewalRejectionReason: 'Rate too expensive',
  validGeoLat: 28.6139,
  validGeoLong: 77.2090,
  outOfRangeGeoLat: 9999.0,
  outOfRangeGeoLong: -9999.0,
  fakeLoadingBranchCode: 'FAKE_BR_999',
  invalidPhotoUrl: 'not_even_a_url',
  load50PhotoUrl: 'http://example.com/load_50.jpg',
  load100PhotoUrl: 'http://example.com/load_100.jpg',
  defaultRouteStrictness: 'PREFERRED',
  requiredRouteStrictness: 'REQUIRED',
  ignoredRouteStrictness: 'IGNORED',
  invalidRouteStrictness: 'INVALID_STRICTNESS',
  defaultRankedBy: 'BEST_VALUE',
  invalidRankedBy: 'INVALID_RANK_RULE',
  recommendedTopVehicle: 'DL01AB1111',
  overriddenChosenVehicle: 'DL01AB9999',
  validOverrideReason: 'Driver requested alternate vehicle due to maintenance',
  validCandidatesCount: 3,
  validExcludedCount: 1,
  negativeCandidatesCount: -50,
  negativeExcludedCount: -100,
  overflowCandidatesCount: 999999,
  negativeCapacityKg: -5000,
  overflowCapacityKg: 999999999999,
  nonNumericDriverCode: 'DRV-ABC',
  nonNumericDriverMobile: 'NOT-A-NUMBER',
  nonSelectedDocketReason: 'Damaged outer packaging',
  negativePage: -1,
  zeroSize: 0,
  negativeSize: -10,
  negativeMinAgeHours: -50,
  negativeAgingDays: -20,
  invalidTransportMode: 'FAKE_MODE',
  invalidLoadType: 'FAKE_LOAD',
  expectedVehiclesUpcomingMode: 'UPCOMING',
  expectedVehiclesUnloadingMode: 'UNLOADING',
  validPlanDate: '2026-09-27',
  pastPlanDate: '2020-01-01',
  validPlanCnCount: 5,
  validPlanBoxCount: 20,
  validPlanWeightKg: 500.0,
  validConfidencePct: 92.5,
  validUtilizationPct: 85.0,
  validEstimatedCost: 15000.0,
  validEstimatedTatHours: 24.0,
  outOfRangeConfidencePctHigh: 150.0,
  outOfRangeConfidencePctNegative: -20.0,
  outOfRangeUtilizationPctHigh: 250.0,
  outOfRangeUtilizationPctNegative: -50.0,
  negativePlanCnCount: -10,
  negativePlanBoxCount: -50,
  negativePlanWeightKg: -999.0,
  negativeEstimatedCost: -50000.0,
  negativeEstimatedTatHours: -24.0,
  overflowPlanWeightKg: 9999999999999.0,
  overflowEstimatedCost: 999999999999999.0,
  fakeCandidateId: 999999,
  fakePlanNo: 'PLAN-FAKE-999999',
  emptyTripDriverCode: '9002',
  emptyTripDriverName: 'Vikram Singh',
  emptyTripDriverMobile: '9811223355',
  emptyTripReplaceDriverCode: '9003',
  emptyTripReplaceDriverName: 'Rajesh Verma',
  emptyTripReplaceDriverMobile: '9811223366',
  emptyTripDriverReplaceReason: 'Primary driver shift completed at hub',
  negativeDriverCode: '-9999',
  shortInvalidDriverMobile: '123',
  validCancelReason: 'Vehicle breakdown before loading',
  validDockReleaseReason: 'QA dock release after yard inspection',
  validQueueRemoveReason: 'Vehicle reassigned to alternate bay',
  validCnRemoveReasonCode: 'CUSTOMER_HOLD',
  validCnRemoveRemarks: 'Customer requested hold before loading',
  validDamagePhotoUrl: 'https://cdn.omone.in/damage/box_dent.jpg',
  validLoadDamageRemarks: 'Minor corner dent observed at loading',
  validUnloadDamageRemarks: 'Corner dent confirmed at destination unloading',
  validSealPhotoUrl: 'https://cdn.omone.in/seals/valid_seal.jpg',
  validDriverPhotoUrl: 'https://cdn.omone.in/drivers/driver_gatein.jpg',
  validComplianceType: 'EWAY_BILL',
  validComplianceDocRef: 'EWB-DOC-998877',
  validReviseWeightKg: 1200,
  validReviseReason: 'Updated weighbridge ticket weight',
  negativeReviseWeightKg: -5000,
  overflowReviseWeightKg: 999999999999,
  fakeScanEventId: '00000000-0000-4000-8000-000000000999',
  fakeManifestNo: 'MNF-FAKE-999999-1',
  fakeBoxCode: 'BOX-FAKE-999999-B1',
  fakeDocketNoForBypass: '7500-FAKE-BYPASS-99999',
  negativeDocketWeightKg: -250,
  priorityAirMode: 'AIR',
  activeTouchPointRouteCode: 'RT-TP-17619',
  dockFilterAll: 'ALL',
  dockFilterLoading: 'LOADING',
  dockFilterUnloading: 'UNLOADING',
  dockFilterAvailable: 'AVAILABLE',
  invalidDockFilter: 'FAKE_DOCK_FILTER',
  branchInventoryFilterCurrent: 'CURRENT',
  branchInventoryFilterUpcoming: 'UPCOMING',
  branchInventoryFilterUnloading: 'UNLOADING',
  invalidBranchInventoryFilter: 'FAKE_INV_FILTER',
  loadingPhoto50Stage: 'LOAD_50',
  loadingPhoto100Stage: 'LOAD_100',
  fakeDocketNo: '7500-FAKE-DOCKET-99999',
  fakeRouteCode: 'RT-FAKE-99999',
  invalidShortDriverMobile: '123',
  fakeDockNo: 'DOCK-FAKE-999',
  invalidDockPurpose: 'INVALID_PURPOSE',
  invalidCnRemoveReasonCode: 'FAKE_REMOVE_REASON',
  negativeGateHistoryLimit: -5,
  invalidShortageDate: '01-09-2026',
};

/**
 * Postman-style Environment Store.
 * Allows storing, retrieving, and sharing dynamic variables (tokens, entity IDs, test data)
 * across tests, modules, and API-to-UI workflows.
 */
class EnvironmentStore {
  private cache: Map<string, any> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.loadFromFile();
  }

  /**
   * Loads persisted variables from environment.json into memory,
   * seeded with DEFAULT_STATIC_CONFIG so variables are always available.
   */
  private loadFromFile(): void {
    // 1. Pre-populate with all static configuration values
    this.cache = new Map(Object.entries(DEFAULT_STATIC_CONFIG));

    // 2. Overlay any updated or runtime variables from environment.json
    try {
      if (fs.existsSync(ENV_FILE_PATH)) {
        const rawContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8').trim();
        if (rawContent) {
          const data = JSON.parse(rawContent);
          for (const [key, value] of Object.entries(data)) {
            this.cache.set(key, value);
          }
        }
      }
      this.initialized = true;
    } catch (err: any) {
      console.warn(`[VariableManager] Warning reading ${ENV_FILE_PATH}:`, err.message);
      this.initialized = true;
    }
  }

  /**
   * Flushes in-memory variables to environment.json on disk.
   */
  private syncToFile(): void {
    try {
      const dir = path.dirname(ENV_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Object.fromEntries(this.cache);
      fs.writeFileSync(ENV_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn(`[VariableManager] Warning writing ${ENV_FILE_PATH}:`, err.message);
    }
  }

  /**
   * Sets an environment variable 
   * Automatically persists to TestData/environment.json.
   *
   * @param key Variable name
   * @param value Value to store (string, number, boolean, object, array)
   */
  public set(key: string, value: any): void {
    if (!this.initialized) this.loadFromFile();
    this.cache.set(key, value);
    this.syncToFile();
    console.log(`[pm.environment] Stored: "${key}" =`, typeof value === 'object' ? JSON.stringify(value) : value);
  }

  /**
   * Retrieves an environment variable 
   *
   * @param key Variable name
   * @param defaultValue Optional fallback value if key does not exist
   */
  public get<T = any>(key: string, defaultValue?: T): T {
    // Re-read file to pick up any changes from other files/processes
    this.loadFromFile();
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    return (defaultValue !== undefined ? defaultValue : undefined) as unknown as T;
  }

  /**
   * Checks if an environment variable exists.
   *
   * @param key Variable name
   */
  public has(key: string): boolean {
    this.loadFromFile();
    return this.cache.has(key);
  }

  /**
   * Removes a specific environment variable.
   *
   * @param key Variable name
   */
  public unset(key: string): void {
    if (!this.initialized) this.loadFromFile();
    if (this.cache.delete(key)) {
      this.syncToFile();
      console.log(`[pm.environment] Unset: "${key}"`);
    }
  }

  /**
   * Clears all stored environment variables.
   */
  public clear(): void {
    this.cache.clear();
    this.syncToFile();
    console.log(`[pm.environment] Cleared all environment variables.`);
  }

  /**
   * Returns a snapshot of all currently stored variables as a plain object.
   */
  public toObject(): Record<string, any> {
    this.loadFromFile();
    return Object.fromEntries(this.cache);
  }
}

/**
 * Singleton Postman-like interface (`pm`).
 * Provides `pm.environment` and `pm.variables` for setting and getting test state across tests.
 *
 * Usage:
 * ```typescript
 * import { pm } from 'Utils/VariableManager';
 *
 * // Postman style:
 * pm.environment.set('franchiseId', response.data.entityId);
 * const id = pm.environment.get('franchiseId');
 * ```
 */
export class VariableManager {
  public static readonly environment = new EnvironmentStore();
  public static readonly variables = VariableManager.environment;
}

// Export Postman-style 'pm' alias for natural, familiar usage
export const pm = VariableManager;
