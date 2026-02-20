import * as React from 'react';
import {
  toUserFriendlyAddress,
  useTonAddress,
  useTonConnectModal,
  useTonConnectUI,
} from '@tonconnect/ui-react';
import type { GetMessageFn, PayInfo, TonPayMessage } from '../types';

const WALLET_CONNECTION_TIMEOUT = 5 * 60 * 1000;
const TX_VALID_DURATION = 5 * 60;

export interface SignlessPaymentConfig {
  apiUrl: string;
  onSetupRequired?: () => void;
  onUnlockRequired?: (sessionId: string) => Promise<string>;
}

export interface SignlessPaymentResult {
  success: boolean;
  signature?: string;
  publicKey?: string;
  referenceId?: string;
  error?: string;
  txHash?: string;
}

type TonConnectMessage = {
  address: string;
  amount: string;
  payload?: string;
  stateInit?: string;
};

function normalizeTonConnectMessage(input: any): TonConnectMessage {
  const address =
    typeof input?.address === 'string'
      ? input.address
      : typeof input?.to === 'string'
        ? input.to
        : '';

  const amount =
    typeof input?.amount === 'string'
      ? input.amount
      : typeof input?.value === 'string'
        ? input.value
        : '';

  const payload =
    typeof input?.payload === 'string'
      ? input.payload
      : typeof input?.body === 'string'
        ? input.body
        : undefined;

  return {
    address: address.includes(':') ? toUserFriendlyAddress(address) : address,
    amount,
    payload: payload && payload.length > 0 ? payload : undefined,
    stateInit:
      typeof input?.stateInit === 'string' ? input.stateInit : undefined,
  };
}

