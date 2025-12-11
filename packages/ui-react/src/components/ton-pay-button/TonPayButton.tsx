import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import type { TonPayButtonProps } from '../../types';
import { classNames, toCssSize, getUserIp } from '../../utils';
import { TonIcon, DisconnectIcon } from '../icons';
import {
  NotificationRoot,
  ErrorTransactionNotification,
} from '../notification';
import { PaymentModal } from '../payment-modal/PaymentModal';
import { useMoonPayIframe } from '../../hooks/useMoonPayIframe';
import { PRESETS, injectStyles } from './styles';

injectStyles();

export const TonPayButton: React.FC<TonPayButtonProps> = ({
  handlePay,
  isLoading = false,
  variant = 'long',
  preset,
  bgColor,
  textColor,
  borderRadius = 8,
  fontFamily = 'inherit',
  width = 300,
  height = 44,
  text,
  loadingText = 'Processing...',
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

  const [showMenu, setShowMenu] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [onRampAvailable, setOnRampAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [userIp, setUserIp] = useState('');
  // We store the redirectToWallet function from ton-connect's onRequestSent callback
  // This allows us to manually trigger the wallet redirect when the user clicks "Click here",
  // which is necessary when automatic redirection fails due to platform limitations.
  const [redirectToWallet, setRedirectToWallet] = useState<(() => void) | null>(
    null,
  );

  const { checkAvailability, fetchOnRampLink } = useMoonPayIframe({
    apiKey,
    chain: 'mainnet',
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
            typeof amount === 'string' ? parseFloat(amount) : amount || 0;
          const available = await checkAvailability(
            parsedAmount,
            currency || 'TON',
            userIp,
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && !(event.target as Element).closest('.tp-wrap')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleDisconnect = useCallback(() => {
    tonConnectUI.disconnect();
  }, [tonConnectUI]);

  const handlePayWithCrypto = useCallback(async () => {
    // We keep the modal open to show processing state
    try {
      setRedirectToWallet(null);
      await handlePay((redirect) => setRedirectToWallet(() => redirect));
      // If success, we can close it or wait for parent to update state
      // setIsModalOpen(false);
    } catch (err) {
      onError?.(err);
      if (showErrorNotification) {
        const raw =
          typeof err === 'object' && err && 'message' in err
            ? String((err as Error).message)
            : String(err ?? '');
        setErrorMessage(raw || 'Wallet connection modal closed');
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

  const handleRetry = useCallback(() => {
    handlePayWithCrypto();
  }, [handlePayWithCrypto]);

  const handleFetchOnRampLink = useCallback(
    async (_providerId: string) => {
      return fetchOnRampLink({
        amount: typeof amount === 'string' ? parseFloat(amount) : amount || 0,
        asset: currency || 'TON',
        recipientAddr: address,
        userIp,
        redirectURL: '',
      });
    },
    [fetchOnRampLink, amount, currency, address, userIp],
  );

  const presetConfig = preset ? PRESETS[preset] : null;
  const finalBgColor =
    bgColor ?? presetConfig?.bgColor ?? PRESETS.default.bgColor;
  const finalTextColor =
    textColor ?? presetConfig?.textColor ?? PRESETS.default.textColor;

  const cssVars: Record<string, string | number | undefined> = {
    '--tp-bg': finalBgColor,
    '--tp-text': finalTextColor,
    '--tp-radius':
      typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    '--tp-font': fontFamily,
    '--tp-width': toCssSize(width),
    '--tp-height': toCssSize(height),
  };

  const isDisabled = isLoading || disabled || internalLoading;
  const showDropdown = !onRampAvailable && !!address && !isLoading;

  const renderContent = () => {
    if (text) return <span>{text}</span>;

    if (variant === 'short') {
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
      className={classNames('tp-wrap', className)}
    >
      <div className="tp-btn-container">
        <button
          type="button"
          className={classNames(
            'tp-btn',
            isLoading && 'processing',
            isLoading && 'loading',
            showDropdown ? 'with-menu' : 'no-menu',
          )}
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
        {showDropdown && (
          <button
            type="button"
            className="tp-arrow"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            disabled={isDisabled}
          >
            ▼
          </button>
        )}
      </div>

      {isLoading && (
        <div className="tp-retry-text">
          Did the wallet fail to open?{' '}
          <span
            className="tp-retry-link"
            onClick={() =>
              redirectToWallet ? redirectToWallet() : handleRetry()
            }
          >
            Click here
          </span>
          .
        </div>
      )}

      {showMenu && showDropdown && (
        <div className="tp-menu">
          <div className="tp-menu-arrow" />
          <div className="tp-menu-address">
            {address?.slice(0, 4)}...{address?.slice(-4)}
          </div>
          <button
            className="tp-menu-item danger"
            onClick={() => {
              handleDisconnect();
              setShowMenu(false);
            }}
          >
            <div className="tp-menu-icon">
              <DisconnectIcon size={16} />
            </div>
            <span>Disconnect</span>
          </button>
        </div>
      )}

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPayWithCrypto={handlePayWithCrypto}
        walletAddress={address}
        onDisconnect={handleDisconnect}
        amount={amount ? String(amount) : '0.1'}
        currency={currency || 'TON'}
        itemTitle={itemTitle}
        fetchOnRampLink={handleFetchOnRampLink}
        onRampAvailable={onRampAvailable}
        onPaymentSuccess={onCardPaymentSuccess}
        isLoading={isLoading}
      />

      {errorMessage && (
        <NotificationRoot>
          <ErrorTransactionNotification text={errorMessage} />
        </NotificationRoot>
      )}
    </div>
  );
};
