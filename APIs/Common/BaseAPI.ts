import * as path from 'path';
import * as fs from 'fs';
import { APIRequestContext, request as playwrightRequest } from '@playwright/test';
import { getBaseUrl } from '../../TestData/Excel_Reader/excelReader';
import { LoginAPI } from '../Modules/UserIAMService/auth/LoginAPI';
import { pm } from '../../Utils/VariableManager';

const TOKEN_FILE_PATH = path.resolve(__dirname, '../../TestData/authToken.json');

/**
 * Central Base API class for ATOM Automation.
 * Shared across ALL current and future API modules (Franchise, Branch, Driver, Customer, etc.).
 *
 * Provides:
 * 1. Universal Auto-Login & Bearer Token Resolution (No manual login required before running scenarios)
 * 2. Centralized Gateway Headers ('x-user-id', 'x-company-id', 'Authorization', 'Content-Type')
 * 3. Base URL Resolution from TestData.xlsx
 * 4. Integration with Postman-style `pm.environment` variable manager
 */
export class BaseAPI {
  private static inMemoryToken: string | null = null;

  /**
   * Reads saved Bearer token from in-memory cache, authToken.json, or pm.environment.
   * Returns empty string if no token exists yet.
   */
  public static getSavedAuthToken(): string {
    // 1. Check in-memory cache
    if (this.inMemoryToken) {
      return this.inMemoryToken;
    }

    // 2. Check pm.environment variable store
    const pmToken = pm.environment.get('authToken');
    if (pmToken && typeof pmToken === 'string') {
      this.inMemoryToken = pmToken;
      return pmToken;
    }

    // 3. Check TestData/authToken.json file
    try {
      if (fs.existsSync(TOKEN_FILE_PATH)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, 'utf-8'));
        if (data.accessToken) {
          this.inMemoryToken = data.accessToken;
          return data.accessToken;
        }
      }
    } catch (err: any) {
      console.warn('[BaseAPI] Warning reading authToken.json:', err.message);
    }

    return '';
  }

  /**
   * Ensures a valid Bearer token is available.
   *
   * SMART AUTO-LOGIN:
   * - If a valid token is already saved, returns it immediately (Zero overhead!).
   * - If token is missing, expired, or forceRefresh is true:
   *   Automatically executes Master Login using credentials from TestData.xlsx,
   *   saves the token to disk and pm.environment, and returns it.
   *
   * @param request Optional Playwright APIRequestContext
   * @param forceRefresh Force a fresh login even if token already exists
   */
  public static async ensureAuthToken(
    request?: APIRequestContext,
    forceRefresh: boolean = false
  ): Promise<string> {
    if (!forceRefresh) {
      const existingToken = this.getSavedAuthToken();
      if (existingToken) {
        return existingToken;
      }
    }

    console.log('[BaseAPI] No active token found. Initiating Auto-Login using credentials from TestData.xlsx...');
    const reqContext = request || (await playwrightRequest.newContext());

    try {
      const loginRes = await LoginAPI.login(reqContext);
      const token = loginRes.accessToken;

      if (!token) {
        throw new Error('[BaseAPI] Auto-Login failed: LoginAPI did not return an accessToken.');
      }

      // 1. Cache in memory
      this.inMemoryToken = token;

      // 2. Save in pm.environment store
      pm.environment.set('authToken', token);

      // 3. Save in TestData/authToken.json
      const dir = path.dirname(TOKEN_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        TOKEN_FILE_PATH,
        JSON.stringify({ accessToken: token, refreshToken: loginRes.refreshToken, savedAt: new Date().toISOString() }, null, 2),
        'utf-8'
      );

      console.log('[BaseAPI] Auto-Login successful! Token saved and ready for API requests.');
      return token;
    } catch (error: any) {
      console.error('[BaseAPI] Auto-Login error:', error.message);
      throw error;
    }
  }

  /**
   * Returns common gateway headers required by all microservices.
   * If token is not provided, automatically falls back to getSavedAuthToken().
   *
   * @param token Optional Bearer token string
   * @param overrides Optional custom headers to merge or override
   */
  public static getDefaultGatewayHeaders(
    token?: string,
    overrides?: Record<string, string>
  ): Record<string, string> {
    const activeToken = token || this.getSavedAuthToken();

    const headers: Record<string, string> = {
      'x-user-id': '00000000-0000-0000-0000-000000000001',
      'x-company-id': '00000000-0000-0000-0000-000000000002',
      'Content-Type': 'application/json',
      ...(overrides || {}),
    };

    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    return headers;
  }

  /**
   * Resolves base URL for APIs from TestData.xlsx (Sheet: Environment).
   */
  public static getApiBaseUrl(sheetName: string = 'Environment'): string {
    return getBaseUrl(sheetName);
  }
}

// =========================================================================
// Functional Exports (Backward-compatible with franchiseBase.ts & all modules)
// =========================================================================
export const getSavedAuthToken = () => BaseAPI.getSavedAuthToken();
export const ensureAuthToken = (req?: APIRequestContext, force?: boolean) => BaseAPI.ensureAuthToken(req, force);
export const getDefaultGatewayHeaders = (token?: string, overrides?: Record<string, string>) =>
  BaseAPI.getDefaultGatewayHeaders(token, overrides);
export const getApiBaseUrl = (sheetName?: string) => BaseAPI.getApiBaseUrl(sheetName);