export function useTonPay(signlessConfig?: SignlessPaymentConfig) {
  const address = useTonAddress(false);
  const modal = useTonConnectModal();
  const [tonConnectUI] = useTonConnectUI();
  const lastSignlessIntentRef = React.useRef<{
    walletAddress: string;
    recipient?: string;
    amount?: string | number;
    asset: string;
    assetSymbol?: string;
    referenceId?: string;
  } | null>(null);

  const normalizeAsset = React.useCallback((input: unknown): string => {
    if (typeof input !== 'string') return 'TON';
    const trimmed = input.trim();
    return trimmed.length > 0 ? trimmed : 'TON';
  }, []);

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
        if (state.status === 'closed') {
          unsubscribe();
          unsubscribeModal();
          reject(new Error('Wallet connection modal closed'));
        }
      });

      setTimeout(() => {
        unsubscribe();
        unsubscribeModal();
        reject(new Error('Wallet connection timeout'));
      }, WALLET_CONNECTION_TIMEOUT);
    });
  }, [address, modal, tonConnectUI]);

  const pay = React.useCallback(
    async <T extends object = object>(
      getMessage: GetMessageFn<T>,
    ): Promise<PayInfo<T>> => {
      const walletAddress = await waitForWalletConnection();
      const validUntil = Math.floor(Date.now() / 1e3) + TX_VALID_DURATION;
      const messageResult = await getMessage(walletAddress);

      const txResult = await tonConnectUI.sendTransaction(
        {
          messages: [messageResult.message],
          validUntil,
          from: walletAddress,
        },
        {
          modals: ['before'],
          notifications: ['error'],
          skipRedirectToWallet: 'never',
        },
      );

      return { ...messageResult, txResult };
    },
    [waitForWalletConnection, tonConnectUI],
  );

  const createSignlessIframe = React.useCallback(
    (url: string): { iframe: HTMLIFrameElement; overlay: HTMLDivElement } => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      `;

      const container = document.createElement('div');
      container.style.cssText = `
        width: 100%;
        max-width: 420px;
        height: 90%;
        max-height: 700px;
        background: white;
        border-radius: 20px 20px 0 0;
        overflow: hidden;
        position: relative;
      `;

      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
      `;
      iframe.allow = 'publickey-credentials-get; publickey-credentials-create';

      container.appendChild(iframe);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
        }
      });

      return { iframe, overlay };
    },
    [],
  );

  const handleSignlessProtocol = React.useCallback(
    (
      iframeWindow: Window,
      cleanup: () => void,
      resolve: (val: any) => void,
      reject: (err: any) => void,
    ) => {
      return async (event: MessageEvent) => {
        const { type, payload } = event.data || {};

        // In prod, check origin matches signlessConfig.apiUrl

        if (type === 'SIGNLESS_HANDSHAKE') {
          // Iframe is ready
          // We can reply if needed
        }

        if (type === 'SIGNLESS_REQUEST_TONPROOF') {
          try {
            await tonConnectUI.disconnect();
            tonConnectUI.setConnectRequestParameters({
              state: 'ready',
              value: { tonProof: payload.payload },
            });
            await tonConnectUI.openModal();

            const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
              if (
                wallet &&
                wallet.connectItems?.tonProof &&
                'proof' in wallet.connectItems.tonProof
              ) {
                iframeWindow.postMessage(
                  {
                    type: 'SIGNLESS_TONPROOF_RESULT',
                    payload: {
                      address: wallet.account.address,
                      network: wallet.account.chain,
                      public_key: wallet.account.publicKey,
                      proof: wallet.connectItems.tonProof.proof,
                    },
                  },
                  '*',
                ); // TODO: Restrict origin
                unsubscribe();
              }
            });
          } catch (e) {
            iframeWindow.postMessage(
              {
                type: 'SIGNLESS_TONPROOF_RESULT',
                payload: { error: (e as Error).message },
              },
              '*',
            );
          }
        }

        if (type === 'SIGNLESS_REQUEST_SEND_TX') {
          try {
            const messages = Array.isArray(payload?.messages)
              ? payload.messages.map(normalizeTonConnectMessage)
              : [];

            const result = await tonConnectUI.sendTransaction(
              {
                messages,
                validUntil: Math.floor(Date.now() / 1000) + 600,
              },
              {
                modals: ['before'],
                notifications: ['error'],
                skipRedirectToWallet: 'never',
              },
            );
            iframeWindow.postMessage(
              {
                type: 'SIGNLESS_SEND_TX_RESULT',
                payload: { success: true, result },
              },
              '*',
            );
          } catch (e) {
            iframeWindow.postMessage(
              {
                type: 'SIGNLESS_SEND_TX_RESULT',
                payload: { success: false, error: (e as Error).message },
              },
              '*',
            );
          }
        }

        if (type === 'SIGNLESS_SUCCESS') {
          cleanup();
          resolve(payload);
        }

        if (
          type === 'SIGNLESS_FAILURE' ||
          type === 'SIGNLESS_CANCEL' ||
          type === 'SIGNLESS_ERROR'
        ) {
          cleanup();
          reject(
            new Error(
              payload?.error || payload?.message || 'Signless failed/cancelled',
            ),
          );
        }
      };
    },
    [tonConnectUI],
  );

  const payWithSignless = React.useCallback(
    async <T extends object = object>(
      createMessageCallback: (senderAddress: string) => Promise<
        {
          message: TonPayMessage;
          referenceId: string;
        } & T
      >,
    ): Promise<SignlessPaymentResult & T> => {
      if (!signlessConfig) {
        throw new Error('Signless config is required');
      }

      const walletAddress = await waitForWalletConnection();
      const messageResult = await createMessageCallback(walletAddress);
      const recipientAddress = messageResult.message.address;
      const amount = messageResult.message.amount;
      const intentAsset = normalizeAsset((messageResult as any)?.asset);
      const intentAssetSymbol =
        typeof (messageResult as any)?.assetSymbol === 'string'
          ? String((messageResult as any).assetSymbol)
          : undefined;

      const getOrCreateDeviceId = () => {
        try {
          const key = 'tpn_signless_device_id';
          const existing = window.localStorage.getItem(key);
          if (existing) return existing;
          const next =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? (crypto as any).randomUUID()
              : Math.random().toString(36).slice(2) + Date.now().toString(36);
          window.localStorage.setItem(key, next);
          return next;
        } catch {
          return Math.random().toString(36).slice(2) + Date.now().toString(36);
        }
      };

      const deviceId = getOrCreateDeviceId();

      // Create session
      let sessionId = Math.random().toString(36).substring(2);
      try {
        const sessionRes = await fetch(
          `${signlessConfig.apiUrl}/api/signless/session`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress, deviceId }),
          },
        );
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          sessionId = sessionData.sessionId;
        }
      } catch (e) {
        console.warn(
          'Failed to create session on backend, falling back to local ID',
          e,
        );
      }

      return new Promise((resolve, reject) => {
        const iframeUrl = `${signlessConfig.apiUrl}/api/signless/iframe/${sessionId}`;
        const { iframe, overlay } = createSignlessIframe(iframeUrl);

        const cleanup = () => {
          window.removeEventListener('message', messageHandler);
          overlay.remove();
        };

        const messageHandler = handleSignlessProtocol(
          iframe.contentWindow!,
          cleanup,
          (res) => resolve({ ...messageResult, ...res }),
          reject,
        );

        window.addEventListener('message', messageHandler);

        iframe.onload = () => {
          lastSignlessIntentRef.current = {
            walletAddress,
            recipient: recipientAddress,
            amount,
            asset: intentAsset,
            assetSymbol: intentAssetSymbol,
            referenceId: messageResult.referenceId,
          };

          iframe.contentWindow?.postMessage(
            {
              type: 'SIGNLESS_INTENT',
              payload: {
                walletAddress,
                recipient: recipientAddress,
                amount,
                asset: intentAsset,
                assetSymbol: intentAssetSymbol,
                referenceId: messageResult.referenceId,
                // comment?
              },
            },
            '*',
          );
        };
      });
    },
    [
      signlessConfig,
      waitForWalletConnection,
      createSignlessIframe,
      handleSignlessProtocol,
      normalizeAsset,
    ],
  );

  const initiateSignlessSetup = React.useCallback(
    async (opts?: {
      asset?: string;
      assetSymbol?: string;
      amount?: string | number;
    }): Promise<any> => {
      if (!signlessConfig) return null;

      const walletAddress = await waitForWalletConnection();
      const fallback = lastSignlessIntentRef.current;
      const setupAsset = normalizeAsset(opts?.asset ?? fallback?.asset);
      const setupAssetSymbol =
        typeof opts?.assetSymbol === 'string'
          ? opts.assetSymbol
          : typeof fallback?.assetSymbol === 'string'
            ? fallback.assetSymbol
            : undefined;
      const setupAmount = opts?.amount ?? fallback?.amount;

      const getOrCreateDeviceId = () => {
        try {
          const key = 'tpn_signless_device_id';
          const existing = window.localStorage.getItem(key);
          if (existing) return existing;
          const next =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? (crypto as any).randomUUID()
              : Math.random().toString(36).slice(2) + Date.now().toString(36);
          window.localStorage.setItem(key, next);
          return next;
        } catch {
          return Math.random().toString(36).slice(2) + Date.now().toString(36);
        }
      };

      const deviceId = getOrCreateDeviceId();

      // Create session
      let sessionId = Math.random().toString(36).substring(2);
      try {
        const sessionRes = await fetch(
          `${signlessConfig.apiUrl}/api/signless/session`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress, deviceId }),
          },
        );
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          sessionId = sessionData.sessionId;
        }
      } catch (e) {
        console.warn(
          'Failed to create session on backend, falling back to local ID',
          e,
        );
      }

      return new Promise((resolve, reject) => {
        const iframeUrl = `${signlessConfig.apiUrl}/api/signless/iframe/${sessionId}`;
        const { iframe, overlay } = createSignlessIframe(iframeUrl);

        const cleanup = () => {
          window.removeEventListener('message', messageHandler);
          overlay.remove();
        };

        const messageHandler = handleSignlessProtocol(
          iframe.contentWindow!,
          cleanup,
          resolve,
          reject,
        );

        window.addEventListener('message', messageHandler);

        iframe.onload = () => {
          iframe.contentWindow?.postMessage(
            {
              type: 'SIGNLESS_START_SETUP',
              payload: {
                walletAddress,
                walletMode: 'internal',
                asset: setupAsset,
                assetSymbol: setupAssetSymbol,
                amount: setupAmount,
              },
            },
            '*',
          );
        };
      });
    },
    [
      signlessConfig,
      waitForWalletConnection,
      createSignlessIframe,
      handleSignlessProtocol,
      normalizeAsset,
    ],
  );

  return {
    pay,
    payWithSignless,
    initiateSignlessSetup,
    address,
  };
}
