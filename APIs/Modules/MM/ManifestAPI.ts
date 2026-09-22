import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class ManifestAPI {
  public static readonly serviceKey = 'mm';
  public static readonly basePath = '/api/v1';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30084');
  }

  /**
   * Add Docket to Trip (Manifest).
   * POST /api/v1/trips/{tripId}/dockets
   */
  public static async addDocketToTrip(
    request: APIRequestContext,
    tripId: string,
    payload: { docketNo: string; addedBy: string; companyId: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripId}/dockets`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Remove Docket from Trip.
   * DELETE /api/v1/trips/{tripId}/dockets/{docketNo}
   */
  public static async removeDocketFromTrip(
    request: APIRequestContext,
    tripId: string,
    docketNo: string,
    params: { removedBy: string; companyId: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams(params as any).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripId}/dockets/${docketNo}?${query}`;
    const response = await request.delete(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Generate Manifests for a Trip.
   * POST /api/v1/trips/{tripNo}/manifests
   */
  public static async generateManifests(
    request: APIRequestContext,
    tripNo: string,
    actor?: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = actor ? `?actor=${encodeURIComponent(actor)}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/manifests${query}`;
    const response = await request.post(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Load scanned box into Manifest.
   * POST /api/v1/manifests/{manifestNo}/loading/boxes
   */
  public static async loadBox(
    request: APIRequestContext,
    manifestNo: string,
    payload: {
      docketNo: string;
      boxCode: string;
      scanEventId: string;
      damagePhotoUrl?: string;
      damageRemarks?: string;
      actor: string;
      branch: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/manifests/${manifestNo}/loading/boxes`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Close Loading for Manifest.
   * POST /api/v1/manifests/{manifestNo}/loading/close
   */
  public static async closeLoading(
    request: APIRequestContext,
    manifestNo: string,
    payload: { actor: string; branch: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/manifests/${manifestNo}/loading/close`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Start Unloading for Manifest at Destination.
   * POST /api/v1/manifests/{manifestNo}/unloading/start
   */
  public static async startUnloading(
    request: APIRequestContext,
    manifestNo: string,
    payload: { actor: string; branch: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/manifests/${manifestNo}/unloading/start`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Unload Box at Destination.
   * POST /api/v1/manifests/{manifestNo}/unloading/boxes
   */
  public static async unloadBox(
    request: APIRequestContext,
    manifestNo: string,
    payload: {
      docketNo: string;
      boxCode: string;
      scanEventId: string;
      damagePhotoUrl?: string;
      damageRemarks?: string;
      actor: string;
      branch: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/manifests/${manifestNo}/unloading/boxes`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Close Unloading for Manifest.
   * POST /api/v1/manifests/{manifestNo}/unloading/close
   */
  public static async closeUnloading(
    request: APIRequestContext,
    manifestNo: string,
    payload: { actor: string; branch: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/manifests/${manifestNo}/unloading/close`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Movable Dockets for Branch.
   * GET /api/v1/mm/branches/{branchCode}/movable-dockets
   */
  public static async getMovableDockets(
    request: APIRequestContext,
    branchCode: string,
    params?: { companyCode?: number; page?: number; size?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const queryParams: Record<string, string> = {};
    if (params?.companyCode !== undefined) queryParams.companyCode = String(params.companyCode);
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.size !== undefined) queryParams.size = String(params.size);

    const query = new URLSearchParams(queryParams).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/branches/${branchCode}/movable-dockets${query ? `?${query}` : ''}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
