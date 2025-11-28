/**
 * MoonPay geo location result
 */
export type MoonpayGeoResult = {
  alpha2: string;
  alpha3: string;
  country: string;
  state: string;
  ipAddress: string;
  isAllowed: boolean;
  isBuyAllowed: boolean;
  isNftAllowed: boolean;
  isSellAllowed: boolean;
  isBalanceLedgerWithdrawAllowed: boolean;
  isFiatBalanceAllowed: boolean;
  isMoonPayBalanceAllowed: boolean;
  isLowLimitEnabled: boolean;
};

/**
 * MoonPay amount limits
 */
export type MoonpayAmountLimits = {
  paymentMethod: string;
  quoteCurrency: {
    code: string;
    minBuyAmount: number;
    maxBuyAmount: number;
  };
  baseCurrency: {
    code: string;
    minBuyAmount: number;
    maxBuyAmount: number;
  };
  areFeesIncluded: boolean;
};

/**
 * @param amount - in human readable format, 10.5 for example
 * @param asset - jetton master address or TON coin address for TON transfer
 * @param recipientAddr - recipient wallet address. Optional if API key is provided - defaults to the merchant's wallet address from the admin panel
 * @param userIp - user's IP address (required for geo verification)
 * @param redirectURL - redirect URL after Moonpay purchase
 */
export type CreateMoonpayTransferParams = {
  amount: number;
  asset: string;
  recipientAddr?: string;
  userIp: string;
  redirectURL: string;
};

/**
 * @param link - MoonPay payment link
 * @param geo - MoonPay geo location result
 * @param limits - MoonPay amount limits
 */
export type CreateMoonpayTransferResponse = {
  link: string;
  geo?: MoonpayGeoResult;
  limits: MoonpayAmountLimits;
};
