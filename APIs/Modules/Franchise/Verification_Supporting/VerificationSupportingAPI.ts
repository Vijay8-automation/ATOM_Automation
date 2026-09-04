import { APIRequestContext, APIResponse } from '@playwright/test';
import { getDefaultGatewayHeaders, getFranchiseBaseUrl } from '../franchiseBase';
import defaultFilterPayload from './filter_entities.json';

export class VerificationSupportingAPI {
  /**
   * Get Franchise Filter Options.
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/filters/filterOptions?type={type}
   */
  public static async getFilterOptions(
    request: APIRequestContext,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/filters/filterOptions?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.get(url, { headers, failOnStatusCode: false });
  }

  /**
   * Get Franchise Sub Types.
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/filters/entitySubType?type={type}
   */
  public static async getSubTypes(
    request: APIRequestContext,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/filters/entitySubType?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.get(url, { headers, failOnStatusCode: false });
  }

  /**
   * GSTIN Verification.
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/verification/gstin/{gstin}
   */
  public static async gstinVerification(
    request: APIRequestContext,
    gstin: string,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/verification/gstin/${gstin}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.get(url, { headers, failOnStatusCode: false });
  }

  /**
   * Filter Franchise Entities with pagination.
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/filter?page={page}&size={size}&sort={sort}
   */
  public static async filterEntities(
    request: APIRequestContext,
    payload: any = defaultFilterPayload,
    page: number = 0,
    size: number = 20,
    sort: string = 'createdAt,desc',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/filter?page=${page}&size=${size}&sort=${sort}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, { headers, data: payload, failOnStatusCode: false });
  }
}
