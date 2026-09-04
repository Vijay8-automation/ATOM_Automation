import { APIRequestContext, APIResponse } from '@playwright/test';
import defaultPayload from './loginPayload.json';
import { getUserCredentials, getBaseUrl } from '../../../../TestData/Excel_Reader/excelReader';

export interface DeviceInfo {
  deviceId: string;
  deviceType: string;
  ipAddress: string;
  userAgent: string;
}

export interface LoginRequestPayload {
  username: string;
  password: string;
  deviceInfo: DeviceInfo;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  [key: string]: any;
}

export interface LoginResponseBody {
  status: string;
  message?: string;
  data: LoginResponseData;
  timestamp?: string;
}

export class LoginAPI {
  public static readonly endpoint = '/user-iam/v1/login';
  public static readonly method = 'POST';

  private static cachedAccessToken: string | null = null;
  private static cachedRefreshToken: string | null = null;

  public static getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  public static getDefaultPayload(): LoginRequestPayload {
    return defaultPayload;
  }

  /**
   * Primary method: Executes Login using credentials (Username, Password)
   * and Base URL picked automatically from TestData.xlsx.
   *
   * @param request Playwright APIRequestContext
   * @param customCreds Optional credentials override
   */
  public static async login(
    request: APIRequestContext,
    customCreds?: { username?: string; password?: string; baseUrl?: string }
  ): Promise<{
    response: APIResponse;
    body: LoginResponseBody;
    accessToken: string;
    refreshToken: string;
    authHeader: Record<string, string>;
  }> {
    // 1. Pick baseUrl from Excel (or customCreds)
    const baseUrl = customCreds?.baseUrl || getBaseUrl();

    // 2. Pick Username and Password from Excel (or customCreds)
    let username = customCreds?.username;
    let password = customCreds?.password;

    if (!username || !password) {
      const excelCreds = getUserCredentials('User_credential');
      username = username || excelCreds.username;
      password = password || excelCreds.password;
    }

    // 3. Build payload with resolved credentials
    const payload: LoginRequestPayload = {
      username,
      password,
      deviceInfo: {
        ...defaultPayload.deviceInfo,
        deviceId: `device-${Date.now()}`,
      },
    };

    // 4. Send request
    const result = await this.execute(request, baseUrl, payload);

    // 5. Cache tokens
    if (result.accessToken) {
      this.cachedAccessToken = result.accessToken;
      this.cachedRefreshToken = result.refreshToken;
    }

    const authHeader = result.accessToken
      ? { Authorization: `Bearer ${result.accessToken}` }
      : {};

    return {
      ...result,
      authHeader,
    };
  }

  /**
   * Low-level method: Executes the raw Login API request with given payload.
   */
  public static async execute(
    request: APIRequestContext,
    baseUrl: string = getBaseUrl(),
    payload: any = defaultPayload,
    customHeaders?: Record<string, string>
  ): Promise<{ response: APIResponse; body: LoginResponseBody; accessToken: string; refreshToken: string }> {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}${this.endpoint}`;

    const headers = {
      ...this.getDefaultHeaders(),
      ...(customHeaders || {}),
    };

    const response = await request.post(url, {
      headers,
      data: payload,
      failOnStatusCode: false,
    });

    let body: any = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }

    const accessToken = body?.data?.accessToken || '';
    const refreshToken = body?.data?.refreshToken || '';

    return {
      response,
      body,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Returns the Authorization header with Bearer token.
   */
  public static getAuthHeader(): Record<string, string> {
    if (!this.cachedAccessToken) {
      throw new Error('[LoginAPI] Access token not available. Run LoginAPI.login(request) first.');
    }
    return {
      Authorization: `Bearer ${this.cachedAccessToken}`,
    };
  }

  public static getCachedToken(): string | null {
    return this.cachedAccessToken;
  }
}
