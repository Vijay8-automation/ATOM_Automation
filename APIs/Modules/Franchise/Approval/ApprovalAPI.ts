import { APIRequestContext, APIResponse } from '@playwright/test';
import { getDefaultGatewayHeaders, getFranchiseBaseUrl } from '../franchiseBase';
import defaultApprovalPayload from './raise_approval.json';

export class ApprovalAPI {
  /**
   * Raise Franchise Approval Request.
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/requests/raiseApproval/{entityId}?type={type}
   */
  public static async raiseApproval(
    request: APIRequestContext,
    entityId: string,
    payload: any = defaultApprovalPayload,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/requests/raiseApproval/${entityId}?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, {
      headers,
      data: payload,
      failOnStatusCode: false,
    });
  }

  /**
   * Move Franchise back to Draft.
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/request/{entityId}/move-to-draft?type={type}
   */
  public static async moveToDraft(
    request: APIRequestContext,
    entityId: string,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${entityId}/move-to-draft?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, {
      headers,
      failOnStatusCode: false,
    });
  }

  /**
   * Get Franchise Approval Status.
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/{entityId}/approval-status
   */
  public static async getApprovalStatus(
    request: APIRequestContext,
    entityId: string,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/${entityId}/approval-status`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.get(url, {
      headers,
      failOnStatusCode: false,
    });
  }
}
