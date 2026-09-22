import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class DocketAPI {
  public static readonly serviceKey = 'booking';
  public static readonly basePath = '/api/v1/dockets';

  /**
   * Resolves base URL dynamically from TestData.xlsx sheet "URL's" (Column: booking)
   */
  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30082');
  }

  /**
   * Create a new Docket (Consignment).
   * POST /api/v1/dockets
   */
  public static async createDocket(
    request: APIRequestContext,
    payload: Record<string, any>,
    options?: { token?: string; idempotencyKey?: string }
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const token = await BaseAPI.ensureAuthToken(request);
    const headers = BaseAPI.getDefaultGatewayHeaders(options?.token || token, {
      ...(options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    });

    const url = `${this.getBaseUrl()}${this.basePath}`;
    const response = await request.post(url, {
      data: payload,
      headers,
    });

    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Preview Docket calculation without persisting.
   * POST /api/v1/dockets/preview
   */
  public static async previewDocket(
    request: APIRequestContext,
    payload: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/preview`;
    const response = await request.post(url, {
      data: payload,
      headers,
    });

    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Docket Detail.
   * GET /api/v1/dockets/{docketNo}?companyId=...
   */
  public static async getDocket(
    request: APIRequestContext,
    docketNo: string,
    companyId: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${docketNo}?companyId=${encodeURIComponent(companyId)}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Cancel Docket.
   * POST /api/v1/dockets/{docketNo}/cancel
   */
  public static async cancelDocket(
    request: APIRequestContext,
    docketNo: string,
    payload: { cancelledBy: string; companyId: string; reason?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${docketNo}/cancel`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Void Docket.
   * POST /api/v1/dockets/{docketNo}/void
   */
  public static async voidDocket(
    request: APIRequestContext,
    docketNo: string,
    payload: { voidedBy: string; companyId: string; reason?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${docketNo}/void`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Track Docket status & events.
   * GET /api/v1/dockets/{docketNo}/tracking?companyId=...
   */
  public static async getTracking(
    request: APIRequestContext,
    docketNo: string,
    companyId: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${docketNo}/tracking?companyId=${encodeURIComponent(companyId)}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Search Dockets.
   * GET /api/v1/dockets
   */
  public static async searchDockets(
    request: APIRequestContext,
    params: { companyId: string; status?: string; bookingBranch?: string; page?: number; size?: number },
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
