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

  /**
   * Create a new Docket and wait briefly for MM movable docket projection.
   */
  public static async createMovableDocket(
    request: APIRequestContext,
    params: {
      companyCode?: number;
      companyId: string;
      bookingBranch: string;
      sourceBranch: string;
      destinationBranch: string;
      customerCode: string;
      billingPartyCode: string;
      consignorCode: string;
      pickupPincode: string;
      deliveryPincode: string;
      consignorPincode: string;
      consignorGstin: string;
      consigneeCode: string;
      consigneeGstin: string;
      ewayBillNo: number;
      invoiceDate: string;
      actor?: string;
    }
  ): Promise<{ docketNo: string; response: APIResponse; body: any; status: number }> {
    const timeSuffix = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
    const payload = {
      companyCode: params.companyCode ?? 1,
      companyId: params.companyId,
      bookingBranch: params.bookingBranch,
      billingPartyCode: params.billingPartyCode,
      customerCode: params.customerCode,
      customerType: 'BUSINESS',
      sourceBranch: params.sourceBranch,
      destinationBranch: params.destinationBranch,
      deliveryAddressId: 1,
      pickupLocationId: 1,
      pickupPincode: params.pickupPincode,
      deliveryPincode: params.deliveryPincode,
      consignorPincode: params.consignorPincode,
      transportMode: 'ROAD',
      loadType: 'PTL',
      freightMode: 'CREDIT',
      docketSource: 'WEB',
      createdBy: params.actor ?? '0195f442-0575-7850-85c7-e89d130f9f94',
      isReturn: false,
      originalDocketNo: '',
      invoices: [
        {
          invoiceNo: `INV-MM-${timeSuffix}`,
          invoiceDate: params.invoiceDate,
          grossValue: 10000,
          netValue: 9500,
          poNumber: `PO-MM-${timeSuffix}`,
          goodsDescription: 'MM Plan Validation Cargo',
          ewayBillNo: params.ewayBillNo,
          consignorCode: params.consignorCode,
          consignorGstin: params.consignorGstin,
          consigneeCode: params.consigneeCode,
          consigneeGstin: params.consigneeGstin,
          boxes: [{ boxCount: 1, type: 'CARTON', quantity: 1, length: 30, width: 20, height: 15, unit: 'CM', actualWeight: 10.0 }],
        },
      ],
      attachments: [],
    };
    const res = await this.createDocket(request, payload);
    const docketNo = res.body?.data?.docketNo || '';
    await new Promise((r) => setTimeout(r, 1200));
    return { docketNo, ...res };
  }
}

