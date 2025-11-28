import type { MoonpayAmountLimits } from "./create-moonpay-transfer";

/**
 * @param asset - jetton master address or TON coin address for TON
 */
export type CheckMoonpayLimitsParams = {
  asset: string
};

/**
 * MoonPay limits check response
 */
export type CheckMoonpayLimitsResponse = MoonpayAmountLimits;
