import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class PrqAPI {
  public static readonly serviceKey = 'booking';
  public static readonly basePath = '/api/v1/prqs';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30082');
  }

  /**
   * Create Pickup Request (PRQ).
   * POST /api/v1/prqs
   */
  public static async createPrq(
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
   * Get PRQ Details.
   * GET /api/v1/prqs/{prqNo}
   */
  public static async getPrq(
    request: APIRequestContext,
    prqNo: string,
    companyId: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${prqNo}?companyId=${encodeURIComponent(companyId)}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Update PRQ Status.
   * POST /api/v1/prqs/{prqNo}/status
   */
  public static async updatePrqStatus(
    request: APIRequestContext,
    prqNo: string,
    payload: { status: string; remarks?: string; companyId: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${prqNo}/status`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Search PRQs.
   * GET /api/v1/prqs
   */
  public static async searchPrqs(
    request: APIRequestContext,
    params: { companyId: string; status?: string; branchCode?: string; page?: number; size?: number },
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

  public static getLmfmBaseUrl(): string {
    return BaseAPI.getServiceUrl('lmfm', 'http://10.10.130.123:30083');
  }

  /**
   * Close PRQ.
   * POST /api/v1/prqs/{prqCode}/close
   */
  public static async closePrq(
    request: APIRequestContext,
    prqCode: string,
    payload: { reason?: string; companyId?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${encodeURIComponent(prqCode)}/close`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Transfer PRQ to another branch.
   * POST /api/v1/prqs/{prqCode}/transfer-branch
   */
  public static async transferPrqBranch(
    request: APIRequestContext,
    prqCode: string,
    payload: { targetBranchCode: string; reason?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${encodeURIComponent(prqCode)}/transfer-branch`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Accept PRQ cluster / route recommendation.
   * POST /api/v1/prqs/{prqCode}/recommendation/accept
   */
  public static async acceptPrqRecommendation(
    request: APIRequestContext,
    prqCode: string,
    payload?: any,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${encodeURIComponent(prqCode)}/recommendation/accept`;
    const response = await request.post(url, { data: payload || {}, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Override PRQ cluster / route recommendation.
   * POST /api/v1/prqs/{prqCode}/recommendation/override
   */
  public static async overridePrqRecommendation(
    request: APIRequestContext,
    prqCode: string,
    payload: any,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${encodeURIComponent(prqCode)}/recommendation/override`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Open PRQs for field pickup.
   * GET /api/v1/field/prqs/open
   */
  public static async getOpenFieldPrqs(
    request: APIRequestContext,
    params?: { branchCode?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams((params || {}) as any).toString();
    const url = `${this.getBaseUrl()}/api/v1/field/prqs/open${query ? `?${query}` : ''}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get Field PRQ pickup details.
   * GET /api/v1/field/prqs/pickup-details
   */
  public static async getFieldPrqPickupDetails(
    request: APIRequestContext,
    params?: { prqCode?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = new URLSearchParams((params || {}) as any).toString();
    const url = `${this.getBaseUrl()}/api/v1/field/prqs/pickup-details${query ? `?${query}` : ''}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Get linked dockets for PRQ.
   * GET /api/v1/field/prqs/{prqCode}/linked-dockets
   */
  public static async getLinkedDockets(
    request: APIRequestContext,
    prqCode: string,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}/api/v1/field/prqs/${encodeURIComponent(prqCode)}/linked-dockets`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Link dockets to PRQ.
   * POST /api/v1/field/prqs/{prqCode}/linked-dockets
   */
  public static async linkDocketsToPrq(
    request: APIRequestContext,
    prqCode: string,
    payload: { docketNumbers: string[] } | any,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}/api/v1/field/prqs/${encodeURIComponent(prqCode)}/linked-dockets`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  // ==========================================
  // LMFM Pickup Run Execution Methods (Mobile/Driver)
  // ==========================================

  /**
   * Record Pickup Arrival at customer location.
   * POST /api/v1/lmfm/pickup-runs/{prsNo}/requests/{prqNo}/arrive
   */
  public static async recordPickupArrival(
    request: APIRequestContext,
    prsNo: string,
    prqNo: string,
    payload?: { lat?: number; lng?: number; actor?: string; commandUuid?: string },
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/pickup-runs/${encodeURIComponent(prsNo)}/requests/${encodeURIComponent(prqNo)}/arrive${query}`;
    const response = await request.post(url, { data: payload || {}, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Receive Pickup boxes / acknowledge physical receipt.
   * POST /api/v1/lmfm/pickup-runs/{prsNo}/requests/{prqNo}/receipt
   */
  public static async receivePickup(
    request: APIRequestContext,
    prsNo: string,
    prqNo: string,
    payload: { receivedBoxes: number; remarks?: string; actor?: string },
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/pickup-runs/${encodeURIComponent(prsNo)}/requests/${encodeURIComponent(prqNo)}/receipt${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Complete Pickup run for PRQ.
   * POST /api/v1/lmfm/pickup-runs/{prsNo}/requests/{prqNo}/complete
   */
  public static async completePickup(
    request: APIRequestContext,
    prsNo: string,
    prqNo: string,
    payload: { collectedBoxes: number; collectedWeightKg: number; actor?: string; commandUuid?: string },
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/pickup-runs/${encodeURIComponent(prsNo)}/requests/${encodeURIComponent(prqNo)}/complete${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Record NPR (Non-Pickup Report) exception.
   * POST /api/v1/lmfm/pickup-runs/{prsNo}/requests/{prqNo}/npr
   */
  public static async recordNpr(
    request: APIRequestContext,
    prsNo: string,
    prqNo: string,
    payload: {
      reasonCode: string;
      remarks?: string;
      otpVerificationRef?: string;
      rescheduleDate?: string;
      rescheduleSlot?: string;
      photoRefs?: string[];
      voiceRef?: string;
      actor?: string;
      commandUuid?: string;
    },
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/pickup-runs/${encodeURIComponent(prsNo)}/requests/${encodeURIComponent(prqNo)}/npr${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Record Partial Pickup.
   * POST /api/v1/lmfm/pickup-runs/{prsNo}/requests/{prqNo}/partial
   */
  public static async partialPickup(
    request: APIRequestContext,
    prsNo: string,
    prqNo: string,
    payload: {
      collectedBoxes: number;
      collectedWeightKg: number;
      reasonCode: string;
      remarks?: string;
      actor?: string;
      commandUuid?: string;
    },
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/pickup-runs/${encodeURIComponent(prsNo)}/requests/${encodeURIComponent(prqNo)}/partial${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Park Pickup Stop.
   * POST /api/v1/lmfm/pickup-runs/{prsNo}/requests/{prqNo}/park
   */
  public static async parkPickup(
    request: APIRequestContext,
    prsNo: string,
    prqNo: string,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/pickup-runs/${encodeURIComponent(prsNo)}/requests/${encodeURIComponent(prqNo)}/park${query}`;
    const response = await request.post(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Attach Pickup Evidence (photo/doc).
   * POST /api/v1/lmfm/pickup-runs/{prsNo}/requests/{prqNo}/evidence
   */
  public static async attachPickupEvidence(
    request: APIRequestContext,
    prsNo: string,
    prqNo: string,
    payload: any,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/pickup-runs/${encodeURIComponent(prsNo)}/requests/${encodeURIComponent(prqNo)}/evidence${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Create Pickup Run for a Trip.
   * POST /api/v1/lmfm/trips/{tripNo}/pickup-runs
   */
  public static async createPickupRun(
    request: APIRequestContext,
    tripNo: string,
    payload: any,
    companyCode?: number,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = companyCode ? `?companyCode=${companyCode}` : '';
    const url = `${this.getLmfmBaseUrl()}/api/v1/lmfm/trips/${encodeURIComponent(tripNo)}/pickup-runs${query}`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
