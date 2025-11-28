import * as React from "react";
import { useTonAddress } from "@tonconnect/ui-react";
import type {
  SignlessConfig,
  SignlessState,
  SignlessContextValue,
  SignlessSetupParams,
  SignlessUnlockParams,
  SignlessPayloadParams,
  SignlessSignedPayload,
} from "./types";
import {
  generateKeyPair,
  signMessage,
  encryptPrivateKey,
  decryptPrivateKey,
  isWebAuthnSupported,
  createWebAuthnCredential,
  getWebAuthnCredential,
  type WebAuthnCredentialInfo,
} from "./crypto";
import { SignlessStorage } from "./storage";

const DEFAULT_CONFIG: SignlessConfig = {
  enabled: false,
  authMethod: "none",
  autoLockTimeout: 5 * 60 * 1000,
  storageKey: "tonpay_signless_vault",
};

const DEFAULT_STATE: SignlessState = {
  status: "disabled",
  isEnabled: false,
  isSetup: false,
  isUnlocked: false,
  authMethod: "none",
  publicKey: null,
  walletAddress: null,
};

const SignlessContext = React.createContext<SignlessContextValue | null>(null);

interface SignlessProviderProps {
  children: React.ReactNode;
  config?: Partial<SignlessConfig>;
}

export function SignlessProvider({ children, config }: SignlessProviderProps) {
  const walletAddress = useTonAddress(true);
  const [state, setState] = React.useState<SignlessState>(DEFAULT_STATE);
  const [currentConfig, setCurrentConfig] = React.useState<SignlessConfig>({
    ...DEFAULT_CONFIG,
    ...config,
  });

  const storageRef = React.useRef(
    new SignlessStorage(currentConfig.storageKey)
  );
  const privateKeyRef = React.useRef<Uint8Array | null>(null);
  const lockTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const webauthnCredentialRef = React.useRef<WebAuthnCredentialInfo | null>(
    null
  );

  const [isBiometricAvailable, setIsBiometricAvailable] = React.useState(false);

  React.useEffect(() => {
    async function checkBiometric() {
      if (!isWebAuthnSupported()) {
        setIsBiometricAvailable(false);
        return;
      }
      try {
        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsBiometricAvailable(available);
      } catch {
        setIsBiometricAvailable(false);
      }
    }
    checkBiometric();
  }, []);

  React.useEffect(() => {
    async function loadVaultState() {
      if (!walletAddress) {
        setState({ ...DEFAULT_STATE });
        return;
      }

      if (!currentConfig.enabled) {
        setState({
          ...DEFAULT_STATE,
          status: "disabled",
          walletAddress,
        });
        return;
      }

      const vaultData = await storageRef.current.loadVault(walletAddress);

      if (!vaultData) {
        setState({
          ...DEFAULT_STATE,
          status: "not_setup",
          isEnabled: true,
          walletAddress,
        });
        return;
      }

      webauthnCredentialRef.current = vaultData.webauthnCredential || null;

      setState({
        status: "locked",
        isEnabled: true,
        isSetup: true,
        isUnlocked: false,
        authMethod: vaultData.authMethod,
        publicKey: vaultData.vault.publicKey,
        walletAddress,
      });
    }

    loadVaultState();
  }, [walletAddress, currentConfig.enabled]);

  const resetLockTimeout = React.useCallback(() => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }

    if (currentConfig.autoLockTimeout && currentConfig.autoLockTimeout > 0) {
      lockTimeoutRef.current = setTimeout(() => {
        if (privateKeyRef.current) {
          privateKeyRef.current.fill(0);
          privateKeyRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          status: "locked",
          isUnlocked: false,
        }));
      }, currentConfig.autoLockTimeout);
    }
  }, [currentConfig.autoLockTimeout]);

  const setup = React.useCallback(
    async (params: SignlessSetupParams) => {
      if (!walletAddress) {
        throw new Error("Wallet not connected");
      }

      setState((prev) => ({ ...prev, status: "setting_up" }));

      try {
        const keyPair = await generateKeyPair();
        let webauthnCredential: WebAuthnCredentialInfo | undefined;

        if (params.authMethod === "biometric") {
          webauthnCredential = await createWebAuthnCredential(walletAddress);
          webauthnCredentialRef.current = webauthnCredential;

          const signature = await getWebAuthnCredential(webauthnCredential);
          const signatureBytes = new Uint8Array(signature);
          const biometricPin = Array.from(signatureBytes.slice(0, 32))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          const vault = await encryptPrivateKey(
            keyPair.privateKey,
            keyPair.publicKey,
            biometricPin
          );

          await storageRef.current.saveVault(
            walletAddress,
            vault,
            "biometric",
            webauthnCredential
          );

          privateKeyRef.current = keyPair.privateKey;
        } else if (params.authMethod === "pin") {
          if (!params.pin) {
            throw new Error("PIN is required for PIN authentication");
          }

          const vault = await encryptPrivateKey(
            keyPair.privateKey,
            keyPair.publicKey,
            params.pin
          );

          await storageRef.current.saveVault(walletAddress, vault, "pin");

          privateKeyRef.current = keyPair.privateKey;
        } else {
          throw new Error("Invalid authentication method");
        }

        setState({
          status: "unlocked",
          isEnabled: true,
          isSetup: true,
          isUnlocked: true,
          authMethod: params.authMethod,
          publicKey: arrayBufferToBase64(keyPair.publicKey.buffer),
          walletAddress,
        });

        resetLockTimeout();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: prev.isSetup ? "locked" : "not_setup",
        }));
        throw error;
      }
    },
    [walletAddress, resetLockTimeout]
  );

  const unlock = React.useCallback(
    async (params: SignlessUnlockParams) => {
      if (!walletAddress) {
        throw new Error("Wallet not connected");
      }

      const vaultData = await storageRef.current.loadVault(walletAddress);
      if (!vaultData) {
        throw new Error("No signless vault found");
      }

      try {
        let pin: string;

        if (vaultData.authMethod === "biometric") {
          if (!vaultData.webauthnCredential) {
            throw new Error("WebAuthn credential not found");
          }

          const signature = await getWebAuthnCredential(
            vaultData.webauthnCredential
          );
          const signatureBytes = new Uint8Array(signature);
          pin = Array.from(signatureBytes.slice(0, 32))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        } else if (vaultData.authMethod === "pin") {
          if (!params.pin) {
            throw new Error("PIN is required");
          }
          pin = params.pin;
        } else {
          throw new Error("Invalid authentication method");
        }

        const privateKey = await decryptPrivateKey(vaultData.vault, pin);
        privateKeyRef.current = privateKey;

        setState((prev) => ({
          ...prev,
          status: "unlocked",
          isUnlocked: true,
        }));

        resetLockTimeout();
      } catch (error) {
        throw new Error("Failed to unlock vault");
      }
    },
    [walletAddress, resetLockTimeout]
  );

  const lock = React.useCallback(() => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }

    if (privateKeyRef.current) {
      privateKeyRef.current.fill(0);
      privateKeyRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      status: "locked",
      isUnlocked: false,
    }));
  }, []);

  const reset = React.useCallback(async () => {
    if (!walletAddress) return;

    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }

    if (privateKeyRef.current) {
      privateKeyRef.current.fill(0);
      privateKeyRef.current = null;
    }

    webauthnCredentialRef.current = null;

    await storageRef.current.deleteVault(walletAddress);

    setState({
      ...DEFAULT_STATE,
      status: currentConfig.enabled ? "not_setup" : "disabled",
      isEnabled: currentConfig.enabled,
      walletAddress,
    });
  }, [walletAddress, currentConfig.enabled]);

  const signPayload = React.useCallback(
    async (params: SignlessPayloadParams): Promise<SignlessSignedPayload> => {
      if (!privateKeyRef.current) {
        throw new Error("Signless is locked. Please unlock first.");
      }

      if (!state.publicKey) {
        throw new Error("Public key not available");
      }

      resetLockTimeout();

      const reference = params.reference || generateReference();
      const validUntil = params.validUntil || Math.floor(Date.now() / 1000) + 300;

      const payloadData = {
        recipient: params.recipient,
        amount: params.amount,
        token: params.token || "TON",
        payload: params.payload || "",
        reference,
        validUntil,
      };

      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(JSON.stringify(payloadData));

      const signature = await signMessage(privateKeyRef.current, payloadBytes);

      return {
        payload: payloadBytes,
        signature,
        publicKey: state.publicKey,
        reference,
        validUntil,
      };
    },
    [state.publicKey, resetLockTimeout]
  );

  const updateConfig = React.useCallback(
    (newConfig: Partial<SignlessConfig>) => {
      setCurrentConfig((prev) => ({ ...prev, ...newConfig }));
    },
    []
  );

  React.useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      if (privateKeyRef.current) {
        privateKeyRef.current.fill(0);
        privateKeyRef.current = null;
      }
    };
  }, []);

  const contextValue: SignlessContextValue = {
    state,
    config: currentConfig,
    setup,
    unlock,
    lock,
    reset,
    signPayload,
    updateConfig,
    isBiometricAvailable,
  };

  return (
    <SignlessContext.Provider value={contextValue}>
      {children}
    </SignlessContext.Provider>
  );
}

export function useSignless(): SignlessContextValue {
  const context = React.useContext(SignlessContext);
  if (!context) {
    throw new Error("useSignless must be used within a SignlessProvider");
  }
  return context;
}

function generateReference(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function arrayBufferToBase64(buffer: ArrayBuffer | SharedArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}


