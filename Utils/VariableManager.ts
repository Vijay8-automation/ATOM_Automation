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
  billingPartyCode: 'CUS0000025B',
  customerCode: 'CUS0000025B',
  customerType: 'BUSINESS',
  pickupPincode: '201309',
  deliveryPincode: '400604',
  consignorPincode: '201309',
  consignorCode: 'CUS0000025B',
  consignorGstin: '33AFSPR6315L1ZW',
  consigneeCode: 'CUS0000024R',
  consigneeGstin: '06AJOPK4609C1ZD',
  deliveryAddressId: 1,
  pickupLocationId: 1,
  transportMode: 'ROAD',
  loadType: 'PTL',
  freightMode: 'CREDIT',
  docketSource: 'WEB',
  createdBy: 'a1a1a1a1-0001-4000-8000-000000000001',
  actor: 'a1a1a1a1-0001-4000-8000-000000000001',
  driverCode: '101',
  driverName: 'Ramesh Kumar',
  driverMobile: '9876543210',
  priority: 'MEDIUM',
  vehicleType: '32FT',
  vehicleCapacityKg: 10000,
  vehicleOwnership: 'OWNED',
  vendorCode: 'VEND-001',
  routeType: 'FEEDER',
  tripCreationSource: 'MANUAL',
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
