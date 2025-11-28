import * as React from "react";
import type { SignlessUnlockModalProps } from "../types";
import { useSignless } from "../context";
import { PinInput } from "./PinInput";
import { unlockModalStyles } from "./styles";

type UnlockView = "biometric" | "pin";

export const SignlessUnlockModal: React.FC<SignlessUnlockModalProps> = ({
  isOpen,
  onClose,
  onUnlock,
  showBiometric = true,
}) => {
  const { unlock, state, isBiometricAvailable } = useSignless();
  const [view, setView] = React.useState<UnlockView>("biometric");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const shouldShowBiometric =
    showBiometric &&
    isBiometricAvailable &&
    state.authMethod === "biometric";

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(false);
      setView(shouldShowBiometric ? "biometric" : "pin");
    }
  }, [isOpen, shouldShowBiometric]);

  React.useEffect(() => {
    if (isOpen && view === "biometric" && shouldShowBiometric) {
      handleBiometricAuth();
    }
  }, [isOpen, view]);

  const handleBiometricAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await unlock({});
      onUnlock();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Biometric authentication failed"
      );
      setView("pin");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await unlock({ pin });
      onUnlock();
      onClose();
    } catch (err) {
      setError("Invalid PIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsePinInstead = () => {
    setView("pin");
    setError(null);
  };

  if (!isOpen) return null;

  const renderBiometricPrompt = () => (
    <div style={unlockModalStyles.biometricPrompt}>
      <div style={unlockModalStyles.biometricIcon}>
        <BiometricLargeIcon />
      </div>
      <h2 style={unlockModalStyles.biometricTitle}>Unlock Signless</h2>
      <p style={unlockModalStyles.biometricSubtitle}>
        {isLoading
          ? "Authenticating..."
          : "Use Face ID or Touch ID to continue"}
      </p>

      {error && (
        <p style={{ color: "#FF5252", fontSize: "14px", marginBottom: "16px" }}>
          {error}
        </p>
      )}

      {!isLoading && (
        <>
          <button
            type="button"
            style={{
              padding: "14px 32px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: "#0098EA",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              marginBottom: "16px",
            }}
            onClick={handleBiometricAuth}
          >
            Try Again
          </button>

          {state.authMethod === "biometric" && (
            <button
              type="button"
              style={unlockModalStyles.usePinButton}
              onClick={handleUsePinInstead}
            >
              Use PIN instead
            </button>
          )}
        </>
      )}
    </div>
  );

  const renderPinInput = () => (
    <PinInput
      title="Enter PIN"
      subtitle="Enter your PIN to unlock signless payments"
      onComplete={handlePinSubmit}
      onCancel={onClose}
      error={error}
      isLoading={isLoading}
      showBiometric={shouldShowBiometric}
      onBiometricPress={() => {
        setView("biometric");
        setError(null);
      }}
    />
  );

  return (
    <div style={unlockModalStyles.container}>
      {view === "biometric" && shouldShowBiometric
        ? renderBiometricPrompt()
        : renderPinInput()}
    </div>
  );
};

const BiometricLargeIcon: React.FC = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 14.5V16.5M7 10.5C7 7.73858 9.23858 5.5 12 5.5C14.7614 5.5 17 7.73858 17 10.5V11.5M12 11.5C10.6193 11.5 9.5 12.6193 9.5 14C9.5 15.3807 10.6193 16.5 12 16.5C13.3807 16.5 14.5 15.3807 14.5 14C14.5 12.6193 13.3807 11.5 12 11.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 7V5C3 3.89543 3.89543 3 5 3H7M17 3H19C20.1046 3 21 3.89543 21 5V7M21 17V19C21 20.1046 20.1046 21 19 21H17M7 21H5C3.89543 21 3 20.1046 3 19V17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default SignlessUnlockModal;


