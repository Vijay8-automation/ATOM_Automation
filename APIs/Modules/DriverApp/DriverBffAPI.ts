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

  public static getLmfmBaseUrl(): string {
    return BaseAPI.getServiceUrl('lmfm', 'http://10.10.130.123:30083');
  }

  // ==========================================
  // Driver Runsheets & Execution (LMFM)
  // ==========================================

  /**
   * Get Delivery Runsheet for Trip.
   * GET /api/v1/lmfm/trips/{tripNo}/runsheet
   */
  public static async getDeliveryRunsheet(
    request: APIRequestContext,
    tripNo: string,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/trips/${encodeURIComponent(tripNo)}/runsheet${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Pickup Runsheet for Trip.
   * GET /api/v1/lmfm/trips/{tripNo}/pickup-runsheet
   */
  public static async getPickupRunsheet(
    request: APIRequestContext,
    tripNo: string,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/trips/${encodeURIComponent(tripNo)}/pickup-runsheet${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Boxes for a Trip Docket (Mobile Box Scan screen).
   * GET /api/v1/lmfm/trips/{tripNo}/dockets/{docketNo}/boxes
   */
  public static async getDocketBoxes(
    request: APIRequestContext,
    tripNo: string,
    docketNo: string,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/trips/${encodeURIComponent(tripNo)}/dockets/${encodeURIComponent(docketNo)}/boxes${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Driver Active Runs (My Trips).
   * GET /api/v1/lmfm/drivers/{driverCode}/runs
   */
  public static async getDriverActiveRuns(
    request: APIRequestContext,
    driverCode: number | string,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/drivers/${encodeURIComponent(driverCode)}/runs${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Driver Profile.
   * GET /api/v1/lmfm/drivers/{driverCode}/profile
   */
  public static async getDriverProfile(
    request: APIRequestContext,
    driverCode: number | string,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/drivers/${encodeURIComponent(driverCode)}/profile${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  // ==========================================
  // Driver App BFF Commands & Uploads
  // ==========================================

  /**
   * Get commands for a device.
   * GET /api/v1/driverapp/devices/{deviceId}/commands
   */
  public static async getDeviceCommands(
    request: APIRequestContext,
    deviceId: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/devices/${encodeURIComponent(deviceId)}/commands`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get commands list.
   * GET /api/v1/driverapp/commands
   */
  public static async getCommands(
    request: APIRequestContext,
    params?: any,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = params ? new URLSearchParams(params as any).toString() : '';
    const url = `${this.getBaseUrl()}${this.basePath}/commands${query ? `?${query}` : ''}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get commands count.
   * GET /api/v1/driverapp/commands/counts
   */
  public static async getCommandCounts(
    request: APIRequestContext,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/commands/counts`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Acknowledge Command execution.
   * POST /api/v1/driverapp/commands/{commandUuid}/acknowledge
   */
  public static async acknowledgeCommand(
    request: APIRequestContext,
    commandUuid: string,
    payload?: any,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/commands/${encodeURIComponent(commandUuid)}/acknowledge`;
    const response = await request.post(url, { data: payload || {}, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Request Presigned Upload (POD/NPR photo/cheque).
   * POST /api/v1/driverapp/uploads
   */
  public static async requestUpload(
    request: APIRequestContext,
    payload: {
      fileName: string;
      contentType: string;
      fileSizeBytes?: number;
      category?: string;
      entityRef?: string;
    } | any,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/uploads`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Confirm Upload Complete.
   * POST /api/v1/driverapp/uploads/{uploadId}/uploaded
   */
  public static async confirmUploaded(
    request: APIRequestContext,
    uploadId: string,
    payload?: any,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/uploads/${encodeURIComponent(uploadId)}/uploaded`;
    const response = await request.post(url, { data: payload || {}, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Acknowledge Upload Owner.
   * POST /api/v1/driverapp/uploads/{uploadId}/owner-ack
   */
  public static async acknowledgeOwner(
    request: APIRequestContext,
    uploadId: string,
    payload?: any,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/uploads/${encodeURIComponent(uploadId)}/owner-ack`;
    const response = await request.post(url, { data: payload || {}, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Update Cursor for sync stream.
   * POST /api/v1/driverapp/cursors
   */
  public static async updateCursor(
    request: APIRequestContext,
    payload: any,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/cursors`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
