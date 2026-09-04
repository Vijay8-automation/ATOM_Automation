import { APIRequestContext, APIResponse } from '@playwright/test';
import { getDefaultGatewayHeaders, getFranchiseBaseUrl } from '../franchiseBase';

export class ApplicationLinkAPI {
  /**
   * Generate Application Link (Authenticated).
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/{entityId}/application-link?validDays={validDays}
   */
  public static async generateApplicationLink(
    request: APIRequestContext,
    entityId: string,
    validDays: number = 7,
    token?: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/${entityId}/application-link?validDays=${validDays}`;
    const headers = getDefaultGatewayHeaders(token);

    return await request.post(url, { headers, failOnStatusCode: false });
  }

  /**
   * Open Application by Token (Public route).
   * Endpoint: GET {{baseUrl}}/generic-onboarding/v1/api/entities/application/{applicationToken}
   */
  public static async openApplication(
    request: APIRequestContext,
    applicationToken: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/application/${applicationToken}`;

    return await request.get(url, { failOnStatusCode: false });
  }

  /**
   * Partial Save Application (Public route).
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/application/{applicationToken}/save
   */
  public static async partialSave(
    request: APIRequestContext,
    applicationToken: string,
    payload: any
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/application/${applicationToken}/save`;

    return await request.post(url, {
      headers: { 'Content-Type': 'application/json' },
      data: payload,
      failOnStatusCode: false,
    });
  }

  /**
   * Upload Documents via Link (Public route).
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/application/{applicationToken}/documents
   */
  public static async uploadDocuments(
    request: APIRequestContext,
    applicationToken: string,
    payload: any[]
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/application/${applicationToken}/documents`;

    return await request.post(url, {
      headers: { 'Content-Type': 'application/json' },
      data: payload,
      failOnStatusCode: false,
    });
  }

  /**
   * Submit Application (Public route).
   * Endpoint: POST {{baseUrl}}/generic-onboarding/v1/api/entities/application/{applicationToken}/submit
   */
  public static async submitApplication(
    request: APIRequestContext,
    applicationToken: string
  ): Promise<APIResponse> {
    const baseUrl = getFranchiseBaseUrl();
    const url = `${baseUrl}/generic-onboarding/v1/api/entities/application/${applicationToken}/submit`;

    return await request.post(url, { failOnStatusCode: false });
  }
}
