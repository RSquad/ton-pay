import * as React from 'react';
import { createMoonpayTransfer, checkMoonpayLimits } from '@ton-pay/api';
import type {
  CreateMoonpayTransferParams,
  MoonpayAmountLimits,
} from '@ton-pay/api';
import type { Chain } from '@ton-pay/api';

export interface UseMoonPayTopUpOptions {
  apiKey?: string;
  chain?: Chain;
}

export interface TopUpLinkParams {
  /** Amount to top up (in token units, calculated by calculateTopUpAmount) */
  amount: number;
  /** Token asset identifier */
  asset: string;
  /** User's wallet address (funds go HERE, not to merchant) */
  recipientAddr: string;
  /** User's IP for MoonPay geo verification */
  userIp: string;
  /** Redirect URL after MoonPay purchase */
  redirectURL?: string;
}

/**
 * Calculate the amount to request from MoonPay.
 *
 * Formula: max((paymentAmount - currentBalance) * 1.05, minMoonPayAmount * 1.05)
 */
export function calculateTopUpAmount(
  paymentAmount: number,
  currentBalance: number,
  minMoonPayAmount: number,
): number {
  const deficit = paymentAmount - currentBalance;
  const withBuffer = deficit * 1.05;

  if (withBuffer < minMoonPayAmount) {
    return Math.ceil(minMoonPayAmount * 1.05 * 100) / 100;
  }

  return Math.ceil(withBuffer * 100) / 100;
}

export function useMoonPayTopUp({
  apiKey,
  chain = 'mainnet',
}: UseMoonPayTopUpOptions) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [limits, setLimits] = React.useState<MoonpayAmountLimits | null>(null);

  const fetchLimits = React.useCallback(
    async (asset: string): Promise<MoonpayAmountLimits | null> => {
      if (!apiKey) return null;

      try {
        const limitRes = await checkMoonpayLimits({ asset }, { apiKey, chain });
        setLimits(limitRes);
        return limitRes;
      } catch (err) {
        console.error('[useMoonPayTopUp] Failed to fetch limits:', err);
        return null;
      }
    },
    [apiKey, chain],
  );

  const fetchTopUpLink = React.useCallback(
    async (
      params: TopUpLinkParams,
    ): Promise<{ link: string; reference: string }> => {
      if (!apiKey) throw new Error('API Key is required');

      setLoading(true);
      setError(null);

      try {
        const transferParams: CreateMoonpayTransferParams = {
          amount: params.amount,
          asset: params.asset,
          recipientAddr: params.recipientAddr,
          userIp: params.userIp,
          redirectURL: params.redirectURL || '',
          directTopUp: true,
        };

        const response = await createMoonpayTransfer(transferParams, {
          apiKey,
          chain,
        });

        return { link: response.link, reference: response.reference };
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Failed to generate top-up link';
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, chain],
  );

  return {
    loading,
    error,
    limits,
    fetchLimits,
    fetchTopUpLink,
    calculateTopUpAmount,
  };
}
