import { getBaseUrl } from "../common/get-base-url";
import type { APIOptions } from "../types/api-options";
import type {
  CheckMoonpayGeoParams,
  CheckMoonpayGeoResponse,
} from "../types/check-moonpay-geo";

/**
 * Checks MoonPay geo restrictions for an IP address
 * @param params - the IP address to check
 * @param options - optional API options
 * @returns the geo location and restrictions
 */
export const checkMoonpayGeo = async (
  params: CheckMoonpayGeoParams,
  options?: APIOptions
): Promise<CheckMoonpayGeoResponse> => {
  const baseUrl = getBaseUrl(options?.chain);
  const headers = {
    "Content-Type": "application/json",
    ...(options?.apiKey ? { "x-api-key": options.apiKey } : {}),
  };

  const response = await fetch(
    `${baseUrl}/api/external/moonpay/check-geo?ipAddress=${encodeURIComponent(params.ipAddress)}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to check MoonPay geo: ${errorText}`, {
      cause: response.statusText,
    });
  }

  return response.json();
};

