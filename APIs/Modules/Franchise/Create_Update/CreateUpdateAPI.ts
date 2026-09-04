import { APIRequestContext, APIResponse } from '@playwright/test';
import { getDefaultGatewayHeaders, getFranchiseBaseUrl } from '../franchiseBase';

export class CreateUpdateAPI {
  public static readonly basePath = '/generic-onboarding/v1/api/entities/onboard';

  /**
   * Create a new Franchise partner in DRAFT status.
   * Handles all subtypes: PDA, RP, BA, BC.
   *
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/onboard?type={type}
   */
  public static async createDraft(
    request: APIRequestContext,
    payload: any,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}${this.basePath}?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, {
      headers,
      data: payload,
      failOnStatusCode: false,
    });
  }

  /**
   * Create a Franchise entity and immediately submit for approval in one call (submit=true).
   *
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/onboard?type={type}&submit=true
   */
  public static async createAndSubmit(
    request: APIRequestContext,
    payload: any,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}${this.basePath}?type=${type}&submit=true`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, {
      headers,
      data: payload,
      failOnStatusCode: false,
    });
  }

  /**
   * Update an existing Franchise draft entity by entityId.
   *
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/onboard?type={type}&entityId={entityId}
   */
  public static async updateDraft(
    request: APIRequestContext,
    entityId: string,
    payload: any,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}${this.basePath}?type=${type}&entityId=${entityId}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, {
      headers,
      data: payload,
      failOnStatusCode: false,
    });
  }
}
