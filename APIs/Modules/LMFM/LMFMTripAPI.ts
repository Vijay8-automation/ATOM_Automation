import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class LMFMTripAPI {
  public static readonly serviceKey = 'lmfm';
  public static readonly basePath = '/api/v1/lmfm';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30083');
  }

  /**
   * Step 1: Get eligible inventory for branch.
   * GET /api/v1/lmfm/branches/{branchCode}/eligible?companyCode={companyCode}
   */
  public static async getEligibleInventory(
    request: APIRequestContext,
    branchCode: string,
    companyCode: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/eligible?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 2: Create Delivery Trip.
   * POST /api/v1/lmfm/trips?companyCode={companyCode}
   */
  public static async createTrip(
    request: APIRequestContext,
    payload: {
      companyCode: number;
      branchCode: string;
      deliveryModel: string;
      clusterRefs: string[];
      docketNos: string[];
      vehicleNo: string;
      vehicleType?: string;
      driverCode?: number;
      driverName?: string;
      loaderCode?: number;
      docExecCode?: number;
      underutilizationReason?: string;
      createdBy: string;
      routeName?: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trips?companyCode=${payload.companyCode}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 3: Verify Docket against Trip.
   * POST /api/v1/lmfm/trips/{tripNo}/verify?companyCode={companyCode}
   */
  public static async verifyDocket(
    request: APIRequestContext,
    tripNo: string,
    payload: { docketNo: string; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/verify?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: { docketNo: payload.docketNo, actor: payload.actor },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 5: Load Box onto Trip with scan proof.
   * POST /api/v1/lmfm/trips/{tripNo}/loading/boxes?companyCode={companyCode}
   */
  public static async loadBox(
    request: APIRequestContext,
    tripNo: string,
    payload: {
      docketNo: string;
      boxId: string;
      publicScanId: string;
      actor: string;
      companyCode?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/loading/boxes?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        docketNo: payload.docketNo,
        boxId: payload.boxId,
        publicScanId: payload.publicScanId,
        actor: payload.actor,
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 6: Close Loading on Trip.
   * POST /api/v1/lmfm/trips/{tripNo}/loading/close?companyCode={companyCode}
   */
  public static async closeLoading(
    request: APIRequestContext,
    tripNo: string,
    payload: { actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/loading/close?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: { actor: payload.actor },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 7: Confirm Stop Plan.
   * POST /api/v1/lmfm/trips/{tripNo}/stops/confirm?companyCode={companyCode}
   */
  public static async confirmStops(
    request: APIRequestContext,
    tripNo: string,
    payload: { actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/stops/confirm?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: { actor: payload.actor },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 8: Mark Trip Ready for Dispatch.
   * POST /api/v1/lmfm/trips/{tripNo}/ready?companyCode={companyCode}
   */
  public static async markReady(
    request: APIRequestContext,
    tripNo: string,
    payload: { actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/ready?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: { actor: payload.actor },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 9: Gate-Out Delivery Trip.
   * POST /api/v1/lmfm/trips/{tripNo}/gate-out?companyCode={companyCode}
   */
  public static async gateOut(
    request: APIRequestContext,
    tripNo: string,
    payload: { actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/gate-out?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: { actor: payload.actor },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 10: Record Doorstep Delivery with POD evidence.
   * POST /api/v1/lmfm/trips/{tripNo}/dockets/{docketNo}/delivery?companyCode={companyCode}
   */
  public static async recordDelivery(
    request: APIRequestContext,
    tripNo: string,
    docketNo: string,
    payload: {
      receivedBy: string;
      otpVerified?: boolean;
      otpVerificationRef?: string | null;
      podImagePath?: string;
      gpsLat: number;
      gpsLong: number;
      items?: Array<{ boxCode: string; partNo?: string; deliveredQty: number }>;
      payments?: Array<{ mode: string; amount: number; reference?: string }>;
      actor: string;
      companyCode?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/dockets/${docketNo}/delivery?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        receivedBy: payload.receivedBy,
        otpVerified: payload.otpVerified ?? false,
        otpVerificationRef: payload.otpVerificationRef ?? null,
        podImagePath: payload.podImagePath || '/uploads/pod/delivery_pod.jpg',
        gpsLat: payload.gpsLat,
        gpsLong: payload.gpsLong,
        items: payload.items || [],
        payments: payload.payments || [],
        actor: payload.actor,
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 11: Close Trip & Reconcile.
   * POST /api/v1/lmfm/trips/{tripNo}/close?companyCode={companyCode}
   */
  public static async closeTrip(
    request: APIRequestContext,
    tripNo: string,
    payload: { actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/close?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: { actor: payload.actor },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Cancel Delivery Trip (if needed).
   * POST /api/v1/lmfm/trips/{tripNo}/cancel?companyCode={companyCode}
   */
  public static async cancelTrip(
    request: APIRequestContext,
    tripNo: string,
    payload: { reason: string; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/cancel?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: { reason: payload.reason, actor: payload.actor },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
