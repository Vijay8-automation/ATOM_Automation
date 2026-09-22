import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class MMTripAPI {
  public static readonly serviceKey = 'mm';
  public static readonly basePath = '/api/v1/trips';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30084');
  }

  /**
   * Create MM Trip.
   * POST /api/v1/trips
   */
  public static async createTrip(
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
   * Get Trip details.
   * GET /api/v1/trips/{tripId}
   */
  public static async getTrip(
    request: APIRequestContext,
    tripId: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${tripId}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Cancel MM Trip.
   * POST /api/v1/trips/{tripId}/cancel
   */
  public static async cancelTrip(
    request: APIRequestContext,
    tripId: string,
    payload: { cancelledBy: string; reason?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${tripId}/cancel`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Gate In vehicle.
   * POST /api/v1/trips/{tripId}/gate-in
   */
  public static async gateIn(
    request: APIRequestContext,
    tripId: string,
    payload: {
      branchCode?: string;
      branch?: string;
      actor: string;
      sealNoEntered?: string;
      sealNo?: string;
      scannedManifestNos?: string[];
      manifestNo?: string;
      driverPhotoUrl?: string;
      driverVerified?: boolean;
      odoReading?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const branch = payload.branch || payload.branchCode;
    const bodyPayload = {
      branch,
      sealNoEntered: payload.sealNoEntered || payload.sealNo || null,
      scannedManifestNos: payload.scannedManifestNos || (payload.manifestNo ? [payload.manifestNo] : []),
      driverPhotoUrl: payload.driverPhotoUrl || 'http://example.com/driver.jpg',
      driverVerified: payload.driverVerified !== undefined ? payload.driverVerified : true,
      actor: payload.actor,
    };

    const url = `${this.getBaseUrl()}${this.basePath}/${tripId}/gate-in`;
    const response = await request.post(url, { data: bodyPayload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Gate Out vehicle.
   * POST /api/v1/trips/{tripId}/gate-out
   */
  public static async gateOut(
    request: APIRequestContext,
    tripId: string,
    payload: { branchCode?: string; gateBranch?: string; actor: string; sealNo?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const gateBranch = payload.gateBranch || payload.branchCode;
    const bodyPayload = {
      gateBranch,
      actor: payload.actor,
    };

    const url = `${this.getBaseUrl()}${this.basePath}/${tripId}/gate-out`;
    const response = await request.post(url, { data: bodyPayload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Assign Dock at origin or destination.
   * POST /api/v1/trips/{tripNo}/dock
   */
  public static async assignDock(
    request: APIRequestContext,
    tripNo: string,
    payload: { branchCode: string; dockNo: string; purpose: string; actor: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${tripNo}/dock`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Seal Trip.
   * POST /api/v1/trips/{tripNo}/seal
   */
  public static async sealTrip(
    request: APIRequestContext,
    tripNo: string,
    payload: { sealType: string; sealNo?: string; photoUrl: string; branch: string; actor: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${tripNo}/seal`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Mark Trip Dispatch Ready.
   * POST /api/v1/trips/{tripNo}/dispatch-ready
   */
  public static async dispatchReady(
    request: APIRequestContext,
    tripNo: string,
    payload: { commodityClass: string; checklist: Record<string, any>; actor: string; companyCode: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${tripNo}/dispatch-ready`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Complete Trip.
   * POST /api/v1/trips/{tripNo}/complete
   */
  public static async completeTrip(
    request: APIRequestContext,
    tripNo: string,
    payload: { reason?: string; actor: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${tripNo}/complete`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
