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
    token?: string,
    params?: { q?: string; page?: number; size?: number }
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const searchParams = new URLSearchParams();
    searchParams.set('companyCode', String(companyCode));
    searchParams.set('size', String(params?.size ?? 100));
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.q !== undefined) searchParams.set('q', String(params.q));

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/eligible?${searchParams.toString()}`;
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
    token?: string,
    customHeaders?: Record<string, string>
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = { ...BaseAPI.getDefaultGatewayHeaders(authToken), ...(customHeaders || {}) };

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
   * Step 1b: Register Docket Arrival in Branch Inventory (Fallback / Direct Arrival).
   * POST /api/v1/lmfm/arrivals?companyCode={companyCode}
   */
  public static async registerArrival(
    request: APIRequestContext,
    payload: {
      companyCode: number;
      branchCode: string;
      docketNo: string;
      customerCode?: string;
      deliveryAddress?: string;
      totalBoxes?: number;
      totalWeight?: number;
      appointmentDate?: string | null;
      appointmentSlot?: string | null;
      actor?: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/arrivals?companyCode=${payload.companyCode}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Step 7b: Pouch Docket Document on Trip before Ready for Dispatch.
   * POST /api/v1/lmfm/trips/{tripNo}/documents/pouch?companyCode={companyCode}
   */
  public static async pouchDocument(
    request: APIRequestContext,
    tripNo: string,
    payload: { docketNo: string; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/documents/pouch?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: { docketNo: payload.docketNo, actor: payload.actor },
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

  // =========================================================================
  // FIGMA EXTENSIONS: TRIP LISTING & OPERATIONAL DASHBOARD
  // =========================================================================

  /**
   * List Trips with optional filters.
   * GET /api/v1/lmfm/trips
   */
  public static async listTrips(
    request: APIRequestContext,
    params?: {
      companyCode?: number;
      branchCode?: string;
      status?: string;
      tripType?: string;
      date?: string;
      page?: number;
      size?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const queryParams = { companyCode: 400021, ...(params || {}) };
    const query = `?${new URLSearchParams(queryParams as any).toString()}`;
    const url = `${this.getBaseUrl()}${this.basePath}/trips${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Trip Counts for Dashboard KPI Cards / Status Badges.
   * GET /api/v1/lmfm/trips/counts
   */
  public static async getTripCounts(
    request: APIRequestContext,
    params: number | { companyCode?: number; branch?: string } = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    let query = '';
    if (typeof params === 'number') {
      query = `?companyCode=${params}`;
    } else {
      const qp = { companyCode: 400021, ...params };
      query = `?${new URLSearchParams(qp as any).toString()}`;
    }

    const url = `${this.getBaseUrl()}${this.basePath}/trips/counts${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Trips Requiring Attention (Alerts Card).
   * GET /api/v1/lmfm/trips/attention
   */
  public static async getTripsAttention(
    request: APIRequestContext,
    params: number | { companyCode?: number; branch?: string } = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    let query = '';
    if (typeof params === 'number') {
      query = `?companyCode=${params}`;
    } else {
      const qp = { companyCode: 400021, ...params };
      query = `?${new URLSearchParams(qp as any).toString()}`;
    }

    const url = `${this.getBaseUrl()}${this.basePath}/trips/attention${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Trip Detail by tripNo.
   * GET /api/v1/lmfm/trips/{tripNo}
   */
  public static async getTripDetail(
    request: APIRequestContext,
    tripNo: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Trip Stops Timeline.
   * GET /api/v1/lmfm/trips/{tripNo}/stops
   */
  public static async getTripStops(
    request: APIRequestContext,
    tripNo: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/stops?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  // =========================================================================
  // FIGMA EXTENSIONS: STEP 1 - TRIP PLANNING & INVENTORY SELECTION
  // =========================================================================

  /**
   * Get Planning Clusters for Branch.
   * GET /api/v1/lmfm/branches/{branchCode}/planning/clusters
   */
  public static async getPlanningClusters(
    request: APIRequestContext,
    branchCode: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/planning/clusters?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Dynamically discover and resolve an active cluster zoneId for a branch.
   * If clusters exist, returns the first active zoneId; otherwise falls back to fallbackZoneId.
   */
  public static async resolveActiveClusterId(
    request: APIRequestContext,
    branchCode: string,
    companyCode: number = 400021,
    fallbackZoneId: number | null = null,
    token?: string
  ): Promise<number | null> {
    try {
      const res = await this.getPlanningClusters(request, branchCode, companyCode, token);
      const clusters = res.body?.data?.clusters || (Array.isArray(res.body?.data) ? res.body.data : []);
      if (Array.isArray(clusters) && clusters.length > 0 && clusters[0].zoneId) {
        return Number(clusters[0].zoneId);
      }
    } catch {
      // Fallback on error
    }
    return fallbackZoneId;
  }

  /**
   * Dynamically discover and resolve an active cluster ref/code for a branch.
   * If clusters exist, returns the first active clusterCode; otherwise falls back to fallbackRef.
   */
  public static async resolveActiveClusterRef(
    request: APIRequestContext,
    branchCode: string,
    companyCode: number = 400021,
    fallbackRef: string = 'CLUSTER-400604',
    token?: string
  ): Promise<string> {
    try {
      const res = await this.getPlanningClusters(request, branchCode, companyCode, token);
      const clusters = res.body?.data?.clusters || (Array.isArray(res.body?.data) ? res.body.data : []);
      if (Array.isArray(clusters) && clusters.length > 0) {
        return String(clusters[0].clusterCode || clusters[0].clusterRef || fallbackRef);
      }
    } catch {
      // Fallback on error
    }
    return fallbackRef;
  }

  /**
   * Get Dockets for a specific cluster zone.
   * GET /api/v1/lmfm/branches/{branchCode}/planning/clusters/{zoneId}/dockets
   */
  public static async getClusterDockets(
    request: APIRequestContext,
    branchCode: string,
    zoneId: string | number,
    companyCode: number = 400021,
    token?: string,
    params?: { addressId?: string | number; page?: number; size?: number }
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const searchParams = new URLSearchParams();
    searchParams.set('companyCode', String(companyCode));
    if (params?.addressId !== undefined) searchParams.set('addressId', String(params.addressId));
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.size !== undefined) searchParams.set('size', String(params.size));

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/planning/clusters/${zoneId}/dockets?${searchParams.toString()}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Pickup Requests for a specific cluster zone.
   * GET /api/v1/lmfm/branches/{branchCode}/planning/clusters/{zoneId}/pickup-requests
   */
  public static async getClusterPickupRequests(
    request: APIRequestContext,
    branchCode: string,
    zoneId: string | number,
    companyCode: number = 400021,
    token?: string,
    params?: { addressId?: string | number }
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const searchParams = new URLSearchParams();
    searchParams.set('companyCode', String(companyCode));
    if (params?.addressId !== undefined) searchParams.set('addressId', String(params.addressId));

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/planning/clusters/${zoneId}/pickup-requests?${searchParams.toString()}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Stop-Level Grouped Addresses for a specific cluster zone (V2 Stop-Level Grouping).
   * GET /api/v1/lmfm/branches/{branchCode}/planning/clusters/{zoneId}/addresses
   */
  public static async getClusterAddresses(
    request: APIRequestContext,
    branchCode: string,
    zoneId: string | number,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/planning/clusters/${zoneId}/addresses?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Add selected Dockets to Trip Draft.
   * POST /api/v1/lmfm/trip-drafts/{draftId}/dockets
   */
  public static async addDocketsToDraft(
    request: APIRequestContext,
    draftId: string,
    payload: { docketNos: string[]; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/dockets?companyCode=${companyCode}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Add selected Pickup Requests to Trip Draft.
   * POST /api/v1/lmfm/trip-drafts/{draftId}/pickup-requests
   */
  public static async addPickupsToDraft(
    request: APIRequestContext,
    draftId: string,
    payload: { prqNos: string[]; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/pickup-requests?companyCode=${companyCode}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  // =========================================================================
  // FIGMA EXTENSIONS: STEP 2 - TRIP CONFIGURATION (VEHICLE, FE, DOCK, UTILIZATION)
  // =========================================================================

  /**
   * Get available vehicle options & recommendations for Trip Draft.
   * GET /api/v1/lmfm/trip-drafts/{draftId}/options/vehicles
   */
  public static async getDraftVehicles(
    request: APIRequestContext,
    draftId: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/options/vehicles?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get available Field Executives for Trip Draft.
   * GET /api/v1/lmfm/trip-drafts/{draftId}/options/field-executives
   */
  public static async getDraftFieldExecutives(
    request: APIRequestContext,
    draftId: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/options/field-executives?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get available Loaders for Trip Draft.
   * GET /api/v1/lmfm/trip-drafts/{draftId}/options/loaders
   */
  public static async getDraftLoaders(
    request: APIRequestContext,
    draftId: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/options/loaders?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get available Docks for Trip Draft.
   * GET /api/v1/lmfm/trip-drafts/{draftId}/options/docks
   */
  public static async getDraftDocks(
    request: APIRequestContext,
    draftId: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/options/docks?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Draft Readiness and Capacity vs Load metrics.
   * GET /api/v1/lmfm/trip-drafts/{draftId}/readiness
   */
  public static async getDraftReadiness(
    request: APIRequestContext,
    draftId: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/readiness?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Configure Trip Draft with vehicle, FE, loader, dock.
   * PUT /api/v1/lmfm/trip-drafts/{draftId}/configuration
   */
  public static async configureTripDraft(
    request: APIRequestContext,
    draftId: string,
    payload: {
      vehicleNo: string;
      driverCode?: number;
      driverName?: string;
      loaderCode?: number;
      dockNo?: string;
      actor: string;
      companyCode?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/configuration?companyCode=${companyCode}`;
    const response = await request.put(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  // =========================================================================
  // FIGMA EXTENSIONS: HUB RETURN, GATE-IN, AND CLOSURE RECONCILIATION
  // =========================================================================

  /**
   * Gate-In Delivery Trip at Hub.
   * POST /api/v1/lmfm/trips/{tripNo}/gate-in
   */
  public static async gateIn(
    request: APIRequestContext,
    tripNo: string,
    payload: { actor: string; companyCode?: number; remarks?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/gate-in?companyCode=${companyCode}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Unload Box at Hub (Undelivered NDR or Picked consignment).
   * POST /api/v1/lmfm/trips/{tripNo}/unloading/boxes
   */
  public static async unloadBox(
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
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/unloading/boxes?companyCode=${companyCode}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Trip Closure Details.
   * GET /api/v1/lmfm/trips/{tripNo}/closure
   */
  public static async getTripClosure(
    request: APIRequestContext,
    tripNo: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/closure?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Approve Trip Reconciliation.
   * POST /api/v1/lmfm/trips/{tripNo}/reconciliation/approve
   */
  public static async approveReconciliation(
    request: APIRequestContext,
    tripNo: string,
    payload: { actor: string; remarks?: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/reconciliation/approve?companyCode=${companyCode}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  // =========================================================================
  // OMONE PROJECT_LM EXTENSIONS: BUCKETS, APPOINTMENTS, HOLDS & TRIP DRAFTS
  // =========================================================================

  /**
   * Get Non-Eligible Inventory for Branch (Future Appointment, Hold, Regular Restriction, etc.).
   * GET /api/v1/lmfm/branches/{branchCode}/non-eligible?companyCode={companyCode}&size=100
   */
  public static async getNonEligibleInventory(
    request: APIRequestContext,
    branchCode: string,
    companyCode: number = 400021,
    token?: string,
    params?: { q?: string; page?: number; size?: number }
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const searchParams = new URLSearchParams();
    searchParams.set('companyCode', String(companyCode));
    searchParams.set('size', String(params?.size ?? 100));
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.q !== undefined) searchParams.set('q', String(params.q));

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/non-eligible?${searchParams.toString()}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Place Docket on Hold / Customer Request in Branch Inventory.
   * POST /api/v1/lmfm/dockets/{docketNo}/hold?companyCode={companyCode}
   */
  public static async holdDocket(
    request: APIRequestContext,
    docketNo: string,
    payload: { bucketType: string; reason: string; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/hold?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        bucketType: payload.bucketType,
        reason: payload.reason,
        actor: payload.actor,
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Release Docket Hold (Supervisor Override -> Moves back to Eligible Bucket).
   * POST /api/v1/lmfm/dockets/{docketNo}/hold/release?companyCode={companyCode}&actor={actor}
   */
  public static async releaseHold(
    request: APIRequestContext,
    docketNo: string,
    payload: { actor: string; companyCode?: number },
    token?: string,
    customHeaders?: Record<string, string>
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = { ...BaseAPI.getDefaultGatewayHeaders(authToken), ...(customHeaders || {}) };

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/hold/release?companyCode=${companyCode}&actor=${encodeURIComponent(payload.actor)}`;
    const response = await request.post(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Clear Docket Restriction (Supervisor Override).
   * POST /api/v1/lmfm/dockets/{docketNo}/restriction/clear?companyCode={companyCode}&actor={actor}
   */
  public static async clearRestriction(
    request: APIRequestContext,
    docketNo: string,
    payload: { actor: string; companyCode?: number },
    token?: string,
    customHeaders?: Record<string, string>
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = { ...BaseAPI.getDefaultGatewayHeaders(authToken), ...(customHeaders || {}) };

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/restriction/clear?companyCode=${companyCode}&actor=${encodeURIComponent(payload.actor)}`;
    const response = await request.post(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Set / Reschedule Docket Appointment Date & Slot.
   * POST /api/v1/lmfm/dockets/{docketNo}/appointment?companyCode={companyCode}
   */
  public static async setAppointment(
    request: APIRequestContext,
    docketNo: string,
    payload: { date: string; slot?: string; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/appointment?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        date: payload.date,
        slot: payload.slot || '10:00-12:00',
        actor: payload.actor,
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Confirm Docket Appointment (Moves Today's Appointment Docket to Eligible Bucket).
   * POST /api/v1/lmfm/dockets/{docketNo}/appointment/confirm?companyCode={companyCode}
   */
  public static async confirmAppointment(
    request: APIRequestContext,
    docketNo: string,
    payload: { source: string; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/appointment/confirm?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        source: payload.source,
        actor: payload.actor,
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Start a new Trip Draft for a Branch & Cluster Zone.
   * POST /api/v1/lmfm/trip-drafts?companyCode={companyCode}
   */
  public static async startTripDraft(
    request: APIRequestContext,
    payload: {
      companyCode: number;
      branchCode: string;
      zoneId: number;
      assigneeType: string;
      baCode?: number;
      createdBy: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts?companyCode=${payload.companyCode}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Trip Draft details by draftId.
   * GET /api/v1/lmfm/trip-drafts/{draftId}?companyCode={companyCode}
   */
  public static async getTripDraft(
    request: APIRequestContext,
    draftId: string | number,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * List Open Trip Drafts for a Branch.
   * GET /api/v1/lmfm/branches/{branchCode}/trip-drafts?companyCode={companyCode}
   */
  public static async getOpenTripDrafts(
    request: APIRequestContext,
    branchCode: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/trip-drafts?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Remove a Docket from a Trip Draft.
   * DELETE /api/v1/lmfm/trip-drafts/{draftId}/dockets/{docketNo}?companyCode={companyCode}
   */
  public static async removeDocketFromDraft(
    request: APIRequestContext,
    draftId: string | number,
    docketNo: string,
    payload: { reasonCode: string; remarks?: string; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/dockets/${encodeURIComponent(docketNo)}?companyCode=${companyCode}`;
    const response = await request.delete(url, {
      data: {
        reasonCode: payload.reasonCode,
        remarks: payload.remarks || 'Removed by operator',
        actor: payload.actor,
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Remove a Pickup Request (PRQ) from a Trip Draft.
   * DELETE /api/v1/lmfm/trip-drafts/{draftId}/pickup-requests/{prqNo}?companyCode={companyCode}
   */
  public static async removePickupFromDraft(
    request: APIRequestContext,
    draftId: string | number,
    prqNo: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/pickup-requests/${encodeURIComponent(prqNo)}?companyCode=${companyCode}`;
    const response = await request.delete(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Discard a Trip Draft (Releases all held Dockets, PRQs, Vehicles, and Docks).
   * DELETE /api/v1/lmfm/trip-drafts/{draftId}?companyCode={companyCode}
   */
  public static async discardTripDraft(
    request: APIRequestContext,
    draftId: string | number,
    payload: { actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}?companyCode=${companyCode}`;
    const response = await request.delete(url, {
      data: { actor: payload.actor },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Create Delivery Trip from Trip Draft.
   * POST /api/v1/lmfm/trip-drafts/{draftId}/trip?companyCode={companyCode}
   */
  public static async createTripFromDraft(
    request: APIRequestContext,
    draftId: string | number,
    payload: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trip-drafts/${draftId}/trip?companyCode=${companyCode}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Request Docket Operational Escalation (e.g., RTO / ESCALATE / DEMURRAGE).
   * POST /api/v1/lmfm/dockets/{docketNo}/escalation?companyCode={companyCode}
   */
  public static async requestDocketEscalation(
    request: APIRequestContext,
    docketNo: string,
    payload: { action: string; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/escalation?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: { action: payload.action, actor: payload.actor },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Park Docket into KOM Review Bucket (RTO / Escalation / Demurrage).
   * POST /api/v1/lmfm/dockets/{docketNo}/kom/park?companyCode={companyCode}
   */
  public static async parkDocketInKom(
    request: APIRequestContext,
    docketNo: string,
    payload: { bucketType: string; reason: string; actor: string; companyCode?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/kom/park?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        bucketType: payload.bucketType,
        reason: payload.reason,
        actor: payload.actor,
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Resolve / Approve Docket in KOM Review Queue.
   * POST /api/v1/lmfm/dockets/{docketNo}/kom/resolve?companyCode={companyCode}
   */
  public static async resolveDocketKom(
    request: APIRequestContext,
    docketNo: string,
    payload: { approver: string; remarks?: string; companyCode?: number },
    token?: string,
    customHeaders?: Record<string, string>
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = { ...BaseAPI.getDefaultGatewayHeaders(authToken), ...(customHeaders || {}) };

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/kom/resolve?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        approver: payload.approver,
        remarks: payload.remarks || 'Approved by KOM Supervisor',
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Reject Docket in KOM Review Queue.
   * POST /api/v1/lmfm/dockets/{docketNo}/kom/reject?companyCode={companyCode}
   */
  public static async rejectDocketKom(
    request: APIRequestContext,
    docketNo: string,
    payload: { approver: string; remarks?: string; companyCode?: number },
    token?: string,
    customHeaders?: Record<string, string>
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = { ...BaseAPI.getDefaultGatewayHeaders(authToken), ...(customHeaders || {}) };

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/dockets/${encodeURIComponent(docketNo)}/kom/reject?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        approver: payload.approver,
        remarks: payload.remarks || 'Rejected by KOM Supervisor',
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get KOM Review Queue for a Branch.
   * GET /api/v1/lmfm/branches/{branchCode}/kom-queue
   */
  public static async getKomQueue(
    request: APIRequestContext,
    branchCode: string,
    companyCode: number = 400021,
    params?: { q?: string; page?: number; size?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const searchParams = new URLSearchParams();
    searchParams.set('companyCode', String(companyCode));
    searchParams.set('size', String(params?.size ?? 100));
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.q !== undefined) searchParams.set('q', String(params.q));

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/kom-queue?${searchParams.toString()}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Missed Appointments for a Branch.
   * GET /api/v1/lmfm/branches/{branchCode}/missed-appointments
   */
  public static async getMissedAppointments(
    request: APIRequestContext,
    branchCode: string,
    companyCode: number = 400021,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/missed-appointments?companyCode=${companyCode}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Branch Inventory Aging Summary.
   * GET /api/v1/lmfm/branches/{branchCode}/aging
   */
  public static async getBranchAging(
    request: APIRequestContext,
    branchCode: string,
    companyCode: number = 400021,
    days?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const searchParams = new URLSearchParams();
    searchParams.set('companyCode', String(companyCode));
    if (days !== undefined) searchParams.set('days', String(days));

    const url = `${this.getBaseUrl()}${this.basePath}/branches/${branchCode}/aging?${searchParams.toString()}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Record Non-Delivery Report (NDR) for a Docket on an Active Trip.
   * POST /api/v1/lmfm/trips/{tripNo}/dockets/{docketNo}/ndr
   */
  public static async recordNdr(
    request: APIRequestContext,
    tripNo: string,
    docketNo: string,
    payload: {
      reasonCode: string;
      remark?: string;
      otpVerificationRef?: string;
      rescheduleDate?: string;
      rescheduleSlot?: string;
      actor: string;
      commandUuid?: string;
      companyCode?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/dockets/${encodeURIComponent(docketNo)}/ndr?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        reasonCode: payload.reasonCode,
        remark: payload.remark || 'Consignee unavailable during attempt',
        otpVerificationRef: payload.otpVerificationRef,
        rescheduleDate: payload.rescheduleDate,
        rescheduleSlot: payload.rescheduleSlot,
        actor: payload.actor,
        commandUuid: payload.commandUuid,
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Rewarehouse an NDR Docket back at Hub.
   * POST /api/v1/lmfm/trips/{tripNo}/dockets/{docketNo}/rewarehouse
   */
  public static async rewarehouseDocket(
    request: APIRequestContext,
    tripNo: string,
    docketNo: string,
    payload: {
      chargeabilityType: string;
      waiverApprover?: string;
      actor: string;
      companyCode?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const companyCode = payload.companyCode || 400021;
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/dockets/${encodeURIComponent(docketNo)}/rewarehouse?companyCode=${companyCode}`;
    const response = await request.post(url, {
      data: {
        chargeabilityType: payload.chargeabilityType,
        waiverApprover: payload.waiverApprover,
        actor: payload.actor,
      },
      headers,
    });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
