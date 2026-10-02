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
    params?: {
      companyCode?: number;
      destinationBranch?: string;
      agingDays?: number;
      mode?: string;
      loadType?: string;
      page?: number;
      size?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const queryParams: Record<string, string> = {};
    if (params?.companyCode !== undefined) queryParams.companyCode = String(params.companyCode);
    if (params?.destinationBranch !== undefined) queryParams.destinationBranch = String(params.destinationBranch);
    if (params?.agingDays !== undefined) queryParams.agingDays = String(params.agingDays);
    if (params?.mode !== undefined) queryParams.mode = String(params.mode);
    if (params?.loadType !== undefined) queryParams.loadType = String(params.loadType);
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.size !== undefined) queryParams.size = String(params.size);

    const query = new URLSearchParams(queryParams).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/branches/${branchCode}/movable-dockets${query ? `?${query}` : ''}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Load Dashboard Detailed CN Info.
   * GET /api/v1/mm/load-dashboard/detailed-cn-info
   */
  public static async getLoadDashboardDetailedCnInfo(
    request: APIRequestContext,
    params: {
      companyCode: number;
      branchCode: string;
      destinationBranch?: string;
      minAgeHours?: number;
      page?: number;
      size?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const queryParams: Record<string, string> = {
      companyCode: String(params.companyCode),
      branch: String(params.branchCode),
    };
    if (params.destinationBranch !== undefined) queryParams.destinationBranch = String(params.destinationBranch);
    if (params.minAgeHours !== undefined) queryParams.minAgeHours = String(params.minAgeHours);
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.size !== undefined) queryParams.size = String(params.size);

    const query = new URLSearchParams(queryParams).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/load-dashboard/detailed-cn-info?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Trip Suggestions for Branch.
   * GET /api/v1/mm/branches/{branchCode}/trip-suggestions
   */
  public static async getTripSuggestions(
    request: APIRequestContext,
    branchCode: string,
    params: { companyCode: number; routeType: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams({
      companyCode: String(params.companyCode),
      routeType: String(params.routeType),
    }).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/branches/${branchCode}/trip-suggestions?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Trip Suggestion Detail for Branch & Route.
   * GET /api/v1/mm/branches/{branchCode}/trip-suggestions/{routeCode}
   */
  public static async getTripSuggestionDetail(
    request: APIRequestContext,
    branchCode: string,
    routeCode: string,
    params: { companyCode: number; routeType?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const qp: Record<string, string> = { companyCode: String(params.companyCode) };
    if (params.routeType !== undefined) qp.routeType = String(params.routeType);
    const query = new URLSearchParams(qp).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/branches/${branchCode}/trip-suggestions/${routeCode}?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Finalize Trip Plan for Branch & Route.
   * POST /api/v1/mm/branches/{branchCode}/trip-suggestions/{routeCode}/finalize-plan
   */
  public static async finalizeTripPlan(
    request: APIRequestContext,
    branchCode: string,
    routeCode: string,
    payload: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const bodyPayload = {
      idempotencyKey: payload.idempotencyKey ?? `IDEMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      ...payload,
    };
    const routeTypeParam = payload.routeType ? `?routeType=${encodeURIComponent(String(payload.routeType))}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}/mm/branches/${branchCode}/trip-suggestions/${routeCode}/finalize-plan${routeTypeParam}`;
    const response = await request.post(url, { data: bodyPayload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Vehicle Recommendations.
   * GET /api/v1/mm/vehicle-recommendations
   */
  public static async getVehicleRecommendations(
    request: APIRequestContext,
    params: {
      companyCode: number;
      branchCode: string;
      routeCode?: string;
      routeStrictness?: string;
      requiredCapacityKg?: number;
      rankedBy?: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const queryParams: Record<string, string> = {
      companyCode: String(params.companyCode),
      branchCode: String(params.branchCode),
    };
    if (params.routeCode !== undefined) queryParams.routeCode = String(params.routeCode);
    if (params.routeStrictness !== undefined) queryParams.routeStrictness = String(params.routeStrictness);
    if (params.requiredCapacityKg !== undefined) queryParams.requiredCapacityKg = String(params.requiredCapacityKg);
    if (params.rankedBy !== undefined) queryParams.rankedBy = String(params.rankedBy);

    const query = new URLSearchParams(queryParams).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/vehicle-recommendations?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Record Vehicle Recommendation Decision / Override Audit.
   * POST /api/v1/mm/vehicle-recommendations/decisions
   */
  public static async recordVehicleRecommendationDecision(
    request: APIRequestContext,
    payload: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/mm/vehicle-recommendations/decisions`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Record Engine Trip Plan.
   * POST /api/v1/trip-plans
   */
  public static async recordEngineTripPlan(
    request: APIRequestContext,
    payload: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-plans`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Accept Engine Trip Plan Candidate.
   * POST /api/v1/trip-plans/{planNo}/accept
   */
  public static async acceptEngineTripPlan(
    request: APIRequestContext,
    planNo: string,
    payload: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-plans/${planNo}/accept`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Cancel Engine Trip Plan.
   * POST /api/v1/trip-plans/{planNo}/cancel
   */
  public static async cancelEngineTripPlan(
    request: APIRequestContext,
    planNo: string,
    payload: { actor: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trip-plans/${planNo}/cancel`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Movable Dockets at Intermediate Touch-Point.
   * GET /api/v1/trips/{tripNo}/touch-points/{branchCode}/movable-dockets
   */
  public static async getTouchPointMovableDockets(
    request: APIRequestContext,
    tripNo: string,
    branchCode: string,
    params: { companyCode: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams({ companyCode: String(params.companyCode) }).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/touch-points/${branchCode}/movable-dockets?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Create or Update Touch-Point Manifests (with Idempotency Key & Re-use support).
   * POST /api/v1/trips/{tripNo}/touch-points/{branchCode}/manifests
   */
  public static async upsertTouchPointManifests(
    request: APIRequestContext,
    tripNo: string,
    branchCode: string,
    payload: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/touch-points/${branchCode}/manifests`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Load Dashboard Branch Route-Wise Inventory (CURRENT / UPCOMING / UNLOADING).
   * GET /api/v1/mm/load-dashboard/branch-route-wise-inventory
   */
  public static async getBranchRouteWiseInventory(
    request: APIRequestContext,
    params: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const qp: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qp[k] = String(v);
    }
    const query = new URLSearchParams(qp).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/load-dashboard/branch-route-wise-inventory?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Load Dashboard Route-Type Counts (EXPRESS / SERVICE / FEEDER).
   * GET /api/v1/mm/load-dashboard/route-type-counts
   */
  public static async getRouteTypeCounts(
    request: APIRequestContext,
    params: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const qp: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qp[k] = String(v);
    }
    const query = new URLSearchParams(qp).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/load-dashboard/route-type-counts?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Yard Dock Management — Paginated Docks List.
   * GET /api/v1/mm/yard/dock-management/docks
   */
  public static async getYardDockManagementDocks(
    request: APIRequestContext,
    params: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const qp: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qp[k] = String(v);
    }
    const query = new URLSearchParams(qp).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/yard/dock-management/docks?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Yard Dock Management — Waiting Queue.
   * GET /api/v1/mm/yard/dock-management/queue
   */
  public static async getYardDockManagementQueue(
    request: APIRequestContext,
    params: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const qp: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qp[k] = String(v);
    }
    const query = new URLSearchParams(qp).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/yard/dock-management/queue?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Yard Dock Management — Summary KPIs.
   * GET /api/v1/mm/yard/dock-management/summary
   */
  public static async getYardDockManagementSummary(
    request: APIRequestContext,
    params: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const qp: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qp[k] = String(v);
    }
    const query = new URLSearchParams(qp).toString();
    const url = `${this.getBaseUrl()}${this.basePath}/mm/yard/dock-management/summary?${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Scan Docket Document Against Plan Before Box Loading.
   * POST /api/v1/trips/{tripNo}/documents/scan
   */
  public static async scanTripDocketDocument(
    request: APIRequestContext,
    tripNo: string,
    payload: { docketNo: string; companyCode: number; actor: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/documents/scan`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Place Docket Document Into Pouch After Loading Is Closed.
   * POST /api/v1/trips/{tripNo}/documents/pouch
   */
  public static async pouchTripDocketDocument(
    request: APIRequestContext,
    tripNo: string,
    payload: { docketNo: string; companyCode: number; actor: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/trips/${tripNo}/documents/pouch`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}

