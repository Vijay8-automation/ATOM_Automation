import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class DeliveryAPI {
  public static readonly serviceKey = 'lmfm';
  public static readonly basePath = '/api/v1/lmfm';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30083');
  }

  /**
   * Record Delivery with OTP / POD evidence.
   * POST /api/v1/lmfm/deliveries
   */
  public static async recordDelivery(
    request: APIRequestContext,
    payload: {
      receivedBy: string;
      otpVerified: boolean;
      otpVerificationRef?: string;
      deliveryTripId: string;
      stopId: string;
      docketNo: string;
      podDocumentId?: string;
      deliveredAt?: string;
      deliveredBy: string;
      companyId: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/deliveries`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Record NDR (Non-Delivery Report).
   * POST /api/v1/lmfm/deliveries/ndr
   */
  public static async recordNdr(
    request: APIRequestContext,
    payload: {
      deliveryTripId: string;
      stopId: string;
      docketNo: string;
      reasonCode: string;
      remarks?: string;
      reportedBy: string;
      companyId: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/deliveries/ndr`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Record Stop Arrival.
   * POST /api/v1/lmfm/stops/{stopId}/arrive
   */
  public static async arriveAtStop(
    request: APIRequestContext,
    stopId: string,
    payload: { latitude: number; longitude: number; arrivedAt?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/stops/${stopId}/arrive`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Depart from Stop / Touchpoint.
   * POST /api/v1/lmfm/stops/{touchpointId}/depart
   */
  public static async departFromStop(
    request: APIRequestContext,
    touchpointId: string,
    params?: { companyCode?: number; actor?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams((params || {}) as any).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/stops/${touchpointId}/depart${query ? `?${query}` : ''}`;
    const response = await request.post(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Park at Stop / Touchpoint.
   * POST /api/v1/lmfm/stops/{touchpointId}/park
   */
  public static async parkAtStop(
    request: APIRequestContext,
    touchpointId: string,
    params?: { companyCode?: number; actor?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams((params || {}) as any).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/stops/${touchpointId}/park${query ? `?${query}` : ''}`;
    const response = await request.post(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get currently dwelling stops.
   * GET /api/v1/lmfm/stops/dwelling
   */
  public static async getDwellingStops(
    request: APIRequestContext,
    params?: { companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams((params || {}) as any).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/stops/dwelling${query ? `?${query}` : ''}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Acknowledge Stop Dwell time breach.
   * POST /api/v1/lmfm/stops/{touchpointId}/dwell/acknowledge
   */
  public static async acknowledgeDwell(
    request: APIRequestContext,
    touchpointId: string,
    params?: { companyCode?: number; actor?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams((params || {}) as any).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/stops/${touchpointId}/dwell/acknowledge${query ? `?${query}` : ''}`;
    const response = await request.post(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get failure reasons for a leg (e.g. LM, FM, DELIVERY, PICKUP).
   * GET /api/v1/lmfm/failure-reasons/{leg}
   */
  public static async getFailureReasons(
    request: APIRequestContext,
    leg: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/failure-reasons/${encodeURIComponent(leg)}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Request Escalation for a Docket.
   * POST /api/v1/lmfm/dockets/{docketNo}/escalation
   */
  public static async requestEscalation(
    request: APIRequestContext,
    docketNo: string,
    payload: { action: string; actor?: string },
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/escalation${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Record Delivery for a Trip Docket (Mobile execution).
   * POST /api/v1/lmfm/trips/{tripNo}/dockets/{docketNo}/delivery
   */
  public static async recordTripDocketDelivery(
    request: APIRequestContext,
    tripNo: string,
    docketNo: string,
    payload: {
      receivedBy: string;
      gpsLat: number;
      gpsLong: number;
      otpVerified?: boolean;
      otpVerificationRef?: string;
      podImagePath?: string;
      items?: any[];
      payments?: any[];
      actor?: string;
      commandUuid?: string;
    },
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${encodeURIComponent(tripNo)}/dockets/${encodeURIComponent(docketNo)}/delivery${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Record NDR for a Trip Docket (Mobile execution).
   * POST /api/v1/lmfm/trips/{tripNo}/dockets/{docketNo}/ndr
   */
  public static async recordTripDocketNdr(
    request: APIRequestContext,
    tripNo: string,
    docketNo: string,
    payload: {
      reasonCode: string;
      remark?: string;
      otpVerificationRef?: string;
      rescheduleDate?: string;
      rescheduleSlot?: string;
      actor?: string;
      commandUuid?: string;
    },
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${encodeURIComponent(tripNo)}/dockets/${encodeURIComponent(docketNo)}/ndr${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Attach Delivery Evidence.
   * POST /api/v1/lmfm/trips/{tripNo}/dockets/{docketNo}/evidence
   */
  public static async attachDeliveryEvidence(
    request: APIRequestContext,
    tripNo: string,
    docketNo: string,
    payload: any,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${encodeURIComponent(tripNo)}/dockets/${encodeURIComponent(docketNo)}/evidence${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Rewarehouse Docket after NDR / Return to Hub.
   * POST /api/v1/lmfm/trips/{tripNo}/dockets/{docketNo}/rewarehouse
   */
  public static async rewarehouseDocket(
    request: APIRequestContext,
    tripNo: string,
    docketNo: string,
    payload?: any,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${encodeURIComponent(tripNo)}/dockets/${encodeURIComponent(docketNo)}/rewarehouse${query}`;
    const response = await request.post(url, { data: payload || {}, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Update Trip GPS Positions.
   * POST /api/v1/lmfm/trips/{tripNo}/positions
   */
  public static async updateTripPositions(
    request: APIRequestContext,
    tripNo: string,
    payload: { lat: number; lng: number; speed?: number; recordedAt?: string } | any,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${encodeURIComponent(tripNo)}/positions${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
