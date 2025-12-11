import type { MoonpayGeoResult } from './create-moonpay-transfer';

/**
 * @param ipAddress - IP address to check for geo restrictions
 */
export type CheckMoonpayGeoParams = {
  ipAddress: string;
};

/**
 * MoonPay geo check response
 */
export type CheckMoonpayGeoResponse = MoonpayGeoResult;
