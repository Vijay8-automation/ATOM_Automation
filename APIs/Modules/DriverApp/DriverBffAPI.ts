import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class DriverBffAPI {
  public static readonly serviceKey = 'driverapp';
  public static readonly basePath = '/api/v1/driverapp';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30087');
  }

  /**
   * Register Driver Mobile Device.
   * POST /api/v1/driverapp/devices
   */
  public static async registerDevice(
    request: APIRequestContext,
    payload: {
      userId: string;
      companyCode?: number;
      deviceLabel?: string;
      platform?: string;
      appVersion?: string;
      pushToken?: string;
      driverCode?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/devices`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Update Device Push Token.
   * POST /api/v1/driverapp/devices/{deviceId}/push-token
   */
  public static async updatePushToken(
    request: APIRequestContext,
    deviceId: string,
    pushToken: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/devices/${deviceId}/push-token`;
    const response = await request.post(url, { data: { pushToken }, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Sync offline command queue.
   * POST /api/v1/driverapp/sync
   */
  public static async syncCommands(
    request: APIRequestContext,
    payload: { deviceId: string; commands: any[] },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/sync`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
