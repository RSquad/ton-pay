import type {
  MoonpayAmountLimits,
  MoonpayGeoResult,
} from './create-moonpay-transfer';

export type CheckMoonpayAvailabilityParams = {
  asset: string;
  ipAddress?: string;
};

export type CheckMoonpayAvailabilityResponse = {
  geo: MoonpayGeoResult;
  limits: MoonpayAmountLimits;
  currencyCode: string;
};
