import * as React from "react";
import type { PinInputProps } from "../types";
import { pinInputStyles } from "./styles";

const PIN_LENGTH = 6;

export const PinInput: React.FC<PinInputProps> = ({
  length = PIN_LENGTH,
  onComplete,
  onCancel,
  title = "Enter PIN",
  subtitle,
  error,
  isLoading = false,
  showBiometric = false,
  onBiometricPress,
}) => {
  const [pin, setPin] = React.useState<string>("");
  const [shake, setShake] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (error) {
      setShake(true);
      setPin("");
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, length);
    setPin(value);

    if (value.length === length) {
      onComplete(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
  };

  const handleDotClick = () => {
    inputRef.current?.focus();
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length >= length || isLoading) return;

    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === length) {
      onComplete(newPin);
    }
  };

  const handleBackspace = () => {
    if (isLoading) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div style={pinInputStyles.container}>
      <style>{keyframes}</style>

      <div style={pinInputStyles.header}>
        <h2 style={pinInputStyles.title}>{title}</h2>
        {subtitle && <p style={pinInputStyles.subtitle}>{subtitle}</p>}
      </div>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={pin}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        maxLength={length}
        autoComplete="off"
        style={pinInputStyles.hiddenInput}
        disabled={isLoading}
      />

      <div
        style={{
          ...pinInputStyles.dotsContainer,
          ...(shake ? pinInputStyles.dotsContainerShake : {}),
        }}
        onClick={handleDotClick}
      >
        {Array.from({ length }, (_, i) => (
          <div
            key={i}
            style={{
              ...pinInputStyles.dot,
              ...(i < pin.length ? pinInputStyles.dotFilled : {}),
              ...(isLoading ? pinInputStyles.dotLoading : {}),
            }}
          />
        ))}
      </div>

      {error && <p style={pinInputStyles.error}>{error}</p>}

      <div style={pinInputStyles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            type="button"
            style={pinInputStyles.keypadButton}
            onClick={() => handleKeyPress(String(digit))}
            disabled={isLoading}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor =
                "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor =
                "transparent";
            }}
          >
            {digit}
          </button>
        ))}

        <div style={pinInputStyles.keypadButtonEmpty}>
          {showBiometric && onBiometricPress && (
            <button
              type="button"
              style={pinInputStyles.biometricButton}
              onClick={onBiometricPress}
              disabled={isLoading}
              aria-label="Use biometric authentication"
            >
              <BiometricIcon />
            </button>
          )}
        </div>

        <button
          type="button"
          style={pinInputStyles.keypadButton}
          onClick={() => handleKeyPress("0")}
          disabled={isLoading}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor =
              "rgba(255, 255, 255, 0.1)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor =
              "transparent";
          }}
        >
          0
        </button>

        <button
          type="button"
          style={pinInputStyles.backspaceButton}
          onClick={handleBackspace}
          disabled={isLoading || pin.length === 0}
          aria-label="Backspace"
        >
          <BackspaceIcon />
        </button>
      </div>

      {onCancel && (
        <button
          type="button"
          style={pinInputStyles.cancelButton}
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
      )}
    </div>
  );
};

const BiometricIcon: React.FC = () => (
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

const BackspaceIcon: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.00195 7L4.00195 12L9.00195 17M19.002 7H8.00195L4.00195 12L8.00195 17H19.002C19.5325 17 20.0412 16.7893 20.4163 16.4142C20.7914 16.0391 21.002 15.5304 21.002 15V9C21.002 8.46957 20.7914 7.96086 20.4163 7.58579C20.0412 7.21071 19.5325 7 19.002 7Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 10L10 14M10 10L14 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const keyframes = `
  @keyframes tonpay-pin-shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }
  @keyframes tonpay-pin-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

export default PinInput;


