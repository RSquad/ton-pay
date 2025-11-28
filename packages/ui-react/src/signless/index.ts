export { SignlessProvider, useSignless } from "./context";

export { useTonPaySignless, useSignlessModal } from "./hooks";
export type {
  UseTonPaySignlessResult,
  UseSignlessModalResult,
  SignlessModalType,
} from "./hooks";

export {
  PinInput,
  SignlessSetupModal,
  SignlessUnlockModal,
} from "./components";

export {
  generateKeyPair,
  signMessage,
  verifySignlessSignature,
  encryptPrivateKey,
  decryptPrivateKey,
  isWebAuthnSupported,
  createWebAuthnCredential,
  getWebAuthnCredential,
} from "./crypto";
export type { EncryptedKeyVault, WebAuthnCredentialInfo } from "./crypto";

export { SignlessStorage, signlessStorage } from "./storage";

export type {
  SignlessAuthMethod,
  SignlessStatus,
  SignlessConfig,
  SignlessState,
  SignlessVaultData,
  SignlessSetupParams,
  SignlessUnlockParams,
  SignlessPayloadParams,
  SignlessSignedPayload,
  SignlessContextValue,
  PinInputProps,
  SignlessSetupModalProps,
  SignlessUnlockModalProps,
} from "./types";


