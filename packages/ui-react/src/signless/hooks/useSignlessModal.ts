import * as React from "react";
import { useSignless } from "../context";

export type SignlessModalType = "setup" | "unlock" | null;

export interface UseSignlessModalResult {
  modalType: SignlessModalType;
  isOpen: boolean;
  openSetup: () => void;
  openUnlock: () => void;
  close: () => void;
  onSetupComplete: () => void;
  onUnlockComplete: () => void;
}

export function useSignlessModal(): UseSignlessModalResult {
  const { state, config } = useSignless();
  const [modalType, setModalType] = React.useState<SignlessModalType>(null);

  const openSetup = React.useCallback(() => {
    if (!config.enabled) {
      console.warn("Signless is not enabled");
      return;
    }
    setModalType("setup");
  }, [config.enabled]);

  const openUnlock = React.useCallback(() => {
    if (!config.enabled) {
      console.warn("Signless is not enabled");
      return;
    }
    if (!state.isSetup) {
      console.warn("Signless is not set up");
      return;
    }
    setModalType("unlock");
  }, [config.enabled, state.isSetup]);

  const close = React.useCallback(() => {
    setModalType(null);
  }, []);

  const onSetupComplete = React.useCallback(() => {
    setModalType(null);
  }, []);

  const onUnlockComplete = React.useCallback(() => {
    setModalType(null);
  }, []);

  return {
    modalType,
    isOpen: modalType !== null,
    openSetup,
    openUnlock,
    close,
    onSetupComplete,
    onUnlockComplete,
  };
}


