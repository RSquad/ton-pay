import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import type { TonPayButtonProps } from "../../types";
import { classNames, toCssSize, getUserIp } from "../../utils";
import { TonIcon } from "../icons";
import { NotificationRoot, ErrorTransactionNotification } from "../notification";
import { PaymentModal } from "../payment-modal/PaymentModal";
import { useMoonPayIframe } from "../../hooks/useMoonPayIframe";
import { PRESETS, injectStyles } from "./styles";

injectStyles();

export const TonPayButton: React.FC<TonPayButtonProps> = ({
  handlePay,
  isLoading = false,
  variant = "long",
  preset,
  bgColor,
  textColor,
  borderRadius = 8,
  fontFamily = "inherit",
  width = 300,
  height = 44,
  text,
  loadingText = "Processing...",
  style,
  className,
  disabled = false,
  onError,
  showErrorNotification = true,
  amount,
  currency,
  apiKey,
  isOnRampAvailable = false,
  onCardPaymentSuccess,
  itemTitle,
}) => {
  const address = useTonAddress(true);
  const [tonConnectUI] = useTonConnectUI();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [onRampAvailable, setOnRampAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [userIp, setUserIp] = useState("");

  const { checkAvailability, fetchOnRampLink } = useMoonPayIframe({
    apiKey,
    chain: "mainnet",
  });

  useEffect(() => {
    getUserIp().then(setUserIp);
  }, []);

  useEffect(() => {
    if (!errorMessage) return;
    const timerId = setTimeout(() => setErrorMessage(null), 3000);
    return () => clearTimeout(timerId);
  }, [errorMessage]);

  useEffect(() => {
    let isActive = true;

    const check = async () => {
      if (isOnRampAvailable && apiKey && userIp) {
        setInternalLoading(true);
        try {
          const parsedAmount =
            typeof amount === "string" ? parseFloat(amount) : amount || 0;
          const available = await checkAvailability(
            parsedAmount,
            currency || "TON",
            userIp
          );
          if (isActive) setOnRampAvailable(available);
        } catch {
          if (isActive) setOnRampAvailable(false);
        } finally {
          if (isActive) setInternalLoading(false);
        }
      } else {
        if (isActive) setOnRampAvailable(false);
      }
    };

    check();
    return () => {
      isActive = false;
    };
  }, [apiKey, amount, currency, isOnRampAvailable, checkAvailability, userIp]);

  const handleDisconnect = useCallback(() => {
    tonConnectUI.disconnect();
  }, [tonConnectUI]);

  const handlePayWithCrypto = useCallback(async () => {
    setIsModalOpen(false);
    try {
      await handlePay();
    } catch (err) {
      onError?.(err);
      if (showErrorNotification) {
        const raw =
          typeof err === "object" && err && "message" in err
            ? String((err as Error).message)
            : String(err ?? "");
        setErrorMessage(raw || "Wallet connection modal closed");
      }
    }
  }, [handlePay, onError, showErrorNotification]);

  const onPayClick = useCallback(async () => {
    if (onRampAvailable) {
      setIsModalOpen(true);
    } else {
      handlePayWithCrypto();
    }
  }, [onRampAvailable, handlePayWithCrypto]);

  const handleFetchOnRampLink = useCallback(
    async (_providerId: string) => {
      return fetchOnRampLink({
        amount:
          typeof amount === "string" ? parseFloat(amount) : amount || 0,
        asset: currency || "TON",
        recipientAddr: address,
        userIp,
        redirectURL: "",
      });
    },
    [fetchOnRampLink, amount, currency, address, userIp]
  );

  const presetConfig = preset ? PRESETS[preset] : null;
  const finalBgColor = bgColor ?? presetConfig?.bgColor ?? PRESETS.default.bgColor;
  const finalTextColor =
    textColor ?? presetConfig?.textColor ?? PRESETS.default.textColor;

  const cssVars: Record<string, string | number | undefined> = {
    "--tp-bg": finalBgColor,
    "--tp-text": finalTextColor,
    "--tp-radius":
      typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
    "--tp-font": fontFamily,
    "--tp-width": toCssSize(width),
    "--tp-height": toCssSize(height),
  };

  const isDisabled = isLoading || disabled || internalLoading;

  const renderContent = () => {
    if (text) return <span>{text}</span>;
    
    if (variant === "short") {
      return (
        <div className="tp-btn-content">
          <TonIcon />
          <span>Pay</span>
        </div>
      );
    }

    return (
      <div className="tp-btn-content">
        <span>Pay with</span>
        <TonIcon />
        <span>Pay</span>
      </div>
    );
  };

  return (
    <div
      style={{ ...cssVars, ...style } as React.CSSProperties}
      className={classNames("tp-wrap", className)}
    >
      <div className="tp-btn-container">
        <button
          type="button"
          className={classNames("tp-btn", isLoading && "loading", "no-menu")}
          onClick={isDisabled ? undefined : onPayClick}
          disabled={isDisabled}
        >
          {isLoading ? (
            <div className="tp-btn-content">
              <span className="tp-spinner" />
              <span>{loadingText}</span>
            </div>
          ) : (
            renderContent()
          )}
        </button>
      </div>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPayWithCrypto={handlePayWithCrypto}
        walletAddress={address}
        onDisconnect={handleDisconnect}
        amount={amount ? String(amount) : "0.1"}
        currency={currency || "TON"}
        itemTitle={itemTitle}
        fetchOnRampLink={handleFetchOnRampLink}
        onRampAvailable={onRampAvailable}
        onPaymentSuccess={onCardPaymentSuccess}
      />

      {errorMessage && (
        <NotificationRoot>
          <ErrorTransactionNotification text={errorMessage} />
        </NotificationRoot>
      )}
    </div>
  );
};

