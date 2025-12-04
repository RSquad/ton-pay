import type { SendTransactionRequest, SendTransactionResponse } from "@tonconnect/sdk";
import type { CSSProperties, ReactNode } from "react";
import type { Chain } from "@ton-pay/api";

export type { Chain };
export type TonPayPreset = "default" | "gradient";
export type TonPayVariant = "long" | "short";
export type OnRampProvider = "moonpay";

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

export interface TonPayButtonProps {
  handlePay: (
    onRequestSent?: (redirectToWallet: () => void) => void
  ) => Promise<void>;
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
  apiKey?: string;
  isOnRampAvailable?: boolean;
  onCardPaymentSuccess?: () => void;
  itemTitle?: string;
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
  itemTitle?: string;
  walletAddress?: string;
  onDisconnect?: () => void;
  fetchOnRampLink?: (providerId: string) => Promise<string>;
  onRampAvailable?: boolean;
  onPaymentSuccess?: () => void;
  isLoading?: boolean;
}

export type PaymentViewState = "main" | "card" | "success" | "error";

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

