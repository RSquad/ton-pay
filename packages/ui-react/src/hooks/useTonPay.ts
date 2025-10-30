import React, { useEffect } from 'react';
import {
  useTonAddress,
  useTonConnectModal,
  useTonConnectUI
} from "@tonconnect/ui-react";

import {type SendTransactionRequest, type SendTransactionResponse} from "@tonconnect/sdk";

export type TonPayMessage = SendTransactionRequest["messages"][number] & {
  payload: string;
};

export type GetMessageFn<T extends object = object> = (
  senderAddr: string
) => Promise<{ message: TonPayMessage } & T>;

export type PayInfo<T extends object = object> = {
  message: TonPayMessage;
  txResult: SendTransactionResponse;
} & T;

export const useTonPay = () => {
  const address = useTonAddress(true);
  const modal = useTonConnectModal();
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    if (address) {
      console.log(address);
    }
  }, [address]);

  const waitForWalletConnection = React.useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (address) {
        resolve(address);
        return;
      }

      modal.open();

      const unsubscribe = tonConnectUI.onStatusChange((wallet: any) => {
        if (wallet && wallet.account) {
          unsubscribe();
          unsubscribeModal();
          resolve(wallet.account.address);
        }
      });

      const unsubscribeModal = tonConnectUI.onModalStateChange((state: any) => {
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
      }, 5 * 60 * 1000);
    });
  }, [address, modal, tonConnectUI]);

  const pay = React.useCallback(
    async <T extends object = object>(
      getMessage: GetMessageFn<T>
    ): Promise<PayInfo<T>> => {
      try {
        const walletAddress = await waitForWalletConnection();

        const validUntil = Math.floor(Date.now() / 1e3) + 5 * 60; // 5 minutes
        const messageResult = await getMessage(walletAddress);

        const txResult = await tonConnectUI.sendTransaction({
          messages: [messageResult.message],
          validUntil,
          from: walletAddress,
        });

        return { ...messageResult, txResult };
      } catch (error) {
        console.error("Payment failed:", error);
        throw error;
      }
    },
    [waitForWalletConnection, tonConnectUI]
  );

  return { pay, address };
};
