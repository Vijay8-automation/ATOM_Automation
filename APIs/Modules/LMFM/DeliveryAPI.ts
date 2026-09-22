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
}
