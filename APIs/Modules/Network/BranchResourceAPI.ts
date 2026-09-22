import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class BranchResourceAPI {
  public static readonly serviceKey = 'network';
  public static readonly basePath = '/api/v1/branch-resources';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30085');
  }

  /**
   * Create or Map Branch Resource (Dock, Loader, Driver).
   * POST /api/v1/branch-resources
   */
  public static async createResource(
    request: APIRequestContext,
    payload: {
      branchCode: string;
      resourceType: string;
      resourceIdentifier: string;
      companyId: string;
    },
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
   * List Branch Resources.
   * GET /api/v1/branch-resources?branchCode=...&companyId=...
   */
  public static async listResources(
    request: APIRequestContext,
    params: { branchCode: string; companyId: string },
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
}
