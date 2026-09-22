import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class ZoneAPI {
  public static readonly serviceKey = 'network';
  public static readonly basePath = '/api/v1/serviceability/zones';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30085');
  }

  /**
   * Rename Cluster / Zone.
   * PATCH /api/v1/serviceability/zones/{zoneId}/name
   */
  public static async renameZone(
    request: APIRequestContext,
    zoneId: number | string,
    payload: { zoneName: string; modifiedBy: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${zoneId}/name`;
    const response = await request.patch(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
