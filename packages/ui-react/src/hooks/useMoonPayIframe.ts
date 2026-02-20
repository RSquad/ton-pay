import * as React from 'react';
import {
  createMoonpayTransfer,
  checkMoonpayGeo,
  checkMoonpayLimits,
} from '@ton-pay/api';
import type {
  CreateMoonpayTransferParams,
  MoonpayGeoResult,
  MoonpayAmountLimits,
} from '@ton-pay/api';
import type { UseMoonPayIframeOptions } from '../types';

interface MoonPayLimitsResponse {
  limits?: {
    quoteCurrency?: {
      minBuyAmount: number;
      maxBuyAmount: number;
    };
  };
  quoteCurrency?: {
    minBuyAmount: number;
    maxBuyAmount: number;
  };
}

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
      _amount: number,
      asset: string,
      ipAddress: string,
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const geo = await checkMoonpayGeo({ ipAddress }, { chain });
        setGeoResult(geo);

        if (!geo.isBuyAllowed) {
          return false;
        }

        const limitRes = (await checkMoonpayLimits(
          { asset },
          { chain },
        )) as MoonPayLimitsResponse;
        setLimits(limitRes as unknown as MoonpayAmountLimits);

        // Availability is based on geo only; amount limits are handled on top-up
        return true;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [chain],
  );

  /**
   * Like checkAvailability but returns limits data alongside the result.
   * Used by the new card top-up flow to get minBuyAmount for top-up calculation.
   */
  const checkAvailabilityWithLimits = React.useCallback(
    async (
      _amount: number,
      asset: string,
      ipAddress: string,
    ): Promise<{
      available: boolean;
      minBuyAmount?: number;
      maxBuyAmount?: number;
    }> => {
      setLoading(true);
      setError(null);

      try {
        const geo = await checkMoonpayGeo({ ipAddress }, { chain });
        setGeoResult(geo);

        if (!geo.isBuyAllowed) {
          return { available: false };
        }

        const limitRes = (await checkMoonpayLimits(
          { asset },
          { chain },
        )) as MoonPayLimitsResponse;
        setLimits(limitRes as unknown as MoonpayAmountLimits);

        const limitsData = limitRes?.limits || limitRes;

        if (!limitsData?.quoteCurrency) {
          return { available: false };
        }

        const { minBuyAmount, maxBuyAmount } = limitsData.quoteCurrency;

        // Availability is based on geo only; amount limits are handled
        // by calculateTopUpAmount which ensures amount >= minBuyAmount
        return {
          available: true,
          minBuyAmount,
          maxBuyAmount,
        };
      } catch {
        return { available: false };
      } finally {
        setLoading(false);
      }
    },
    [chain],
  );

  const fetchOnRampLink = React.useCallback(
    async (
      params: CreateMoonpayTransferParams,
    ): Promise<{ link: string; reference: string }> => {
      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {};
        if (apiKey) {
          headers['x-api-key'] = apiKey;
        }
        const response = await createMoonpayTransfer(params, { apiKey, chain });
        setLink(response.link);
        return { link: response.link, reference: response.reference };
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
    checkAvailabilityWithLimits,
    geoResult,
    limits,
  };
}
