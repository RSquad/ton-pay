import { getBaseUrl } from '../common/get-base-url';
import type { APIOptions } from '../types/api-options';
import type {
  CheckMoonpayLimitsParams,
  CheckMoonpayLimitsResponse,
} from '../types/check-moonpay-limits';

/**
 * Gets MoonPay amount limits for an asset
 * @param params - the asset to check limits for
 * @param options - optional API options
 * @returns the amount limits for the asset
 */
export const checkMoonpayLimits = async (
  params: CheckMoonpayLimitsParams,
  options?: APIOptions,
): Promise<CheckMoonpayLimitsResponse> => {
  const baseUrl = getBaseUrl(options?.chain);
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.apiKey ? { 'x-api-key': options.apiKey } : {}),
  };

  const response = await fetch(`${baseUrl}/api/external/moonpay/limits`, {
    method: 'POST',
    body: JSON.stringify(params),
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to check MoonPay limits: ${errorText}`, {
      cause: response.statusText,
    });
  }

  return response.json();
};
