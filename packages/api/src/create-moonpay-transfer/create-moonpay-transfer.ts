import { getBaseUrl } from "../common/get-base-url";
import type { APIOptions } from "../types/api-options";
import type {
  CreateMoonpayTransferParams,
  CreateMoonpayTransferResponse,
} from "../types/create-moonpay-transfer";

/**
 * Creates a MoonPay payment link for buying crypto
 * @param params - the parameters for the MoonPay transfer
 * @param options - the options for the transfer (requires API key)
 * @returns the payment link, geo restrictions, and amount limits
 */
export const createMoonpayTransfer = async (
  params: CreateMoonpayTransferParams,
  options: APIOptions
): Promise<CreateMoonpayTransferResponse> => {
  if (!options?.apiKey) {
    throw new Error("API key is required for MoonPay transfers");
  }

  const baseUrl = getBaseUrl(options.chain);
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": options.apiKey,
  };

  const response = await fetch(
    `${baseUrl}/api/merchant/v1/create-moonpay-transfer`,
    {
      method: "POST",
      body: JSON.stringify(params),
      headers,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create MoonPay transfer: ${errorText}`, {
      cause: response.statusText,
    });
  }

  const data = await response.json();

  if (data.link && data.link.startsWith("/")) {
    data.link = `${baseUrl}${data.link}`;
  }

  return data;
};

