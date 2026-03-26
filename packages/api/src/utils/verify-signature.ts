/**
 * Verifies the HMAC-SHA256 signature of a payload
 * @param payload - Raw JSON string or object to verify
 * @param signature - The signature from X-TON Pay-Signature header
 * @param apiSecret - Your TON Pay webhook API secret
 * @returns true if signature is valid, false otherwise
 *
 * @example
 * ```typescript
 * import { verifySignature } from "@ton-pay/api";
 *
 * // With raw string
 * app.post("/webhook", async (req, res) => {
 *   const signature = req.headers["x-tonpay-signature"] as string;
 *   const payload = JSON.stringify(req.body);
 *
 *   if (!await verifySignature(payload, signature, YOUR_API_SECRET)) {
 *     return res.status(401).json({ error: "Invalid signature" });
 *   }
 *
 *   res.status(200).json({ received: true });
 * });
 *
 * // With object (will be stringified automatically)
 * app.post("/webhook", async (req, res) => {
 *   const signature = req.headers["x-tonpay-signature"] as string;
 *
 *   if (!await verifySignature(req.body, signature, YOUR_API_SECRET)) {
 *     return res.status(401).json({ error: "Invalid signature" });
 *   }
 *
 *   res.status(200).json({ received: true });
 * });
 * ```
 */
export async function verifySignature(
  payload: string | object,
  signature: string,
  apiSecret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const payloadString =
    typeof payload === 'string' ? payload : JSON.stringify(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadString),
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === `sha256=${hex}`;
}
