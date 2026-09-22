import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class RouteAPI {
  public static readonly serviceKey = 'network';
  public static readonly basePath = '/api/v1/routes';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30085');
  }

  /**
   * Create Route draft.
   * POST /api/v1/routes
   */
  public static async createRoute(
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
   * Submit Route for approval.
   * POST /api/v1/routes/{routeCode}/submit
   */
  public static async submitRoute(
    request: APIRequestContext,
    routeCode: string,
    payload: { actor: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${routeCode}/submit`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Approve Route.
   * POST /api/v1/routes/{routeCode}/approve
   */
  public static async approveRoute(
    request: APIRequestContext,
    routeCode: string,
    payload: { actor: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${routeCode}/approve`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Activate Route.
   * POST /api/v1/routes/{routeCode}/activate
   */
  public static async activateRoute(
    request: APIRequestContext,
    routeCode: string,
    payload: { actor: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/${routeCode}/activate`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * List Routes.
   * GET /api/v1/routes
   */
  public static async listRoutes(
    request: APIRequestContext,
    params?: { companyCode?: number; status?: string; routeType?: string; branch?: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
