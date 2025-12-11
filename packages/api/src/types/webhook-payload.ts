import type { CompletedTonPayTransferInfo } from './completed-ton-pay-transfer-info';
import type { WebhookEventType } from './webhook-event-type';

/**
 * Base webhook payload structure
 */
interface BaseWebhookPayload {
  event: WebhookEventType;
  timestamp: string;
}

/**
 * Webhook payload for transfer.completed event
 *
 * @remarks
 * Sent when a transfer is completed on the blockchain.
 * Check `data.status` field to determine if transfer was "success" or "failed".
 */
export interface TransferCompletedWebhookPayload extends BaseWebhookPayload {
  event: 'transfer.completed';
  data: CompletedTonPayTransferInfo;
}

/**
 * Webhook payload for transfer.refunded event
 *
 * @remarks
 * Coming Soon - Sent when a transfer is refunded
 */
export interface TransferRefundedWebhookPayload extends BaseWebhookPayload {
  event: 'transfer.refunded';
  data: unknown; // Coming Soon - structure to be defined
}

/**
 * Union type for all webhook payloads
 *
 * @remarks
 * Currently only transfer.completed is supported.
 * Additional events will be added in future updates.
 */
export type WebhookPayload =
  | TransferCompletedWebhookPayload
  | TransferRefundedWebhookPayload; // Coming Soon
