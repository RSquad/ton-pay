import * as React from "react";
import { useTonPay } from "../../hooks/useTonPay";
import { useSignless } from "../context";
import type {
  SignlessSetupParams,
  SignlessUnlockParams,
  SignlessPayloadParams,
  SignlessSignedPayload,
  SignlessState,
  SignlessConfig,
} from "../types";
import type { GetMessageFn, PayInfo } from "../../types";

export interface UseTonPaySignlessResult {
  pay: <T extends object = object>(
    getMessage: GetMessageFn<T>
  ) => Promise<PayInfo<T>>;
  paySignless: (
    params: SignlessPayloadParams
  ) => Promise<SignlessSignedPayload>;
  address: string;
  signless: {
    state: SignlessState;
    config: SignlessConfig;
    setup: (params: SignlessSetupParams) => Promise<void>;
    unlock: (params: SignlessUnlockParams) => Promise<void>;
    lock: () => void;
    reset: () => Promise<void>;
    updateConfig: (config: Partial<SignlessConfig>) => void;
    isBiometricAvailable: boolean;
    isEnabled: boolean;
    isSetup: boolean;
    isUnlocked: boolean;
    requiresUnlock: boolean;
  };
}

export function useTonPaySignless(): UseTonPaySignlessResult {
  const { pay, address } = useTonPay();
  const signlessContext = useSignless();

  const {
    state,
    config,
    setup,
    unlock,
    lock,
    reset,
    signPayload,
    updateConfig,
    isBiometricAvailable,
  } = signlessContext;

  const paySignless = React.useCallback(
    async (params: SignlessPayloadParams): Promise<SignlessSignedPayload> => {
      if (!config.enabled) {
        throw new Error("Signless is not enabled");
      }

      if (!state.isSetup) {
        throw new Error("Signless is not set up. Please complete setup first.");
      }

      if (!state.isUnlocked) {
        throw new Error("Signless is locked. Please unlock first.");
      }

      return signPayload(params);
    },
    [config.enabled, state.isSetup, state.isUnlocked, signPayload]
  );

  const requiresUnlock = React.useMemo(() => {
    return config.enabled && state.isSetup && !state.isUnlocked;
  }, [config.enabled, state.isSetup, state.isUnlocked]);

  return {
    pay,
    paySignless,
    address,
    signless: {
      state,
      config,
      setup,
      unlock,
      lock,
      reset,
      updateConfig,
      isBiometricAvailable,
      isEnabled: config.enabled,
      isSetup: state.isSetup,
      isUnlocked: state.isUnlocked,
      requiresUnlock,
    },
  };
}


