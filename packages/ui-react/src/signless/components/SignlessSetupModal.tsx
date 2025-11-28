import * as React from "react";
import type { SignlessSetupModalProps, SignlessAuthMethod } from "../types";
import { useSignless } from "../context";
import { PinInput } from "./PinInput";
import { setupModalStyles } from "./styles";

type SetupStep = "select_method" | "create_pin" | "confirm_pin" | "biometric";

export const SignlessSetupModal: React.FC<SignlessSetupModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  showBiometric = true,
}) => {
  const { setup, isBiometricAvailable, state } = useSignless();
  const [step, setStep] = React.useState<SetupStep>("select_method");
  const [selectedMethod, setSelectedMethod] =
    React.useState<SignlessAuthMethod | null>(null);
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setStep("select_method");
      setSelectedMethod(null);
      setPin("");
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleMethodSelect = (method: SignlessAuthMethod) => {
    setSelectedMethod(method);
  };

  const handleContinue = async () => {
    if (!selectedMethod) return;

    if (selectedMethod === "biometric") {
      setIsLoading(true);
      setError(null);

      try {
        await setup({ authMethod: "biometric" });
        onComplete();
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Biometric setup failed"
        );
      } finally {
        setIsLoading(false);
      }
    } else if (selectedMethod === "pin") {
      setStep("create_pin");
    }
  };

  const handlePinCreate = (newPin: string) => {
    setPin(newPin);
    setError(null);
    setStep("confirm_pin");
  };

  const handlePinConfirm = async (confirmPin: string) => {
    if (confirmPin !== pin) {
      setError("PINs do not match. Please try again.");
      setStep("create_pin");
      setPin("");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await setup({ authMethod: "pin", pin });
      onComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setStep("create_pin");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "confirm_pin") {
      setStep("create_pin");
      setError(null);
    } else if (step === "create_pin") {
      setStep("select_method");
      setPin("");
      setError(null);
    }
  };

  if (!isOpen) return null;

  const renderStepIndicator = () => {
    const steps = selectedMethod === "pin" ? 3 : 2;
    const currentStep =
      step === "select_method" ? 1 : step === "create_pin" ? 2 : 3;

    return (
      <div style={setupModalStyles.stepIndicator}>
        {Array.from({ length: steps }, (_, i) => (
          <div
            key={i}
            style={{
              ...setupModalStyles.stepDot,
              ...(i < currentStep ? setupModalStyles.stepDotActive : {}),
            }}
          />
        ))}
      </div>
    );
  };

  const renderMethodSelection = () => (
    <>
      <div style={setupModalStyles.header}>
        <h2 style={setupModalStyles.title}>Setup Signless</h2>
        <p style={setupModalStyles.subtitle}>
          Enable fast payments without wallet confirmations. Choose your
          preferred authentication method.
        </p>
      </div>

      {renderStepIndicator()}

      <div style={setupModalStyles.methodSelector}>
        {showBiometric && isBiometricAvailable && (
          <button
            type="button"
            style={{
              ...setupModalStyles.methodButton,
              ...(selectedMethod === "biometric"
                ? setupModalStyles.methodButtonSelected
                : {}),
            }}
            onClick={() => handleMethodSelect("biometric")}
          >
            <div style={setupModalStyles.methodIcon}>
              <FaceIdIcon />
            </div>
            <div style={setupModalStyles.methodContent}>
              <h3 style={setupModalStyles.methodTitle}>Face ID / Touch ID</h3>
              <p style={setupModalStyles.methodDescription}>
                Use biometric authentication for quick and secure access
              </p>
            </div>
          </button>
        )}

        <button
          type="button"
          style={{
            ...setupModalStyles.methodButton,
            ...(selectedMethod === "pin"
              ? setupModalStyles.methodButtonSelected
              : {}),
          }}
          onClick={() => handleMethodSelect("pin")}
        >
          <div style={setupModalStyles.methodIcon}>
            <PinIcon />
          </div>
          <div style={setupModalStyles.methodContent}>
            <h3 style={setupModalStyles.methodTitle}>PIN Code</h3>
            <p style={setupModalStyles.methodDescription}>
              Create a 6-digit PIN for payment authorization
            </p>
          </div>
        </button>
      </div>

      {error && (
        <p style={{ color: "#FF5252", fontSize: "14px", marginBottom: "16px" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        style={{
          ...setupModalStyles.continueButton,
          ...(!selectedMethod ? setupModalStyles.continueButtonDisabled : {}),
        }}
        onClick={handleContinue}
        disabled={!selectedMethod || isLoading}
      >
        {isLoading ? "Setting up..." : "Continue"}
      </button>
    </>
  );

  const renderPinCreation = () => (
    <>
      {renderStepIndicator()}
      <PinInput
        title="Create PIN"
        subtitle="Enter a 6-digit PIN to secure your signless payments"
        onComplete={handlePinCreate}
        onCancel={handleBack}
        error={error}
        isLoading={isLoading}
      />
    </>
  );

  const renderPinConfirmation = () => (
    <>
      {renderStepIndicator()}
      <PinInput
        title="Confirm PIN"
        subtitle="Re-enter your PIN to confirm"
        onComplete={handlePinConfirm}
        onCancel={handleBack}
        error={error}
        isLoading={isLoading}
      />
    </>
  );

  return (
    <div style={setupModalStyles.container}>
      {step === "select_method" && renderMethodSelection()}
      {step === "create_pin" && renderPinCreation()}
      {step === "confirm_pin" && renderPinConfirmation()}
    </div>
  );
};

const FaceIdIcon: React.FC = () => (
  <svg
    width="28"
    height="28"
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

const PinIcon: React.FC = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="6"
      width="18"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="7" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="17" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

export default SignlessSetupModal;


