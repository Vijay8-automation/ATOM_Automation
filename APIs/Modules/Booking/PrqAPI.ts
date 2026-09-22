import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class PrqAPI {
  public static readonly serviceKey = 'booking';
  public static readonly basePath = '/api/v1/prqs';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30082');
  }

  /**
   * Create Pickup Request (PRQ).
   * POST /api/v1/prqs
   */
  public static async createPrq(
    request: APIRequestContext,
    payload: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get PRQ Details.
   * GET /api/v1/prqs/{prqNo}
   */
  public static async getPrq(
    request: APIRequestContext,
    prqNo: string,
    companyId: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${prqNo}?companyId=${encodeURIComponent(companyId)}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Update PRQ Status.
   * POST /api/v1/prqs/{prqNo}/status
   */
  public static async updatePrqStatus(
    request: APIRequestContext,
    prqNo: string,
    payload: { status: string; remarks?: string; companyId: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${prqNo}/status`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Search PRQs.
   * GET /api/v1/prqs
   */
  public static async searchPrqs(
    request: APIRequestContext,
    params: { companyId: string; status?: string; branchCode?: string; page?: number; size?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams(params as any).toString();
    const url = `${this.getBaseUrl()}${this.basePath}?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
