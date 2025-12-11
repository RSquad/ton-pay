import { getBaseUrl } from '../common/get-base-url';
import type { APIOptions } from '../types/api-options';
import type { CompletedTonPayTransferInfo } from '../types/completed-ton-pay-transfer-info';

/**
 * Gets a TON Pay transfer by reference
 * @param reference - the reference of the transfer
 * @param options - the options for the transfer
 * @returns the transfer information
 */

export const getTonPayTransferByReference = async (
  reference: string,
  options?: APIOptions,
): Promise<CompletedTonPayTransferInfo> => {
  const baseUrl = getBaseUrl(options?.chain);
  const response = await fetch(
    `${baseUrl}/api/merchant/v1/transfer?reference=${reference}`,
    {
      method: 'GET',
    },
  );
  if (!response.ok) {
    throw new Error('Failed to get TON Pay transfer by reference', {
      cause: response.statusText,
    });
  }
  return response.json();
};
