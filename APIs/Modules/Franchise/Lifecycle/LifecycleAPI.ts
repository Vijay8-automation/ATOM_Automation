import { APIRequestContext, APIResponse } from '@playwright/test';
import { getDefaultGatewayHeaders, getFranchiseBaseUrl } from '../franchiseBase';

export class LifecycleAPI {
  /**
   * Deactivate Franchise (Soft Delete - sets isActive=false).
   * Endpoint: DELETE {{baseUrl}}/generic-onboarding/v1/api/entities/request/{entityId}?type={type}
   */
  public static async deactivate(
    request: APIRequestContext,
    entityId: string,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${entityId}?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.delete(url, { headers, failOnStatusCode: false });
  }

  /**
   * Hard Delete Franchise (only allowed in DRAFT status).
   * Endpoint: DELETE {{baseUrl}}/generic-onboarding/v1/api/entities/request/delete/{entityId}?type={type}
   */
  public static async hardDelete(
    request: APIRequestContext,
    entityId: string,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/delete/${entityId}?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.delete(url, { headers, failOnStatusCode: false });
  }

  /**
   * Soft Update Onboarding Data (only for APPROVED entities).
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/request/{entityId}/data?type={type}
   */
  public static async softUpdate(
    request: APIRequestContext,
    entityId: string,
    payload: any,
    type: string = 'franchise',
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/request/${entityId}/data?type=${type}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, { headers, data: payload, failOnStatusCode: false });
  }

  /**
   * Update Entity Status (INACTIVE or BLACKLISTED).
   * Endpoint: PUT {{baseUrl}}/generic-onboarding/v1/api/entities/{entityId}/status
   */
  public static async updateStatus(
    request: APIRequestContext,
    entityId: string,
    payload: { status: 'INACTIVE' | 'BLACKLISTED'; reason: string; remarks?: string },
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/${entityId}/status`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.put(url, { headers, data: payload, failOnStatusCode: false });
  }

  /**
   * Get Entity History.
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/{entityId}/history
   */
  public static async getHistory(
    request: APIRequestContext,
    entityId: string,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/${entityId}/history`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.get(url, { headers, failOnStatusCode: false });
  }

  /**
   * Assign Franchise Entity to User & Branch.
   * Endpoint: PUT {{baseUrl}}/generic-onboarding/v1/api/entities/{entityId}/assign
   */
  public static async assignUser(
    request: APIRequestContext,
    entityId: string,
    payload: { assignedTo: string; assignedBranch?: string },
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/${entityId}/assign`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.put(url, { headers, data: payload, failOnStatusCode: false });
  }

  /**
   * Assign Cluster Code.
   * Endpoint: PATCH {{baseUrl}}/generic-onboarding/v1/api/entities/{entityId}/cluster-code
   */
  public static async assignClusterCode(
    request: APIRequestContext,
    entityId: string,
    clusterCodes: string[],
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/${entityId}/cluster-code`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.patch(url, { headers, data: { clusterCodes }, failOnStatusCode: false });
  }

  /**
   * Patch Entity Data (Merges key-values into JSONB).
   * Endpoint: PATCH {{baseUrl}}/generic-onboarding/v1/api/entities/{entityId}/data
   */
  public static async patchData(
    request: APIRequestContext,
    entityId: string,
    payload: Record<string, any>,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/${entityId}/data`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.patch(url, { headers, data: payload, failOnStatusCode: false });
  }

  /**
   * Make Primary Bank.
   * Endpoint: PUT {{baseUrl}}/generic-onboarding/v1/api/entities/{entityId}/banks/{bankId}/make-primary
   */
  public static async makePrimaryBank(
    request: APIRequestContext,
    entityId: string,
    bankId: string,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/${entityId}/banks/${bankId}/make-primary`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.put(url, { headers, failOnStatusCode: false });
  }
}
