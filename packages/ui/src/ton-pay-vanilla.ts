import { TonConnectUI } from "@tonconnect/ui";

export interface TonPayClientOptions {
  manifestUrl: string;
  connectTimeoutMs?: number;
}

export interface TransactionMessage {
  address: string;
  amount: string;
  payload?: string;
}

export interface GetMessageResult {
  message: TransactionMessage;
  bodyBase64Hash: string;
  reference: string;
}

export interface PayResult extends GetMessageResult {
  txResult: unknown;
}

export class TonPayClient {
  private tonConnectUI: TonConnectUI;
  private connectTimeoutMs: number;

  constructor(opts: TonPayClientOptions) {
    this.tonConnectUI = new TonConnectUI({ manifestUrl: opts.manifestUrl });
    this.connectTimeoutMs = opts.connectTimeoutMs ?? 5 * 60 * 1000;
  }

  get address(): string | null {
    return this.tonConnectUI?.account?.address ?? null;
  }

  waitForWalletConnection(): Promise<string> {
    if (this.address) return Promise.resolve(this.address);
    return new Promise((resolve, reject) => {
      const unsubscribe = this.tonConnectUI.onStatusChange((wallet: any) => {
        if (wallet && wallet.account) {
          clearTimeout(timer);
          unsubscribe();
          unsubscribeModal();
          resolve(wallet.account.address);
        }
      });
      const unsubscribeModal = this.tonConnectUI.onModalStateChange((state: any) => {
        if (state.status === "closed") {
          clearTimeout(timer);
          unsubscribe();
          unsubscribeModal();
          reject(new Error("Wallet connection modal closed"));
        }
      });
      this.tonConnectUI.openModal();
      const timer = setTimeout(() => {
        unsubscribe();
        unsubscribeModal();
        reject(new Error("Wallet connection timeout"));
      }, this.connectTimeoutMs);
    });
  }

  async pay(getMessage: (senderAddr: string) => Promise<GetMessageResult>): Promise<PayResult> {
    const walletAddress = await this.waitForWalletConnection();
    const validUntil = Math.floor(Date.now() / 1e3) + 5 * 60;
    const messageResult = await getMessage(walletAddress);
    const txResult = await this.tonConnectUI.sendTransaction({
      messages: [messageResult.message],
      validUntil,
      from: walletAddress,
    });
    return { ...messageResult, txResult };
  }

  async disconnect(): Promise<void> {
    await this.tonConnectUI.disconnect();
  }
}

export function createTonPay(opts: TonPayClientOptions): TonPayClient {
  return new TonPayClient(opts);
}

if (typeof window !== 'undefined') {
  (window as any).createTonPay = createTonPay;
  (window as any).TonPayClient = TonPayClient;
}

