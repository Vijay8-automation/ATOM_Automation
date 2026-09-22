import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPI } from '../../Common/BaseAPI';

export class NotificationAPI {
  public static readonly serviceKey = 'notification';
  public static readonly basePath = '/notification-service/v1/api';

  public static getBaseUrl(): string {
    return BaseAPI.getServiceUrl(this.serviceKey, 'http://10.10.130.123:30086');
  }

  /**
   * Send Notification (SMS, Email, Push).
   * POST /notification-service/v1/api/notifications
   */
  public static async sendNotification(
    request: APIRequestContext,
    payload: {
      channelCode: string;
      recipient: string;
      templateCode?: string;
      messageParams?: Record<string, any>;
      subject?: string;
      body?: string;
    },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/notifications`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * Create Notification Channel.
   * POST /notification-service/v1/api/notification-channels
   */
  public static async createChannel(
    request: APIRequestContext,
    payload: Record<string, any>,
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const url = `${this.getBaseUrl()}${this.basePath}/notification-channels`;
    const response = await request.post(url, { data: payload, headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }

  /**
   * List Notification Channels.
   * GET /notification-service/v1/api/notification-channels
   */
  public static async listChannels(
    request: APIRequestContext,
    params?: { page?: number; size?: number },
    token?: string
  ): Promise<{ response: APIResponse; body: any; status: number }> {
    const authToken = token || (await BaseAPI.ensureAuthToken(request));
    const headers = BaseAPI.getDefaultGatewayHeaders(authToken);

    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    const url = `${this.getBaseUrl()}${this.basePath}/notification-channels${query}`;
    const response = await request.get(url, { headers });
    const body = await response.json().catch(() => ({}));
    return { response, body, status: response.status() };
  }
}
