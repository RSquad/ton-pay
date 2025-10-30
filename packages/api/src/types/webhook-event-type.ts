/**
 * Webhook event types
 *
 * @remarks
 * - `transfer.completed` - Transfer completed (check `data.status` for success/failed)
 * - `transfer.refunded` - Transfer was refunded (Coming Soon)
 */
export type WebhookEventType = "transfer.completed" | "transfer.refunded"; // Coming Soon
