import { getBaseUrl } from '../common/get-base-url';
import type { APIOptions } from '../types/api-options';
import type { CreateTonPayTransferParams } from '../types/create-ton-pay-transfer';
import type { CreateTonPayTransferResponse } from '../types/create-ton-pay-transfer';

/**
 * Creates a message for TON Pay transfer
 * @param params - the parameters for the transfer
 * @param options - the options for the transfer
 * @returns the message for the transfer and data for tracking the transfer
 */

export const createTonPayTransfer = async (
  params: CreateTonPayTransferParams,
  options?: APIOptions,
): Promise<CreateTonPayTransferResponse> => {
  const baseUrl = getBaseUrl(options?.chain);
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.apiKey ? { 'x-api-key': options.apiKey } : {}),
  };
  const response = await fetch(`${baseUrl}/api/merchant/v1/create-transfer`, {
    method: 'POST',
    body: JSON.stringify(params),
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to create TON Pay transfer', {
      cause: response.statusText,
    });
  }
  return response.json();
};
