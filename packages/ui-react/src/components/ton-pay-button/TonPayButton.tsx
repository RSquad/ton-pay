import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import type {
  TonPayButtonProps,
  SignlessSetupData,
  OnRampTransactionResult,
} from '../../types';
import { classNames, toCssSize, getUserIp } from '../../utils';
import { TonIcon } from '../icons';
import {
  NotificationRoot,
  ErrorTransactionNotification,
} from '../notification';
import { PaymentModal } from '../payment-modal/PaymentModal';
import { useMoonPayIframe } from '../../hooks/useMoonPayIframe';
import { PRESETS, injectStyles } from './styles';

injectStyles();

export interface TonPayButtonExtendedProps extends TonPayButtonProps {
  asset?: string;
  signlessEnabled?: boolean;
  signlessApiUrl?: string;
  signlessWalletConnection?: 'iframe' | 'merchant';
  network?: 'mainnet' | 'testnet';
}

interface PaymentStatusInfo {
  status?: string;
  txHash?: string;
  senderAddr?: string;
  recipientAddr?: string;
  date?: string;
}

interface PendingDetails {
  amount: number;
  asset: string;
  startedAt: Date;
  merchant: string;
}

export const TonPayButton: React.FC<TonPayButtonExtendedProps> = ({
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
  style,
  className,
  disabled = false,
  onError,
  showErrorNotification = true,
  amount,
  currency,
  asset,
  apiKey,
  isOnRampAvailable = true,
  onCardPaymentSuccess,
  itemTitle,
  signlessEnabled = false,
  signlessApiUrl = '',
  signlessWalletConnection = 'merchant',
  recipientWalletAddress,
  network = 'mainnet',
}) => {
  const rawAddress = useTonAddress(true);
  const [tonConnectUI] = useTonConnectUI();

  const address =
    signlessWalletConnection === 'iframe' ? undefined : rawAddress;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [onRampAvailable, setOnRampAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [userIp, setUserIp] = useState('');
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [showOngoingTxModal, setShowOngoingTxModal] = useState(false);

  const [isWaitingForTopUp, setIsWaitingForTopUp] = useState(false);

  const [pendingDetails, setPendingDetails] = useState<PendingDetails | null>(
    null,
  );
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [completedTxInfo, setCompletedTxInfo] =
    useState<PaymentStatusInfo | null>(null);

  const { checkAvailability, checkAvailabilityWithLimits, fetchOnRampLink } =
    useMoonPayIframe({
      apiKey,
      chain: network,
    });

  const [moonpayMinBuyAmount, setMoonpayMinBuyAmount] = useState<
    number | undefined
  >(undefined);

  useEffect(() => {
    getUserIp().then(setUserIp);
  }, []);

  useEffect(() => {
    if (!errorMessage) return;
    const timerId = setTimeout(() => setErrorMessage(null), 3000);
    return () => clearTimeout(timerId);
  }, [errorMessage]);

  const PENDING_TX_KEY = 'tonpay_pending_moonpay_reference';
  const LAST_TX_KEY = 'tonpay_last_transaction_reference';
  const EXPIRY_MS = 5 * 60 * 1000;

  useEffect(() => {
    if (pendingReference && pendingDetails) {
      localStorage.setItem(
        PENDING_TX_KEY,
        JSON.stringify({
          reference: pendingReference,
          details: pendingDetails,
          createdAt: pendingDetails.startedAt.getTime(),
        }),
      );
    }
  }, [pendingReference, pendingDetails]);

  useEffect(() => {
    if (pendingReference && !pendingDetails) {
      setIsPendingModalOpen(false);
      setIsCompletedModalOpen(false);
      setPendingDetails({
        amount: typeof amount === 'string' ? parseFloat(amount) : amount || 0,
        asset: asset || currency || 'TON',
        startedAt: new Date(),
        merchant: itemTitle || 'Merchant',
      });
    }
  }, [pendingReference, pendingDetails, amount, asset, currency, itemTitle]);

  useEffect(() => {
    const storedData = localStorage.getItem(PENDING_TX_KEY);
    if (!storedData) return;

    try {
      const parsed = JSON.parse(storedData);
      if (!parsed?.reference) return;

      const startedAtMs =
        typeof parsed?.details?.startedAt === 'string' ||
        typeof parsed?.details?.startedAt === 'number'
          ? new Date(parsed.details.startedAt).getTime()
          : typeof parsed?.createdAt === 'number'
            ? parsed.createdAt
            : Date.now();

      const isExpired = Date.now() - startedAtMs > EXPIRY_MS;

      if (!isExpired) {
        sessionStorage.setItem('tonpay_was_page_reload', 'true');
        setPendingReference(parsed.reference);

        if (parsed.details) {
          setPendingDetails({
            ...parsed.details,
            startedAt: new Date(
              parsed.details.startedAt || parsed.createdAt || Date.now(),
            ),
          });
        }
        return;
      }

      // Expired: move into "last tx to check" so we can do a one-time status check on next load.
      localStorage.setItem(
        LAST_TX_KEY,
        JSON.stringify({
          reference: parsed.reference,
          details: parsed.details,
          createdAt: parsed.createdAt ?? startedAtMs,
          movedAt: Date.now(),
        }),
      );
      localStorage.removeItem(PENDING_TX_KEY);
    } catch {
      localStorage.removeItem(PENDING_TX_KEY);
    }
  }, []);

  // After pending expires we do a single check on next page visit to see if it completed.
  useEffect(() => {
    const storedLast = localStorage.getItem(LAST_TX_KEY);
    if (!storedLast) return;

    let ref: string | null = null;
    try {
      const parsed = JSON.parse(storedLast);
      ref = typeof parsed?.reference === 'string' ? parsed.reference : null;
    } catch {
      localStorage.removeItem(LAST_TX_KEY);
      return;
    }

    if (!ref) {
      localStorage.removeItem(LAST_TX_KEY);
      return;
    }

    if (!apiKey || !signlessApiUrl) return;

    let isCancelled = false;

    const checkOnce = async () => {
      try {
        const response = await fetch(
          `${signlessApiUrl}/api/merchant/v1/transfer?reference=${encodeURIComponent(ref!)}`,
          { headers: apiKey ? { 'x-api-key': apiKey } : {} },
        );

        if (!response.ok) return;
        const data = await response.json();
        if (isCancelled) return;

        if (data?.status === 'success') {
          setCompletedTxInfo({
            status: data.status,
            txHash: data.txHash,
            senderAddr: data.senderAddr,
            recipientAddr: data.recipientAddr,
            date: data.date,
          });
        }
      } catch {
      } finally {
        localStorage.removeItem(LAST_TX_KEY);
      }
    };

    checkOnce();

    return () => {
      isCancelled = true;
    };
  }, [LAST_TX_KEY, apiKey, signlessApiUrl]);

  const handleInternalPaymentSuccess = useCallback(
    (result: OnRampTransactionResult, info?: PaymentStatusInfo) => {
      setIsModalOpen(false);
      setShowOngoingTxModal(false);
      localStorage.removeItem(PENDING_TX_KEY);

      setPendingReference(null);
      setPendingDetails(null);

      const wasPageReload =
        sessionStorage.getItem('tonpay_was_page_reload') === 'true';

      setCompletedTxInfo({
        status: info?.status ?? result.status,
        txHash: info?.txHash ?? result.txHash,
        senderAddr: info?.senderAddr,
        recipientAddr: info?.recipientAddr,
        date: info?.date,
      });

      if (!wasPageReload) {
        setIsCompletedModalOpen(true);
        onCardPaymentSuccess?.(result);
      }

      sessionStorage.removeItem('tonpay_was_page_reload');
    },
    [onCardPaymentSuccess],
  );

  useEffect(() => {
    if (!pendingReference || !apiKey || !signlessApiUrl) return;

    const POLL_INTERVAL = 3000;
    let isCancelled = false;

    const pollForTransaction = async () => {
      let startTime = Date.now();
      if (pendingDetails?.startedAt) {
        startTime = pendingDetails.startedAt.getTime();
      }

      while (!isCancelled) {
        const isExpired = Date.now() - startTime > EXPIRY_MS;
        if (isExpired) {
          try {
            localStorage.setItem(
              LAST_TX_KEY,
              JSON.stringify({
                reference: pendingReference,
                details: pendingDetails,
                createdAt: startTime,
                expiredAt: Date.now(),
              }),
            );
          } catch {}
          localStorage.removeItem(PENDING_TX_KEY);
          if (!isCancelled) {
            setPendingReference(null);
            setPendingDetails(null);
          }
          return;
        }

        try {
          const response = await fetch(
            `${signlessApiUrl}/api/merchant/v1/transfer?reference=${encodeURIComponent(pendingReference)}`,
            { headers: apiKey ? { 'x-api-key': apiKey } : {} },
          );

          if (response.ok) {
            const data = await response.json();

            if (!isCancelled) {
              const info: PaymentStatusInfo = {
                status: data.status,
                txHash: data.txHash,
                senderAddr: data.senderAddr,
                recipientAddr: data.recipientAddr,
                date: data.date,
              };
              if (data.status === 'success') {
                handleInternalPaymentSuccess(
                  {
                    reference: data.reference || pendingReference,
                    status: data.status || 'success',
                    txHash: data.txHash || '',
                  },
                  info,
                );
                return;
              }
            }
          } else {
          }
        } catch (e) {
          console.error('[TonPayButton] Error polling for pending tx', e);
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
    };

    pollForTransaction();

    return () => {
      isCancelled = true;
    };
  }, [
    pendingReference,
    apiKey,
    signlessApiUrl,
    pendingDetails,
    handleInternalPaymentSuccess,
  ]);

  useEffect(() => {
    let isActive = true;

    const check = async () => {
      if (isOnRampAvailable && userIp) {
        setInternalLoading(true);
        try {
          const parsedAmount =
            typeof amount === 'string' ? parseFloat(amount) : amount || 0;
          const result = await checkAvailabilityWithLimits(
            parsedAmount,
            currency || 'TON',
            userIp,
          );
          if (isActive) {
            setOnRampAvailable(result.available);
            if (result.minBuyAmount != null) {
              setMoonpayMinBuyAmount(result.minBuyAmount);
            }
          }
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
  }, [
    amount,
    currency,
    isOnRampAvailable,
    checkAvailabilityWithLimits,
    userIp,
    network,
  ]);

  const handleDisconnect = useCallback(() => {
    tonConnectUI.disconnect();
  }, [tonConnectUI]);

  const handlePayWithCrypto = useCallback(async () => {
    setIsModalOpen(false);

    setPendingReference(null);
    setPendingDetails(null);
    setIsPendingModalOpen(false);
    setIsCompletedModalOpen(false);
    setCompletedTxInfo(null);
    localStorage.removeItem(PENDING_TX_KEY);
    sessionStorage.removeItem('tonpay_was_page_reload');

    try {
      const result = await handlePay();
      if (result && result.reference) {
        setPendingReference(result.reference);
        setPendingDetails({
          amount: typeof amount === 'string' ? parseFloat(amount) : amount || 0,
          asset: asset || currency || 'TON',
          startedAt: new Date(),
          merchant: itemTitle || 'Merchant',
        });
      }
    } catch (err) {
      setPendingReference(null);
      setPendingDetails(null);
      localStorage.removeItem(PENDING_TX_KEY);

      onError?.(err);
      if (showErrorNotification) {
        const raw =
          typeof err === 'object' && err && 'message' in err
            ? String((err as Error).message)
            : String(err ?? '');
        setErrorMessage(raw || 'Wallet connection modal closed');
      }
    }
  }, [
    handlePay,
    onError,
    showErrorNotification,
    amount,
    asset,
    currency,
    itemTitle,
  ]);

  const handleSignlessSetupComplete = useCallback((data: SignlessSetupData) => {
    if (data.walletAddress) {
      const storageKey = `signless_setup_${data.walletAddress}`;
      localStorage.setItem(storageKey, 'true');
    }
  }, []);

  const onPayClick = useCallback(async () => {
    if (isLoading || pendingReference) {
      setShowOngoingTxModal(true);
      return;
    }
    // New card top-up flow: always open modal for balance check + auto-pay
    // Modal handles: balance check → if sufficient: auto-pay, if not: show top-up options
    setIsModalOpen(true);
  }, [isLoading, pendingReference]);

  const handleConfirmNewTransaction = useCallback(() => {
    setShowOngoingTxModal(false);
    setIsModalOpen(true);
  }, []);

  const handleFetchOnRampLink = useCallback(
    async (_providerId: string) => {
      return fetchOnRampLink({
        amount: typeof amount === 'string' ? parseFloat(amount) : amount || 0,
        asset: currency || 'TON',
        recipientAddr: recipientWalletAddress,
        userIp,
        redirectURL: '',
      });
    },
    [
      fetchOnRampLink,
      amount,
      currency,
      address,
      recipientWalletAddress,
      userIp,
    ],
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

  const isDisabled = disabled || internalLoading;

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
          className={classNames('tp-btn', 'no-menu')}
          onClick={isDisabled ? undefined : onPayClick}
          disabled={isDisabled}
        >
          {renderContent()}
        </button>
      </div>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPayWithCrypto={handlePayWithCrypto}
        walletAddress={rawAddress}
        onDisconnect={handleDisconnect}
        amount={amount ? String(amount) : '0.1'}
        currency={currency || 'TON'}
        asset={asset}
        itemTitle={itemTitle}
        fetchOnRampLink={handleFetchOnRampLink}
        onRampAvailable={onRampAvailable}
        onPaymentSuccess={(result) => {
          if (result) {
            handleInternalPaymentSuccess(result, {
              status: result.status,
              txHash: result.txHash,
            });
          } else {
            onCardPaymentSuccess?.();
          }
        }}
        signlessEnabled={signlessEnabled}
        signlessApiUrl={signlessApiUrl}
        onSignlessSetupComplete={handleSignlessSetupComplete}
        apiKey={apiKey}
        recipientWalletAddress={recipientWalletAddress}
        onPendingReferenceChange={setPendingReference}
        onClearPendingTransaction={() => {
          setPendingReference(null);
          setPendingDetails(null);
          setIsPendingModalOpen(false);
          setIsCompletedModalOpen(false);
          setCompletedTxInfo(null);
          localStorage.removeItem(PENDING_TX_KEY);
          sessionStorage.removeItem('tonpay_was_page_reload');
        }}
        network={network}
        handlePay={handlePay}
        userIp={userIp}
        moonpayMinBuyAmount={moonpayMinBuyAmount}
        onTopUpWaitingChange={setIsWaitingForTopUp}
      />

      {errorMessage && (
        <NotificationRoot>
          <ErrorTransactionNotification text={errorMessage} />
        </NotificationRoot>
      )}

      {showOngoingTxModal && (
        <div
          className="tp-ongoing-modal-overlay"
          onClick={() => setShowOngoingTxModal(false)}
        >
          <div
            className="tp-ongoing-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tp-ongoing-modal-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3 className="tp-ongoing-modal-title">Transaction in Progress</h3>
            <p className="tp-ongoing-modal-text">
              You already have an ongoing transaction being processed. Would you
              like to create a new transaction anyway?
            </p>
            <div className="tp-ongoing-modal-actions">
              <button
                type="button"
                className="tp-ongoing-modal-btn tp-ongoing-modal-btn-cancel"
                onClick={() => setShowOngoingTxModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tp-ongoing-modal-btn tp-ongoing-modal-btn-confirm"
                onClick={handleConfirmNewTransaction}
              >
                Create New
              </button>
            </div>
          </div>
        </div>
      )}

      {isWaitingForTopUp && !pendingReference && !isModalOpen && (
        <div
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
            padding: '0.625rem 0.875rem',
            fontSize: '0.8rem',
            color: '#0098EA',
            background:
              'linear-gradient(135deg, rgba(0, 152, 234, 0.08), rgba(0, 152, 234, 0.04))',
            borderRadius: '10px',
            border: '1px solid rgba(0, 152, 234, 0.15)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(0, 152, 234, 0.12), rgba(0, 152, 234, 0.06))';
            e.currentTarget.style.borderColor = 'rgba(0, 152, 234, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(0, 152, 234, 0.08), rgba(0, 152, 234, 0.04))';
            e.currentTarget.style.borderColor = 'rgba(0, 152, 234, 0.15)';
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid rgba(0, 152, 234, 0.3)',
              borderTopColor: '#0098EA',
              borderRadius: '50%',
              animation: 'tp-spin 0.8s linear infinite',
            }}
          />
          <span style={{ flex: 1 }}>Waiting for balance top-up...</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0098EA"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.8 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
      )}

      {pendingReference && (
        <div
          onClick={() => setIsPendingModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
            padding: '0.625rem 0.875rem',
            fontSize: '0.8rem',
            color: '#6b7280',
            background:
              'linear-gradient(135deg, rgba(0, 152, 234, 0.08), rgba(0, 152, 234, 0.04))',
            borderRadius: '10px',
            border: '1px solid rgba(0, 152, 234, 0.15)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(0, 152, 234, 0.12), rgba(0, 152, 234, 0.06))';
            e.currentTarget.style.borderColor = 'rgba(0, 152, 234, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(0, 152, 234, 0.08), rgba(0, 152, 234, 0.04))';
            e.currentTarget.style.borderColor = 'rgba(0, 152, 234, 0.15)';
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid rgba(0, 152, 234, 0.3)',
              borderTopColor: '#0098EA',
              borderRadius: '50%',
              animation: 'tp-spin 0.8s linear infinite',
              textAlign: 'center',
            }}
          />
          <span style={{ flex: 1 }}>
            {pendingReference
              ? 'Your payment is processing...'
              : 'Processing...'}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0098EA"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.8 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
      )}

      {completedTxInfo && !pendingReference && (
        <div
          onClick={() => setIsCompletedModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
            padding: '0.625rem 0.875rem',
            fontSize: '0.8rem',
            color: '#22c55e',
            background:
              'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.04))',
            borderRadius: '10px',
            border: '1px solid rgba(34, 197, 94, 0.15)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.06))';
            e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.04))';
            e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.15)';
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span style={{ flex: 1 }}>Payment completed successfully!</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.8 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
      )}

      {isPendingModalOpen && pendingReference && pendingDetails && (
        <div
          onClick={() => setIsPendingModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 15, 30, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              padding: '2rem',
              borderRadius: '24px',
              boxShadow:
                '0 24px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              maxWidth: '380px',
              width: '100%',
              maxHeight: 'calc(100vh - 2rem)',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, rgba(0, 152, 234, 0.15), rgba(0, 152, 234, 0.05))',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(0, 152, 234, 0.3)',
                    borderTopColor: '#0098EA',
                    borderRadius: '50%',
                    animation: 'tp-spin 0.8s linear infinite',
                  }}
                />
              </div>

              <h2
                style={{
                  color: '#0a0a0a',
                  marginBottom: '0.375rem',
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  letterSpacing: '-0.03em',
                }}
              >
                Payment Details
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                Transaction is being processed
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                  fontSize: '0.875rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: '500' }} />
                  <span
                    style={{
                      color: '#0a0a0a',
                      fontWeight: '600',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pendingDetails.merchant}
                  </span>
                </div>

                <div
                  style={{
                    height: '1px',
                    background:
                      'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: '500' }}>
                    Amount
                  </span>
                  <span
                    style={{
                      color: '#0a0a0a',
                      fontWeight: '700',
                      fontSize: '1rem',
                    }}
                  >
                    {pendingDetails.amount}{' '}
                    {pendingDetails.asset === 'TON' ||
                    pendingDetails.asset === 'USDT'
                      ? pendingDetails.asset
                      : 'Tokens'}
                  </span>
                </div>

                <div
                  style={{
                    height: '1px',
                    background:
                      'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: '500' }}>
                    Started at
                  </span>
                  <span
                    style={{
                      color: '#0a0a0a',
                      fontWeight: '500',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {pendingDetails.startedAt.toLocaleTimeString()}
                  </span>
                </div>

                <div
                  style={{
                    height: '1px',
                    background:
                      'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: '500' }}>
                    Reference
                  </span>
                  <span
                    style={{
                      color: '#64748b',
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                      fontSize: '0.6875rem',
                      width: '100%',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      backgroundColor: '#f1f5f9',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      lineHeight: '1.4',
                    }}
                  >
                    {pendingReference}
                  </span>
                </div>

                <div
                  style={{
                    height: '1px',
                    background:
                      'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: '500' }}>
                    Status
                  </span>
                  <span
                    style={{
                      color: '#f59e0b',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#f59e0b',
                      }}
                    />
                    pending
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsPendingModalOpen(false)}
              style={{
                width: '100%',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                padding: '0.875rem',
                borderRadius: '14px',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#e2e8f0')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = '#f1f5f9')
              }
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isCompletedModalOpen && completedTxInfo && !pendingReference && (
        <div
          onClick={() => {
            setIsCompletedModalOpen(false);
            setCompletedTxInfo(null);
            localStorage.removeItem(PENDING_TX_KEY);
            sessionStorage.removeItem('tonpay_was_page_reload');
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 15, 30, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              padding: '2rem',
              borderRadius: '24px',
              boxShadow:
                '0 24px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              maxWidth: '380px',
              width: '100%',
              maxHeight: 'calc(100vh - 2rem)',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  marginBottom: '1.25rem',
                  position: 'relative',
                }}
              >
                <svg
                  viewBox="0 0 80 80"
                  style={{ width: '100%', height: '100%' }}
                >
                  <defs>
                    <linearGradient
                      id="tonGradientCompleted"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#0098EA" />
                      <stop offset="100%" stopColor="#00D4FF" />
                    </linearGradient>
                    <filter id="glowCompleted">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d="M40 8L65 22V58L40 72L15 58V22L40 8Z"
                    fill="url(#tonGradientCompleted)"
                    filter="url(#glowCompleted)"
                  />
                  <path
                    d="M32 40L38 46L50 34"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2
                style={{
                  color: '#0a0a0a',
                  marginBottom: '0.5rem',
                  fontSize: '1.375rem',
                  fontWeight: '700',
                  letterSpacing: '-0.03em',
                }}
              >
                Payment Successful
              </h2>
              <p
                style={{
                  color: '#6b7280',
                  fontSize: '0.9375rem',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                Your purchase for{' '}
                <strong style={{ color: '#0a0a0a' }}>
                  {itemTitle || 'your order'}
                </strong>{' '}
                is complete
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.875rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: '500' }}>
                    Amount
                  </span>
                  <span
                    style={{
                      color: '#0a0a0a',
                      fontWeight: '700',
                      fontSize: '1rem',
                    }}
                  >
                    {amount} {currency || asset || 'TON'}
                  </span>
                </div>
                <div
                  style={{
                    height: '1px',
                    background:
                      'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: '500' }}>
                    Status
                  </span>
                  <span
                    style={{
                      color: '#0098EA',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#0098EA',
                      }}
                    />
                    {completedTxInfo.status}
                  </span>
                </div>
                {completedTxInfo.txHash && (
                  <>
                    <div
                      style={{
                        height: '1px',
                        background:
                          'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ color: '#64748b', fontWeight: '500' }}>
                        TX Hash
                      </span>
                      <span
                        style={{
                          color: '#64748b',
                          fontFamily: "'SF Mono', 'Fira Code', monospace",
                          fontSize: '0.75rem',
                          width: '100%',
                          wordBreak: 'break-all',
                          overflowWrap: 'break-word',
                          backgroundColor: '#f1f5f9',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          lineHeight: '1.4',
                        }}
                      >
                        {completedTxInfo.txHash}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* TonViewer and Tonscan buttons */}
            {completedTxInfo.txHash && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <a
                  href={`https://tonviewer.com/transaction/${completedTxInfo.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '0.625rem 0.75rem',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '10px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: '#475569',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = '#e2e8f0')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = '#f1f5f9')
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  TonViewer
                </a>
                <a
                  href={`https://tonscan.org/tx/${completedTxInfo.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '0.625rem 0.75rem',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '10px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: '#475569',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = '#e2e8f0')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = '#f1f5f9')
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Tonscan
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setIsCompletedModalOpen(false);
                setCompletedTxInfo(null);
                localStorage.removeItem(PENDING_TX_KEY);
                sessionStorage.removeItem('tonpay_was_page_reload');
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #0098EA 0%, #00C6FF 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.875rem',
                borderRadius: '14px',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                boxShadow: '0 4px 12px rgba(0, 152, 234, 0.3)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 20px rgba(0, 152, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(0, 152, 234, 0.3)';
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
