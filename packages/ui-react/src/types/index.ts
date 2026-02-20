import type {
  SendTransactionRequest,
  SendTransactionResponse,
} from '@tonconnect/sdk';
import type { CSSProperties, ReactNode } from 'react';
import type { Chain } from '@ton-pay/api';

export type { Chain };
export type TonPayPreset = 'default' | 'gradient';
export type TonPayVariant = 'long' | 'short';
export type OnRampProvider = 'moonpay';

export type TonPayMessage = SendTransactionRequest['messages'][number] & {
  payload: string;
};

export type GetMessageFn<T extends object = object> = (
  senderAddr: string,
) => Promise<{ message: TonPayMessage } & T>;

export type PayInfo<T extends object = object> = {
  message: TonPayMessage;
  txResult: SendTransactionResponse;
} & T;

export interface TonPayButtonProps {
  handlePay: () => Promise<void | any>;
  isLoading?: boolean;
  variant?: TonPayVariant;
  preset?: TonPayPreset;
  onError?: (error: unknown) => void;
  showErrorNotification?: boolean;
  bgColor?: string;
  textColor?: string;
  borderRadius?: number | string;
  fontFamily?: string;
  width?: number | string;
  height?: number | string;
  text?: string;
  loadingText?: string;
  style?: CSSProperties;
  className?: string;
  showMenu?: boolean;
  disabled?: boolean;
  amount?: number | string;
  currency?: string;
  asset?: string;
  apiKey?: string;
  isOnRampAvailable?: boolean;
  onCardPaymentSuccess?: (result?: OnRampTransactionResult) => void;
  itemTitle?: string;
  recipientWalletAddress?: string;
}

export interface OnRampTransactionResult {
  reference: string;
  status: string;
  txHash: string;
}

export interface TonPayButtonPresetConfig {
  bgColor: string;
  textColor: string;
}

export interface NotificationProps {
  title: string;
  text?: string;
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayWithCrypto: () => void;
  amount?: string;
  currency?: string;
  asset?: string;
  itemTitle?: string;
  walletAddress?: string;
  apiKey?: string;
  recipientWalletAddress?: string;
  onDisconnect?: () => void;
  fetchOnRampLink?: (
    providerId: string,
  ) => Promise<{ link: string; reference: string }>;
  onRampAvailable?: boolean;
  onPaymentSuccess?: (result?: OnRampTransactionResult) => void;
  signlessEnabled?: boolean;
  signlessApiUrl?: string;
  onSignlessSetupComplete?: (data: SignlessSetupData) => void;
  onPendingReferenceChange?: (reference: string | null) => void;
  onClearPendingTransaction?: () => void;
  network?: 'mainnet' | 'testnet';
  /** The payment function to call when balance is sufficient (new card top-up flow) */
  handlePay?: () => Promise<void | any>;
  /** User's IP address for MoonPay geo check */
  userIp?: string;
  /** MoonPay minimum buy amount (from limits check) */
  moonpayMinBuyAmount?: number;
  /** Whether to use legacy card flow (direct to merchant) — default false */
  legacyCardFlow?: boolean;
  /** Called when top-up flow is initiated/completed to show waiting indicator below button */
  onTopUpWaitingChange?: (isWaiting: boolean) => void;
}

export interface SignlessSetupData {
  publicKey: string;
  walletAddress: string;
  limit?: number;
  token?: string;
}

export type PaymentViewState =
  | 'main'
  | 'card'
  | 'confirming-card'
  | 'success'
  | 'error'
  | 'signless-setup'
  | 'signless-unlock'
  | 'insufficient-funds'
  | 'card-topup'
  | 'awaiting-deposit'
  | 'redirecting-moonpay'
  | 'topup-crypto'
  | 'topup-confirm'
  | 'ready-to-pay';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  detents?: number[];
  initialDetent?: number;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  handleClassName?: string;
  contentClassName?: string;
  enableBackdropClose?: boolean;
  enableSwipeToClose?: boolean;
  maxHeight?: number | string;
  minHeight?: number | string;
}

export interface UseMoonPayIframeOptions {
  apiKey?: string;
  chain?: Chain;
  provider?: OnRampProvider;
}

export interface SignlessConfig {
  apiUrl: string;
  iframeOrigin?: string; // defaults to apiUrl
}

export interface SignlessPaymentResult {
  success: boolean;
  txHash?: string;
  referenceId: string;
  error?: string;
  signature?: string;
  publicKey?: string;
}

export interface RegistrationStatus {
  registered: boolean;
  customerId?: number;
  pluginAddress?: string;
  pluginType?: string;
  isPluginDeployed?: boolean;
  isSignlessStopped?: boolean;
}

export interface TonProofData {
  network: string;
  publicKey: string;
  proof: {
    timestamp: number;
    domain: { lengthBytes: number; value: string };
    signature: string;
    payload: string;
    state_init?: string;
  };
}
