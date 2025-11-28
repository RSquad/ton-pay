import type { EncryptedKeyVault, WebAuthnCredentialInfo } from "./crypto";

export type SignlessAuthMethod = "pin" | "biometric" | "none";

export type SignlessStatus =
  | "disabled"
  | "not_setup"
  | "locked"
  | "unlocked"
  | "setting_up";

export interface SignlessConfig {
  enabled: boolean;
  authMethod: SignlessAuthMethod;
  autoLockTimeout?: number;
  storageKey?: string;
}

export interface SignlessState {
  status: SignlessStatus;
  isEnabled: boolean;
  isSetup: boolean;
  isUnlocked: boolean;
  authMethod: SignlessAuthMethod;
  publicKey: string | null;
  walletAddress: string | null;
}

export interface SignlessVaultData {
  vault: EncryptedKeyVault;
  authMethod: SignlessAuthMethod;
  walletAddress: string;
  webauthnCredential?: WebAuthnCredentialInfo;
  createdAt: number;
  updatedAt: number;
}

export interface SignlessSetupParams {
  authMethod: SignlessAuthMethod;
  pin?: string;
}

export interface SignlessUnlockParams {
  pin?: string;
}

export interface SignlessPayloadParams {
  recipient: string;
  amount: string;
  token?: string;
  payload?: string;
  reference?: string;
  validUntil?: number;
}

export interface SignlessSignedPayload {
  payload: Uint8Array;
  signature: Uint8Array;
  publicKey: string;
  reference: string;
  validUntil: number;
}

export interface SignlessContextValue {
  state: SignlessState;
  config: SignlessConfig;
  setup: (params: SignlessSetupParams) => Promise<void>;
  unlock: (params: SignlessUnlockParams) => Promise<void>;
  lock: () => void;
  reset: () => Promise<void>;
  signPayload: (params: SignlessPayloadParams) => Promise<SignlessSignedPayload>;
  updateConfig: (config: Partial<SignlessConfig>) => void;
  isBiometricAvailable: boolean;
}

export interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  error?: string | null;
  isLoading?: boolean;
  showBiometric?: boolean;
  onBiometricPress?: () => void;
}

export interface SignlessSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  showBiometric?: boolean;
}

export interface SignlessUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
  showBiometric?: boolean;
}


