import { APIRequestContext, APIResponse } from '@playwright/test';
import { getDefaultGatewayHeaders, getFranchiseBaseUrl } from '../franchiseBase';

export class AddressAPI {
  /**
   * Get all addresses of an entity.
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/request/{entityId}/addresses
   */
  public static async getAddresses(
    request: APIRequestContext,
    entityId: string,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${entityId}/addresses`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.get(url, { headers, failOnStatusCode: false });
  }

  /**
   * Add a single address to an entity.
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/request/{entityId}/addresses
   */
  public static async addSingleAddress(
    request: APIRequestContext,
    entityId: string,
    payload: any,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${entityId}/addresses`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, { headers, data: payload, failOnStatusCode: false });
  }

  /**
   * Add multiple addresses in bulk.
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/request/{entityId}/addresses/bulk
   */
  public static async addBulkAddresses(
    request: APIRequestContext,
    entityId: string,
    payload: any[],
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${entityId}/addresses/bulk`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, { headers, data: payload, failOnStatusCode: false });
  }

  /**
   * Update an existing address.
   * Endpoint: PUT {{baseUrl}}/generic-onboarding/v1/api/entities/request/{entityId}/addresses/{addressId}
   */
  public static async updateAddress(
    request: APIRequestContext,
    entityId: string,
    addressId: string,
    payload: any,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${entityId}/addresses/${addressId}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.put(url, { headers, data: payload, failOnStatusCode: false });
  }

  /**
   * Delete an address.
   * Endpoint: DELETE {{baseUrl}}/generic-onboarding/v1/api/entities/request/{entityId}/addresses/{addressId}
   */
  public static async deleteAddress(
    request: APIRequestContext,
    entityId: string,
    addressId: string,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${entityId}/addresses/${addressId}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.delete(url, { headers, failOnStatusCode: false });
  }
}
