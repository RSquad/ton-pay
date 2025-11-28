import type { Chain } from "../types/chain";
import { BASE_URL, TESTNET_BASE_URL } from "./const";

export const getBaseUrl = (chain?: Chain) => {
  // only for testing. do not use in production. do not use in docs
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.TONPAY_BASE_URL) {
    // @ts-ignore
    return process.env.TONPAY_BASE_URL;
  }
  if (!chain || chain === "mainnet") {
    return BASE_URL;
  }
  return TESTNET_BASE_URL;
};
