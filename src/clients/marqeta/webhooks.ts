import {
  WebhookWithModifiedAndCreatedDates,
  PaginatedMarqetaResponse,
  WebhookCustomHeader,
  WebhookEventTypeEnumValues,
  WebhookModel,
  WebhookPingRequest,
} from '../../integrations/marqeta/types';
import { asCustomError } from '../../lib/customError';
import { camelToSnakeCase } from '../../services/utilities';
import { MarqetaClient } from './marqetaClient';

export class Webhooks {
  private _marqetaClient: MarqetaClient;

  constructor(marqetaClient: MarqetaClient) {
    this._marqetaClient = marqetaClient;
  }

  // create webhook
  async createWebhook(params: WebhookModel): Promise<WebhookWithModifiedAndCreatedDates> {
    try {
      const { data } = await this._marqetaClient._client.post('/webhooks', camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // list webhooks
  async listWebhooks(queryParams?: Record<string, string>): Promise<PaginatedMarqetaResponse<WebhookWithModifiedAndCreatedDates[]>> {
    try {
      const queryString = new URLSearchParams(camelToSnakeCase(queryParams)).toString();
      const { data } = await this._marqetaClient._client.get(`webhooks?${queryString}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // update webhook custom headers
  async updateWebhookCustomHeaders(params: WebhookCustomHeader, webhookToken: string): Promise<WebhookWithModifiedAndCreatedDates> {
    try {
      const { data } = await this._marqetaClient._client.put(
        `/webhooks/customheaders/${webhookToken}`,
        camelToSnakeCase(params),
      );
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // retrieve webhook
  async retrieveWebhook(webhookToken: string): Promise<WebhookWithModifiedAndCreatedDates> {
    try {
      const { data } = await this._marqetaClient._client.get(`webhooks/${webhookToken}`);
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // update webhook
  async updateWebhook(params: WebhookModel, webhookToken: string): Promise<WebhookWithModifiedAndCreatedDates> {
    try {
      const { data } = await this._marqetaClient._client.put(`/webhooks/${webhookToken}`, camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }

  // ping webhook
  async pingWebhook(params: WebhookPingRequest, webhookToken: string): Promise<WebhookWithModifiedAndCreatedDates> {
    try {
      const { data } = await this._marqetaClient._client.post(`/webhooks/${webhookToken}/ping`, camelToSnakeCase(params));
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
  // resend event notification
  async resendEventNotification(eventType: WebhookEventTypeEnumValues, eventToken: string, webhookToken: string): Promise<WebhookWithModifiedAndCreatedDates> {
    try {
      const { data } = await this._marqetaClient._client.post(`/webhooks/${webhookToken}/${eventType}/${eventToken}`, {});
      return data;
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  }
}
