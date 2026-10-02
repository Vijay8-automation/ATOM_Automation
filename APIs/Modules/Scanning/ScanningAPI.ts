import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

import * as crypto from 'crypto';

export class ScanningAPI {
  public static readonly serviceKey = 'scanning';
  public static readonly basePath = '/api/v1/scan';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30088');
  }

  /**
   * Record a barcode / box scan.
   * POST /api/v1/scans
   */
  public static async recordScan(
    request: APIRequestContext,
    payload: {
      boxCode: string;
      eventType: string;
      scanStage: string;
      branchCode: string;
      scannedBy: string;
      deviceId?: string;
      clientRef?: string;
      companyCode?: number;
      expectedDocketNo?: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const fullPayload = {
      ...payload,
      clientRef: payload.clientRef || crypto.randomUUID(),
    };

    const url = `${this.getBaseUrl()}/api/v1/scans`;
    const response = await request.post(url, { data: fullPayload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Start Scan Session.
   * POST /api/v1/scan-sessions
   */
  public static async startSession(
    request: APIRequestContext,
    payload: {
      branchCode: string;
      stage: string;
      startedBy: string;
      deviceRef?: string;
      companyCode?: number;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}/api/v1/scan-sessions`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * End Scan Session.
   * POST /api/v1/scan-sessions/{sessionId}/complete
   */
  public static async endSession(
    request: APIRequestContext,
    sessionId: string,
    payload: { endedBy: string },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}/api/v1/scan-sessions/${sessionId}/complete`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Print barcode batch sticker.
   * POST /api/v1/print-batches
   */
  public static async printBatch(
    request: APIRequestContext,
    payload: {
      docketNo: string;
      boxesCount?: number;
      count?: number;
      printedBy?: string;
      actor?: string;
      companyCode?: number;
      customerCode?: number;
      customerName?: string;
      branchCode?: string;
      printType?: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}/api/v1/print-batches`;
    const count = payload.count || payload.boxesCount || 1;
    const actor = payload.actor || payload.printedBy || 'a1a1a1a1-0001-4000-8000-000000000001';
    const bodyPayload = {
      companyCode: payload.companyCode || 400021,
      customerCode: payload.customerCode || 25,
      customerName: payload.customerName || 'Customer 25',
      branchCode: payload.branchCode || '1001',
      docketNo: payload.docketNo,
      printType: payload.printType || 'POST_MANIFEST',
      reprintReason: null,
      count,
      actor,
    };
    const response = await request.post(url, { data: bodyPayload, headers });
    const body = await response.json().catch(() => ({}));

    // Fallback to PRE_MANIFEST + /bind if Booking -> Scanning Kafka event has not yet manifested the docket
    if (response.status() === 422 && body?.errorCode === 'DOCKET_NOT_MANIFESTED' && payload.docketNo) {
      const prePayload = {
        ...bodyPayload,
        printType: 'PRE_MANIFEST',
      };
      const preRes = await request.post(url, { data: prePayload, headers });
      const preBody = await preRes.json().catch(() => ({}));
      const preBoxCode: string | undefined = preBody?.data?.boxCodes?.[0];
      if ([200, 201].includes(preRes.status()) && preBoxCode) {
        const batchIdMatch = preBoxCode.match(/^PRE-(\d+)-/);
        const batchId = preBody?.data?.batchId || (batchIdMatch ? Number(batchIdMatch[1]) : null);
        if (batchId) {
          const bindUrl = `${this.getBaseUrl()}/api/v1/print-batches/${batchId}/bind`;
          const bindRes = await request.post(bindUrl, {
            data: {
              companyCode: bodyPayload.companyCode,
              docketNo: payload.docketNo,
              actor,
            },
            headers,
          });
          const bindBody = await bindRes.json().catch(() => ({}));
          if ([200, 201].includes(bindRes.status())) {
            return { response: bindRes, body: bindBody, status: bindRes.status() };
          }
        }
      }
    }

    return { response, body, status: response.status() };
  }
}
