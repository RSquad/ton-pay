import * as React from "react";
import {
  useTonAddress,
  useTonConnectModal,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import type { GetMessageFn, PayInfo } from "../types";

const WALLET_CONNECTION_TIMEOUT = 5 * 60 * 1000;
const TX_VALID_DURATION = 5 * 60;

export function useTonPay() {
  const address = useTonAddress(true);
  const modal = useTonConnectModal();
  const [tonConnectUI] = useTonConnectUI();

  const waitForWalletConnection = React.useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (address) {
        resolve(address);
        return;
      }

      modal.open();

      const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
        if (wallet?.account) {
          unsubscribe();
          unsubscribeModal();
          resolve(wallet.account.address);
        }
      });

      const unsubscribeModal = tonConnectUI.onModalStateChange((state) => {
        if (state.status === "closed") {
          unsubscribe();
          unsubscribeModal();
          reject(new Error("Wallet connection modal closed"));
        }
      });

      setTimeout(() => {
        unsubscribe();
        unsubscribeModal();
        reject(new Error("Wallet connection timeout"));
      }, WALLET_CONNECTION_TIMEOUT);
    });
  }, [address, modal, tonConnectUI]);

  const pay = React.useCallback(
    async <T extends object = object>(
      getMessage: GetMessageFn<T>
    ): Promise<PayInfo<T>> => {
      const walletAddress = await waitForWalletConnection();
      const validUntil = Math.floor(Date.now() / 1e3) + TX_VALID_DURATION;
      const messageResult = await getMessage(walletAddress);

      const txResult = await tonConnectUI.sendTransaction({
        messages: [messageResult.message],
        validUntil,
        from: walletAddress,
      });

      return { ...messageResult, txResult };
    },
    [waitForWalletConnection, tonConnectUI]
  );

  return { pay, address };
}
