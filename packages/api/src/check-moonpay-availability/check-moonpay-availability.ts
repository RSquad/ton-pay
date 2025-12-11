import { getBaseUrl } from '../common/get-base-url';
import type { APIOptions } from '../types/api-options';
import type {
  CheckMoonpayAvailabilityParams,
  CheckMoonpayAvailabilityResponse,
} from '../types/check-moonpay-availability';

export const checkMoonpayAvailability = async (
  params: CheckMoonpayAvailabilityParams,
  options?: APIOptions,
): Promise<CheckMoonpayAvailabilityResponse> => {
  const baseUrl = getBaseUrl(options?.chain);
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.apiKey ? { 'x-api-key': options.apiKey } : {}),
  };

  const response = await fetch(`${baseUrl}/api/external/moonpay/check`, {
    method: 'POST',
    body: JSON.stringify(params),
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to check MoonPay availability: ${errorText}`, {
      cause: response.statusText,
    });
  }

  return response.json();
};
