import * as CryptoJS from "crypto-js";

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
 * app.post("/webhook", (req, res) => {
 *   const signature = req.headers["x-tonpay-signature"] as string;
 *   const payload = JSON.stringify(req.body);
 *
 *   if (!verifySignature(payload, signature, YOUR_API_SECRET)) {
 *     return res.status(401).json({ error: "Invalid signature" });
 *   }
 *
 *   res.status(200).json({ received: true });
 * });
 *
 * // With object (will be stringified automatically)
 * app.post("/webhook", (req, res) => {
 *   const signature = req.headers["x-tonpay-signature"] as string;
 *
 *   if (!verifySignature(req.body, signature, YOUR_API_SECRET)) {
 *     return res.status(401).json({ error: "Invalid signature" });
 *   }
 *
 *   res.status(200).json({ received: true });
 * });
 * ```
 */
export function verifySignature(
  payload: string | object,
  signature: string,
  apiSecret: string
): boolean {
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  const hmac = CryptoJS.HmacSHA256(payloadString, apiSecret);
  const expectedSignature = `sha256=${hmac.toString(CryptoJS.enc.Hex)}`;

  return signature === expectedSignature;
}
