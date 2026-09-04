import { APIRequestContext, APIResponse } from '@playwright/test';
import { getDefaultGatewayHeaders, getFranchiseBaseUrl } from '../franchiseBase';

export class RetrieveAPI {
  /**
   * Get Franchise Details by Entity ID.
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/request/{entityId}/data?type={type}
   */
  public static async getDetailsById(
    request: APIRequestContext,
    entityId: string,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${entityId}/data?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.get(url, {
      headers,
      failOnStatusCode: false,
    });
  }

  /**
   * Get Franchise by PAN Number.
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/request/{panNumber}?type={type}
   */
  public static async getByPan(
    request: APIRequestContext,
    panNumber: string,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${panNumber}?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.get(url, {
      headers,
      failOnStatusCode: false,
    });
  }

  /**
   * Search Franchise by Name or Code.
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/summary?search={search}&type={type}
   */
  public static async searchByNameOrCode(
    request: APIRequestContext,
    search: string,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/summary?search=${encodeURIComponent(search)}&type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.get(url, {
      headers,
      failOnStatusCode: false,
    });
  }
}
