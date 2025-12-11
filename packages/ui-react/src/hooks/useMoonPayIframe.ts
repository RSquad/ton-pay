import * as React from 'react';
import { createMoonpayTransfer, checkMoonpayAvailability } from '@ton-pay/api';
import type {
  CreateMoonpayTransferParams,
  MoonpayGeoResult,
  MoonpayAmountLimits,
} from '@ton-pay/api';
import type { UseMoonPayIframeOptions } from '../types';

export function useMoonPayIframe({
  apiKey,
  chain = 'mainnet',
}: UseMoonPayIframeOptions) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [link, setLink] = React.useState<string | null>(null);
  const [geoResult, setGeoResult] = React.useState<MoonpayGeoResult | null>(
    null,
  );
  const [limits, setLimits] = React.useState<MoonpayAmountLimits | null>(null);

  const checkAvailability = React.useCallback(
    async (
      amount: number,
      asset: string,
      ipAddress: string,
    ): Promise<boolean> => {
      if (!apiKey) return false;

      setLoading(true);
      setError(null);

      try {
        const availability = await checkMoonpayAvailability(
          { asset, ipAddress },
          { apiKey, chain },
        );
        setGeoResult(availability.geo);
        setLimits(availability.limits);

        if (!availability.geo.isBuyAllowed) {
          return false;
        }

        const limitsData = availability.limits;

        if (!limitsData?.quoteCurrency) {
          return false;
        }

        const { minBuyAmount, maxBuyAmount } = limitsData.quoteCurrency;

        if (amount < minBuyAmount || amount > maxBuyAmount) {
          return false;
        }

        return true;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiKey, chain],
  );

  const fetchOnRampLink = React.useCallback(
    async (params: CreateMoonpayTransferParams): Promise<string> => {
      if (!apiKey) throw new Error('API Key is required');

      setLoading(true);
      setError(null);

      try {
        const response = await createMoonpayTransfer(params, { apiKey, chain });
        setLink(response.link);
        return response.link;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Failed to generate OnRamp link';
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
    link,
    fetchOnRampLink,
    checkAvailability,
    geoResult,
    limits,
  };
}
