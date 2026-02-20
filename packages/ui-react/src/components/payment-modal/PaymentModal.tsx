import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTonConnectUI, useTonConnectModal } from '@tonconnect/ui-react';
import { QRCodeSVG } from 'qrcode.react';
import BottomSheet from '../bottom-sheet/BottomSheet';
import { CloseIcon, BackIcon, CheckIcon, ErrorIcon, MenuIcon } from '../icons';
import type {
  PaymentModalProps,
  PaymentViewState,
  OnRampTransactionResult,
} from '../../types';
import './PaymentModal.css';
import { SignlessIframe } from '../signless-iframe';
import { useWalletBalance, getGasFee } from '../../hooks/useWalletBalance';
import {
  useMoonPayTopUp,
  calculateTopUpAmount,
} from '../../hooks/useMoonPayTopUp';

const PROVIDER = { id: 'moonpay', name: 'Moonpay', iconClass: 'icon-moonpay' };
const IFRAME_LOAD_TIMEOUT = 30000;
const PENDING_TX_KEY = 'tonpay_pending_moonpay_reference';
const INSTANT_PAYMENT_SHEET_DETENT = 0.55;

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPayWithCrypto,
  amount = '0.1',
  currency = 'TON',
  asset,
  itemTitle,
  walletAddress,
  onDisconnect,
  fetchOnRampLink,
  onRampAvailable = false,
  onPaymentSuccess,
  signlessEnabled = false,
  signlessApiUrl = '',
  onSignlessSetupComplete,
  apiKey,
  recipientWalletAddress,
  onPendingReferenceChange,
  onClearPendingTransaction,
  network,
  handlePay,
  userIp,
  moonpayMinBuyAmount,
  legacyCardFlow = false,
  onTopUpWaitingChange,
}) => {
  const paymentAssetId =
    asset && asset.trim().length > 0
      ? asset.trim()
      : currency && currency.trim().length > 0
        ? currency.trim()
        : 'TON';

  const paymentAssetSymbol =
    currency && currency.trim().length > 0
      ? currency.trim()
      : paymentAssetId.toUpperCase() === 'TON'
        ? 'TON'
        : '';

  const parsedAmount =
    typeof amount === 'string' ? parseFloat(amount) : Number(amount) || 0;

  const [view, setView] = useState<PaymentViewState>('main');
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [onRampLink, setOnRampLink] = useState<string | null>(null);
  const [onRampError, setOnRampError] = useState<string | null>(null);
  const [isOnRampLoading, setIsOnRampLoading] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [lastFlow, setLastFlow] = useState<'card' | 'signless' | null>(null);
  const [sheetDetent, setSheetDetent] = useState<number[]>([0.75]);
  const [signlessReferenceId, setSignlessReferenceId] = useState<string | null>(
    null,
  );

  const [topUpLink, setTopUpLink] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [topUpIframeLoaded, setTopUpIframeLoaded] = useState(false);
  const [isAutoPayInProgress, setIsAutoPayInProgress] = useState(false);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [customTopUpAmount, setCustomTopUpAmount] = useState<number | null>(
    null,
  );
  const [isCustomTopUpSelected, setIsCustomTopUpSelected] = useState(false);
  const [customAmountString, setCustomAmountString] = useState<string>('');
  const autoPayFiredRef = useRef(false);

  const [tonConnectUI] = useTonConnectUI();
  const tonConnectModal = useTonConnectModal();

  const iframeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchStartedRef = useRef(false);
  const pollingAbortRef = useRef<AbortController | null>(null);
  const cardViewVisitedRef = useRef(false);
  const previousViewRef = useRef<PaymentViewState>('main');
  const previousIsOpenRef = useRef(isOpen);
  const pendingReferenceRef = useRef<string | null>(null);
  const pendingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const topUpIframeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const topUpInitiatedRef = useRef(false);
  const topupCryptoSourceRef = useRef<PaymentViewState>('insufficient-funds');

  const {
    balance,
    tonBalance,
    isLoading: isBalanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useWalletBalance({
    walletAddress,
    asset: paymentAssetId,
    network: network || 'mainnet',
  });

  const { fetchTopUpLink, loading: isTopUpLinkLoading } = useMoonPayTopUp({
    apiKey,
    chain: network || 'mainnet',
  });

  const gasFee = getGasFee(paymentAssetId);
  const isNativeTon =
    !paymentAssetId ||
    paymentAssetId.toUpperCase() === 'TON' ||
    paymentAssetId === 'native';

  /** TON logo icon for balance rows — only shown for TON assets */
  const tonIcon = (color: string = '#0098EA') =>
    isNativeTon ? (
      <svg width="16" height="16" viewBox="0 0 56 56" fill="none">
        <path
          d="M28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z"
          fill={color}
        />
        <path
          d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.6944 19.4202 14.4632 22.4861L26.2644 42.9409C27.0345 44.2765 28.9644 44.2765 29.7345 42.9409L41.5765 22.4861C43.3045 19.4202 41.0761 15.6277 37.5765 15.6277H37.5603ZM26.2793 36.8068L23.927 31.4284L17.9755 20.9879C17.5765 20.3114 18.0755 19.4607 18.8755 19.4607H26.2793V36.8068ZM38.0755 20.9879L32.0831 31.4284L29.7308 36.8068V19.4607H37.1345C37.9345 19.4607 38.4336 20.3114 38.0345 20.9879H38.0755Z"
          fill="white"
        />
      </svg>
    ) : null;

  /** Check if user has sufficient balance for the payment */
  const hasSufficientBalance = useCallback((): boolean => {
    if (balance === null || tonBalance === null) return false;

    if (isNativeTon) {
      // For TON payments: balance must cover amount + gas
      return balance >= parsedAmount + gasFee;
    } else {
      // For jetton payments: jetton balance >= amount AND TON balance >= gas
      return balance >= parsedAmount && tonBalance >= gasFee;
    }
  }, [balance, tonBalance, isNativeTon, parsedAmount, gasFee]);

  /** The required total (amount + gas for display purposes) */
  const requiredAmount = isNativeTon ? parsedAmount + gasFee : parsedAmount;
  const needToAdd =
    balance !== null ? Math.max(0, requiredAmount - balance) : requiredAmount;

  const createReferenceId = useCallback(() => {
    try {
      if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return (crypto as any).randomUUID() as string;
      }
    } catch {}
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }, []);

  const handleSignlessPaymentSuccess = useCallback(() => {
    if (iframeTimeoutRef.current) {
      clearTimeout(iframeTimeoutRef.current);
    }
    setView('success');
    onPaymentSuccess?.();
    setTimeout(() => {
      onClose();
    }, 2000);
  }, [onClose, onPaymentSuccess]);

  const pollCardPaymentConfirmation = useCallback(
    async (reference: string, signal?: AbortSignal) => {
      setView('confirming-card');

      if (!apiKey) {
        console.warn('[PaymentModal] No API key for backend polling');
        onClose();
        return;
      }

      const startTime = Date.now();
      const MAX_POLL_TIME = 5 * 60 * 1000;
      const POLL_INTERVAL = 3000;

      while (Date.now() - startTime < MAX_POLL_TIME) {
        if (signal?.aborted) {
          console.log('[PaymentModal] Polling cancelled');
          return;
        }

        try {
          const response = await fetch(
            `${signlessApiUrl || ''}/api/merchant/v1/transfer?reference=${encodeURIComponent(reference)}`,
            {
              headers: {
                'x-api-key': apiKey,
              },
            },
          );

          if (response.ok) {
            const data = await response.json();
            console.log('[PaymentModal] Found transaction by reference', data);

            localStorage.removeItem(PENDING_TX_KEY);
            pendingReferenceRef.current = null;
            onPendingReferenceChange?.(null);

            const result: OnRampTransactionResult = {
              reference: data.reference || reference,
              status: data.status || 'success',
              txHash: data.txHash || '',
            };
            onPaymentSuccess?.(result);
            onClose();
            return;
          }
        } catch (error) {
          console.error('[PaymentModal] Error polling backend:', error);
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      }

      if (signal?.aborted) return;

      console.warn('[PaymentModal] Polling timeout');
      onClose();
    },
    [apiKey, signlessApiUrl, onPaymentSuccess, onClose],
  );

  const toUserFacingPaymentError = useCallback((message: string) => {
    const s = String(message || '').trim();
    if (!s) return 'Payment failed. Please try again.';

    const redacted = s.replace(/api_key=([^\s&"]+)/gi, 'api_key=[REDACTED]');
    const lowered = redacted.toLowerCase();
    const looksLikeBackendDump =
      redacted.length > 220 ||
      lowered.includes('steps=') ||
      lowered.includes('gas_used=') ||
      lowered.includes('tvm') ||
      lowered.includes('exit code') ||
      lowered.includes('err_bad_response') ||
      lowered.includes('responseData'.toLowerCase()) ||
      lowered.includes('toncenter') ||
      lowered.includes('lite_server_unknown') ||
      lowered.includes('cannot run message on account') ||
      lowered.includes('rejected by transaction');

    if (looksLikeBackendDump)
      return 'Payment failed. Please try again or pay with crypto instead.';
    return redacted;
  }, []);

  const handlePaymentError = useCallback(
    (errorMessage: string, flow: 'card' | 'signless') => {
      if (iframeTimeoutRef.current) {
        clearTimeout(iframeTimeoutRef.current);
      }
      const safeMessage = toUserFacingPaymentError(errorMessage);
      if (safeMessage !== errorMessage) {
        console.error('[PaymentModal] Payment failed (raw error redacted)', {
          error: String(errorMessage || '').replace(
            /api_key=([^\s&"]+)/gi,
            'api_key=[REDACTED]',
          ),
        });
      }
      setIframeError(safeMessage);
      setLastFlow(flow);
      setView('error');

      if (flow === 'signless') {
        setSignlessReferenceId(null);
        onPendingReferenceChange?.(null);
        onClearPendingTransaction?.();
      }
    },
    [
      toUserFacingPaymentError,
      onPendingReferenceChange,
      onClearPendingTransaction,
    ],
  );

  const handleRetryCard = useCallback(() => {
    setOnRampLink(null);
    setOnRampError(null);
    setIframeError(null);
    setIframeLoaded(false);
    fetchStartedRef.current = false;
    setLastFlow('card');
    setView('card');
  }, []);

  const handleConnectWallet = useCallback(async () => {
    if (walletAddress) return; // Already connected

    setIsWalletConnecting(true);
    try {
      tonConnectModal.open();

      await new Promise<void>((resolve, reject) => {
        const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
          if (wallet?.account) {
            unsubscribe();
            resolve();
          }
        });

        const unsubscribeModal = tonConnectUI.onModalStateChange((state) => {
          if (state.status === 'closed' && !tonConnectUI.account) {
            unsubscribe();
            unsubscribeModal();
            reject(new Error('Wallet connection cancelled'));
          }
        });

        // Timeout after 5 minutes
        setTimeout(
          () => {
            unsubscribe();
            unsubscribeModal();
            reject(new Error('Wallet connection timeout'));
          },
          5 * 60 * 1000,
        );
      });
    } catch (err) {
      console.log('[PaymentModal] Wallet connection failed:', err);
    } finally {
      setIsWalletConnecting(false);
    }
  }, [walletAddress, tonConnectModal, tonConnectUI]);

  const executeAutoPay = useCallback(async () => {
    if (!handlePay || isAutoPayInProgress) return;

    setIsAutoPayInProgress(true);
    try {
      const result = await handlePay();
      if (result && result.reference) {
        onPendingReferenceChange?.(result.reference);
      }
      topUpInitiatedRef.current = false;
      onTopUpWaitingChange?.(false);
      setView('success');
      onPaymentSuccess?.();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err ?? 'Payment failed');
      handlePaymentError(msg, 'card');
    } finally {
      setIsAutoPayInProgress(false);
    }
  }, [
    handlePay,
    isAutoPayInProgress,
    onPaymentSuccess,
    onClose,
    onPendingReferenceChange,
    handlePaymentError,
    onTopUpWaitingChange,
  ]);

  const handleTopUpWithCard = useCallback(
    async (overrideAmount?: number) => {
      if (!walletAddress || !userIp) {
        console.warn(
          '[PaymentModal] Missing walletAddress or userIp for top-up',
        );
        return;
      }

      setView('redirecting-moonpay');
      setTopUpLink(null);
      setTopUpError(null);
      setTopUpIframeLoaded(false);
      setIsTopUpLoading(true);
      topUpInitiatedRef.current = true;
      onTopUpWaitingChange?.(true);

      try {
        const topUpAmount =
          overrideAmount != null
            ? overrideAmount
            : calculateTopUpAmount(
                requiredAmount,
                balance || 0,
                moonpayMinBuyAmount || 0,
              );

        const result = await fetchTopUpLink({
          amount: topUpAmount,
          asset: paymentAssetId === 'TON' ? 'TON' : paymentAssetId,
          recipientAddr: walletAddress, // funds go to USER's wallet
          userIp,
        });

        setTopUpLink(result.link);
        setView('card-topup');

        topUpIframeTimeoutRef.current = setTimeout(() => {
          if (!topUpIframeLoaded) {
            setTopUpError('Payment service is taking too long to load.');
            setView('insufficient-funds');
          }
        }, IFRAME_LOAD_TIMEOUT);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to initialize top-up';
        setTopUpError(msg);
        setView('insufficient-funds');
      } finally {
        setIsTopUpLoading(false);
      }
    },
    [
      walletAddress,
      userIp,
      requiredAmount,
      balance,
      moonpayMinBuyAmount,
      fetchTopUpLink,
      paymentAssetId,
      topUpIframeLoaded,
    ],
  );

  const handleRefreshBalance = useCallback(async () => {
    await refetchBalance();
  }, [refetchBalance]);

  useEffect(() => {
    const POLL_VIEWS: PaymentViewState[] = [
      'insufficient-funds',
      'card-topup',
      'awaiting-deposit',
      'redirecting-moonpay',
      'topup-crypto',
      'topup-confirm',
    ];

    if (!isOpen || !walletAddress || !POLL_VIEWS.includes(view)) {
      return;
    }

    const intervalId = setInterval(() => {
      refetchBalance(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isOpen, walletAddress, view, refetchBalance]);

  useEffect(() => {
    if (
      (view === 'awaiting-deposit' ||
        view === 'insufficient-funds' ||
        view === 'topup-crypto' ||
        view === 'topup-confirm') &&
      !isBalanceLoading &&
      balance !== null &&
      tonBalance !== null &&
      hasSufficientBalance() &&
      handlePay &&
      !autoPayFiredRef.current
    ) {
      autoPayFiredRef.current = true;
      setView('ready-to-pay');
    }
  }, [
    view,
    isBalanceLoading,
    balance,
    tonBalance,
    hasSufficientBalance,
    handlePay,
  ]);

  useEffect(() => {
    const handleTopUpMessage = (event: MessageEvent) => {
      if (view !== 'card-topup') return;

      if (event.data?.type === 'TONPAY_IFRAME_LOADED') {
        setTopUpIframeLoaded(true);
        if (topUpIframeTimeoutRef.current) {
          clearTimeout(topUpIframeTimeoutRef.current);
        }
      }
      if (event.data?.type === 'TONPAY_MOONPAY_EVENT') {
        const payload = event.data.payload;
        if (
          payload?.type === 'onTransactionCompleted' ||
          payload?.eventName === 'transactionCompleted'
        ) {
          // MoonPay purchase done - funds going to user's wallet, show awaiting deposit
          autoPayFiredRef.current = false;
          setView('awaiting-deposit');
        }
        if (
          payload?.type === 'onTransactionFailed' ||
          payload?.eventName === 'transactionFailed'
        ) {
          setTopUpError(payload?.message || 'Top-up failed');
          setView('insufficient-funds');
        }
      }
    };

    window.addEventListener('message', handleTopUpMessage);
    return () => window.removeEventListener('message', handleTopUpMessage);
  }, [view]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TONPAY_PAYMENT_SUCCESS') {
        if (view !== 'signless-setup' && view !== 'signless-unlock') {
          handleSignlessPaymentSuccess();
        }
      }
      if (event.data?.type === 'TONPAY_PAYMENT_ERROR') {
        if (view !== 'signless-setup' && view !== 'signless-unlock') {
          const payload = event.data.payload;
          handlePaymentError(payload?.message || 'Payment failed', 'card');
        }
      }
      if (event.data?.type === 'TONPAY_IFRAME_LOADED' && view === 'card') {
        setIframeLoaded(true);
        if (iframeTimeoutRef.current) {
          clearTimeout(iframeTimeoutRef.current);
        }
      }
      if (event.data?.type === 'TONPAY_MOONPAY_EVENT' && view === 'card') {
        const payload = event.data.payload;
        if (
          payload?.type === 'onTransactionCompleted' ||
          payload?.eventName === 'transactionCompleted'
        ) {
          if (pendingReferenceRef.current) {
            pollCardPaymentConfirmation(pendingReferenceRef.current);
          } else {
            console.warn(
              '[PaymentModal] TransactionCompleted but no pending reference found',
            );
            onClose();
          }
        }
        if (
          payload?.type === 'onTransactionFailed' ||
          payload?.eventName === 'transactionFailed'
        ) {
          handlePaymentError(payload?.message || 'Transaction failed', 'card');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    handleSignlessPaymentSuccess,
    handlePaymentError,
    view,
    pollCardPaymentConfirmation,
  ]);

  useEffect(() => {
    if (view !== 'card') {
      fetchStartedRef.current = false;
    }
  }, [view]);

  const REFERENCE_SAVE_DELAY = 10000;

  useEffect(() => {
    if (
      view === 'card' &&
      !onRampLink &&
      !onRampError &&
      fetchOnRampLink &&
      !fetchStartedRef.current
    ) {
      fetchStartedRef.current = true;
      setIsOnRampLoading(true);
      setOnRampError(null);
      setIframeLoaded(false);
      setIframeError(null);

      onClearPendingTransaction?.();

      fetchOnRampLink(PROVIDER.id)
        .then((result) => {
          setOnRampLink(result.link);

          pendingReferenceRef.current = result.reference;
          console.log(
            '[PaymentModal] Reference received, will save to localStorage after 10 seconds:',
            result.reference,
          );

          if (pendingSaveTimerRef.current) {
            clearTimeout(pendingSaveTimerRef.current);
          }

          pendingSaveTimerRef.current = setTimeout(() => {
            const pendingData = JSON.stringify({
              reference: result.reference,
              createdAt: Date.now(),
            });
            localStorage.setItem(PENDING_TX_KEY, pendingData);
            onPendingReferenceChange?.(result.reference);
            console.log(
              '[PaymentModal] Saved pending reference to localStorage:',
              result.reference,
            );
          }, REFERENCE_SAVE_DELAY);

          iframeTimeoutRef.current = setTimeout(() => {
            if (!iframeLoaded) {
              handlePaymentError(
                'Payment service is taking too long to load. Please try again.',
                'card',
              );
            }
          }, IFRAME_LOAD_TIMEOUT);
        })
        .catch((err) => {
          const errorMsg = err?.message || 'Failed to initialize payment';
          setOnRampError(errorMsg);
          fetchStartedRef.current = false;
        })
        .finally(() => setIsOnRampLoading(false));
    }

    return () => {
      if (iframeTimeoutRef.current) {
        clearTimeout(iframeTimeoutRef.current);
      }
    };
  }, [
    view,
    onRampLink,
    onRampError,
    fetchOnRampLink,
    iframeLoaded,
    handlePaymentError,
    onPendingReferenceChange,
    onClearPendingTransaction,
  ]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!walletAddress && isOpen) {
      setView('main');
      setShowMenu(false);
      topUpInitiatedRef.current = false;
      autoPayFiredRef.current = false;
      onTopUpWaitingChange?.(false);
    }
  }, [walletAddress, isOpen]);

  useEffect(() => {
    if (isOpen && walletAddress && !legacyCardFlow) {
      autoPayFiredRef.current = false;
      refetchBalance();
    }
  }, [isOpen, walletAddress, legacyCardFlow]);

  useEffect(() => {
    if (
      isOpen &&
      !legacyCardFlow &&
      handlePay &&
      walletAddress &&
      view === 'main' &&
      !isBalanceLoading &&
      balance !== null &&
      tonBalance !== null &&
      !hasSufficientBalance()
    ) {
      setView('insufficient-funds');
    }
  }, [
    isOpen,
    legacyCardFlow,
    handlePay,
    walletAddress,
    view,
    isBalanceLoading,
    balance,
    tonBalance,
    hasSufficientBalance,
  ]);

  useEffect(() => {
    if (isOpen) {
      if (topUpInitiatedRef.current) {
        autoPayFiredRef.current = false;
        if (balance !== null && tonBalance !== null && hasSufficientBalance()) {
          setView('ready-to-pay');
        } else {
          setView('insufficient-funds');
        }
      } else {
        setView('main');
      }
      setShowMenu(false);
      setOnRampLink(null);
      setOnRampError(null);
      setIframeLoaded(false);
      setIframeError(null);
      setSignlessReferenceId(null);
      setTopUpLink(null);
      setTopUpError(null);
      setTopUpIframeLoaded(false);
      setIsAutoPayInProgress(false);
      if (iframeTimeoutRef.current) {
        clearTimeout(iframeTimeoutRef.current);
      }
      if (topUpIframeTimeoutRef.current) {
        clearTimeout(topUpIframeTimeoutRef.current);
      }
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current);
        pendingSaveTimerRef.current = null;
      }
    }
  }, [isOpen]);

  // --- Dynamic sheet height based on view ---
  const contentMeasureRef = useRef<HTMLDivElement>(null);

  const measureContentAndSetDetent = useCallback(() => {
    const el = contentMeasureRef.current;
    if (!el) return;
    // Temporarily remove height constraint to measure natural content height
    const prevHeight = el.style.height;
    el.style.height = 'auto';
    const naturalHeight = el.scrollHeight;
    el.style.height = prevHeight;

    const vh = window.innerHeight;
    // 40px for the BottomSheet handle + safe area
    const detent = Math.min(0.92, Math.max(0.45, (naturalHeight + 40) / vh));
    setSheetDetent([detent]);
  }, []);

  useEffect(() => {
    if (!isMobile || !isOpen) return;

    // Full-height views
    if (
      view === 'signless-setup' ||
      view === 'signless-unlock' ||
      view === 'card-topup'
    ) {
      setSheetDetent([INSTANT_PAYMENT_SHEET_DETENT]);
      return;
    }

    // Wait for React to render the new view, then measure
    requestAnimationFrame(() => {
      measureContentAndSetDetent();
    });
  }, [
    view,
    isMobile,
    isOpen,
    isCustomTopUpSelected,
    measureContentAndSetDetent,
  ]);

  // Track when user leaves card view and start polling (legacy flow)
  useEffect(() => {
    const prevIsOpen = previousIsOpenRef.current;

    previousViewRef.current = view;
    previousIsOpenRef.current = isOpen;

    if (isOpen && view === 'card' && iframeLoaded) {
      cardViewVisitedRef.current = true;
    }

    const isClosingModalFromCard = prevIsOpen && !isOpen && view === 'card';

    if (isClosingModalFromCard && cardViewVisitedRef.current) {
      console.log(
        '[PaymentModal] User closed modal from card view, starting confirmation polling',
      );
      cardViewVisitedRef.current = false;

      if (pollingAbortRef.current) {
        pollingAbortRef.current.abort();
      }

      const abortController = new AbortController();
      pollingAbortRef.current = abortController;

      pollCardPaymentConfirmation(
        pendingReferenceRef.current || '',
        abortController.signal,
      );
    }

    if (isOpen && view === 'card' && pollingAbortRef.current) {
      console.log(
        '[PaymentModal] User returned to card view, cancelling polling',
      );
      pollingAbortRef.current.abort();
      pollingAbortRef.current = null;
    }
  }, [view, iframeLoaded, isOpen, pollCardPaymentConfirmation]);

  useEffect(() => {
    return () => {
      if (pollingAbortRef.current) {
        pollingAbortRef.current.abort();
      }
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current);
      }
      if (topUpIframeTimeoutRef.current) {
        clearTimeout(topUpIframeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      cardViewVisitedRef.current = false;
      previousViewRef.current = 'main';
      const storedData = localStorage.getItem(PENDING_TX_KEY);
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          const EXPIRY_MS = 5 * 60 * 1000;
          if (parsed.createdAt && Date.now() - parsed.createdAt < EXPIRY_MS) {
            pendingReferenceRef.current = parsed.reference;
          } else {
            localStorage.removeItem(PENDING_TX_KEY);
            pendingReferenceRef.current = null;
            console.log('[PaymentModal] Pending reference expired, cleared');
          }
        } catch {
          localStorage.removeItem(PENDING_TX_KEY);
          pendingReferenceRef.current = null;
        }
      } else {
        pendingReferenceRef.current = null;
      }
      if (pollingAbortRef.current) {
        pollingAbortRef.current.abort();
        pollingAbortRef.current = null;
      }
    }
  }, [isOpen]);

  const handleSignlessIframeClose = useCallback(() => {
    setSignlessReferenceId(null);
    onPendingReferenceChange?.(null);
    onClearPendingTransaction?.();
    setView('main');
  }, [onPendingReferenceChange, onClearPendingTransaction]);

  const handleTryInstantPayments = useCallback(() => {
    setLastFlow('signless');
    const nextRef = createReferenceId();
    setSignlessReferenceId(nextRef);
    onClearPendingTransaction?.();
    setSheetDetent([INSTANT_PAYMENT_SHEET_DETENT]);
    setView('signless-unlock');
  }, [createReferenceId, onClearPendingTransaction]);

  const handleRetrySignless = useCallback(() => {
    setIframeError(null);
    setIframeLoaded(false);
    fetchStartedRef.current = false;
    // Generate a new reference so SignlessIframe creates a fresh payment
    // with an up-to-date seqno instead of re-sending the stale payload
    const nextRef = createReferenceId();
    setSignlessReferenceId(nextRef);
    onClearPendingTransaction?.();
    setSheetDetent([INSTANT_PAYMENT_SHEET_DETENT]);
    setView('signless-unlock');
  }, [createReferenceId, onClearPendingTransaction]);

  const handleBack = () => {
    if (view === 'topup-confirm') {
      setView('insufficient-funds');
      return;
    }
    if (view === 'topup-crypto') {
      setView(topupCryptoSourceRef.current);
      return;
    }
    if (view === 'card-topup' || view === 'redirecting-moonpay') {
      setView('topup-confirm');
      return;
    }
    if (view === 'awaiting-deposit') {
      setView('insufficient-funds');
      return;
    }
    if (view === 'ready-to-pay') {
      // User doesn't want to pay yet, go back to main
      topUpInitiatedRef.current = false;
      onTopUpWaitingChange?.(false);
      setView('main');
      return;
    }
    setView('main');
  };

  const getViewTitle = () => {
    switch (view) {
      case 'signless-setup':
      case 'signless-unlock':
        return 'Instant Payments';
      case 'insufficient-funds':
        return 'Insufficient Funds';
      case 'card-topup':
        return 'Card Top-Up';
      case 'awaiting-deposit':
        return 'Awaiting Deposit';
      case 'redirecting-moonpay':
        return '';
      case 'topup-crypto':
        return 'Top Up with Crypto';
      case 'topup-confirm':
        return 'Top Up';
      case 'ready-to-pay':
        return 'Ready to Pay';
      default:
        return 'New Purchase';
    }
  };

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    if (iframeTimeoutRef.current) {
      clearTimeout(iframeTimeoutRef.current);
    }
  };

  const handleIframeError = () => {
    handlePaymentError(
      'Failed to load payment service. Please try again.',
      'card',
    );
  };

  const handleTopUpIframeLoad = () => {
    setTopUpIframeLoaded(true);
    if (topUpIframeTimeoutRef.current) {
      clearTimeout(topUpIframeTimeoutRef.current);
    }
  };

  const handleTopUpIframeError = () => {
    setTopUpError('Failed to load payment service. Please try again.');
    setView('insufficient-funds');
  };

  // ========== RENDER FUNCTIONS ==========

  const renderHeader = () => {
    const showBackButton = view !== 'main' && view !== 'insufficient-funds';
    const showWalletMenu =
      walletAddress && view !== 'card' && view !== 'confirming-card';

    return (
      <div className="pm-header">
        {showBackButton ? (
          <button className="pm-back-btn" onClick={handleBack}>
            <BackIcon />
          </button>
        ) : (
          <div style={{ width: 32 }} />
        )}
        <div className="pm-title">{getViewTitle()}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {showWalletMenu && (
            <div style={{ position: 'relative' }}>
              <button
                className="pm-close-btn"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MenuIcon />
              </button>
              {showMenu && (
                <div className="pm-menu-dropdown">
                  <div className="pm-menu-item disabled">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                  </div>
                  <div
                    className="pm-menu-item danger"
                    onClick={() => {
                      onDisconnect?.();
                      setShowMenu(false);
                    }}
                  >
                    Disconnect
                  </div>
                </div>
              )}
            </div>
          )}
          <button className="pm-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
      </div>
    );
  };

  const renderMainView = () => {
    // New flow: wallet NOT connected — show connect button
    if (!legacyCardFlow && handlePay && !walletAddress) {
      return (
        <div className="pm-body-main">
          <div className="pm-order-info">
            <span className="pm-order-text">{itemTitle}</span>
          </div>
          <div className="pm-amount-container">
            <span className="pm-amount-label">Amount</span>
            <div className="pm-amount-value">
              {amount} {currency}
            </div>
          </div>
          <div className="pm-actions">
            <button
              className="pm-btn pm-btn-primary"
              onClick={handleConnectWallet}
              disabled={isWalletConnecting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isWalletConnecting ? (
                <>
                  <div className="pm-spinner-small" />
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </button>
            {signlessEnabled && (
              <button
                className="pm-btn pm-btn-outline"
                onClick={handleTryInstantPayments}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Instant Payment
              </button>
            )}
          </div>
        </div>
      );
    }

    if (!legacyCardFlow && handlePay && isWalletConnecting) {
      return (
        <div className="pm-body-main">
          <div className="pm-loading-container" style={{ minHeight: '200px' }}>
            <div className="pm-spinner" />
            <p>Connecting wallet...</p>
          </div>
        </div>
      );
    }

    if (!legacyCardFlow && handlePay && walletAddress && isBalanceLoading) {
      return (
        <div className="pm-body-main">
          <div className="pm-loading-container" style={{ minHeight: '200px' }}>
            <div className="pm-spinner" />
            <p>Checking balance...</p>
          </div>
        </div>
      );
    }

    if (!legacyCardFlow && isAutoPayInProgress) {
      return (
        <div className="pm-body-main">
          <div className="pm-loading-container" style={{ minHeight: '200px' }}>
            <div className="pm-spinner" />
            <p>Processing payment...</p>
          </div>
        </div>
      );
    }

    if (
      !legacyCardFlow &&
      handlePay &&
      walletAddress &&
      balance !== null &&
      hasSufficientBalance()
    ) {
      return (
        <div className="pm-body-main">
          <div className="pm-order-info">
            <span className="pm-order-text">{itemTitle}</span>
          </div>
          <div className="pm-amount-container">
            <span className="pm-amount-label">Amount</span>
            <div className="pm-amount-value">
              {amount} {currency}
            </div>
          </div>
          <div
            className="pm-balance-info"
            style={{
              textAlign: 'center',
              fontSize: '13px',
              color: '#22c55e',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Balance: {balance?.toFixed(2)} {paymentAssetSymbol || currency}
          </div>
          <div className="pm-actions">
            <button
              className="pm-btn pm-btn-primary"
              onClick={executeAutoPay}
              disabled={isAutoPayInProgress}
            >
              {isAutoPayInProgress ? 'Processing...' : 'Pay Now'}
            </button>
            {signlessEnabled && (
              <button
                className="pm-btn pm-btn-outline"
                onClick={handleTryInstantPayments}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Instant Payment
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="pm-body-main">
        <div className="pm-order-info">
          <span className="pm-order-text">{itemTitle}</span>
        </div>
        <div className="pm-amount-container">
          <span className="pm-amount-label">Amount</span>
          <div className="pm-amount-value">
            {amount} {currency}
          </div>
        </div>
        <div className="pm-actions">
          <button className="pm-btn pm-btn-primary" onClick={onPayWithCrypto}>
            Pay with Crypto
          </button>
          {onRampAvailable && legacyCardFlow && (
            <button
              className="pm-btn pm-btn-black"
              onClick={() => setView('card')}
            >
              Pay with Card
            </button>
          )}
          {signlessEnabled && (
            <button
              className="pm-btn pm-btn-outline"
              onClick={handleTryInstantPayments}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              Instant Payment
            </button>
          )}
        </div>
      </div>
    );
  };

  // ===== NEW FLOW VIEWS =====

  const renderInsufficientFundsView = () => {
    const displayBalance = balance !== null ? balance.toFixed(2) : '0.00';
    const displayRequired = requiredAmount.toFixed(2);
    const displayNeedToAdd = needToAdd.toFixed(2);

    const hasTokenDeficit =
      !isNativeTon && balance !== null && balance < parsedAmount;
    const hasGasDeficit = tonBalance !== null && tonBalance < gasFee;
    const deficitToken = hasTokenDeficit
      ? paymentAssetSymbol || paymentAssetId
      : 'TON';

    const cardTopUpAmount = calculateTopUpAmount(
      requiredAmount,
      balance || 0,
      moonpayMinBuyAmount || 0,
    );
    const isMinBuyBumped =
      moonpayMinBuyAmount != null &&
      moonpayMinBuyAmount > 0 &&
      needToAdd < moonpayMinBuyAmount;

    return (
      <div className="pm-insufficient-funds">
        <div className="pm-insufficient-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="#FFF3E0"
              stroke="#FF9800"
              strokeWidth="2"
            />
            <text
              x="24"
              y="24"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="24"
              fontWeight="bold"
              fill="#FF9800"
            >
              !
            </text>
          </svg>
        </div>

        <p className="pm-insufficient-subtitle">
          {topUpInitiatedRef.current
            ? 'Waiting for balance top-up...'
            : 'Top up your balance to complete the payment'}
        </p>

        {/* Balance details */}
        <div className="pm-balance-details">
          <div className="pm-balance-row">
            <span className="pm-balance-label">Wallet balance</span>
            <span className="pm-balance-value">
              {tonIcon()}
              {displayBalance} {paymentAssetSymbol || deficitToken}
            </span>
          </div>
          <div className="pm-balance-row">
            <span className="pm-balance-label">Payment amount</span>
            <span className="pm-balance-value">
              {tonIcon()}
              {displayRequired} {paymentAssetSymbol || deficitToken}
            </span>
          </div>
          <div className="pm-balance-row pm-balance-row-deficit">
            <span className="pm-balance-label">Minimal top-up for payment</span>
            <span className="pm-balance-value pm-balance-deficit">
              {tonIcon()}
              {displayNeedToAdd} {paymentAssetSymbol || deficitToken}
            </span>
          </div>
          {!isNativeTon && hasGasDeficit && (
            <div className="pm-balance-row pm-balance-row-deficit">
              <span className="pm-balance-label">TON for gas</span>
              <span className="pm-balance-value pm-balance-deficit">
                ~{gasFee} TON
              </span>
            </div>
          )}
        </div>

        {isMinBuyBumped && onRampAvailable && (
          <p className="pm-topup-min-note">
            Minimum card top-up: {cardTopUpAmount.toFixed(2)}{' '}
            {paymentAssetSymbol || deficitToken}
            <br /> Excess funds will stay in your wallet.
          </p>
        )}

        {topUpError && <p className="pm-topup-error">{topUpError}</p>}

        {/* Top up buttons */}
        <div className="pm-actions">
          {onRampAvailable && (
            <button
              className={
                onRampAvailable
                  ? 'pm-btn pm-btn-primary'
                  : 'pm-btn pm-btn-outline'
              }
              onClick={() => {
                const defaultAmount = calculateTopUpAmount(
                  requiredAmount,
                  balance || 0,
                  moonpayMinBuyAmount || 0,
                );
                setCustomTopUpAmount(defaultAmount);
                setView('topup-confirm');
              }}
              disabled={isTopUpLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Top up by card
            </button>
          )}
          <button
            className={
              !onRampAvailable
                ? 'pm-btn pm-btn-primary'
                : 'pm-btn pm-btn-outline'
            }
            onClick={() => {
              topupCryptoSourceRef.current = 'insufficient-funds';
              setView('topup-crypto');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Top up with crypto
          </button>
        </div>
      </div>
    );
  };

  const renderRedirectingMoonPayView = () => (
    <div className="pm-redirecting-container">
      <div className="pm-redirecting-icon">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0098EA"
          strokeWidth="1.5"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        <div className="pm-redirecting-spinner-small" />
      </div>
      <h2 className="pm-redirecting-title">Redirecting to MoonPay</h2>
      <p className="pm-redirecting-text">
        You'll be redirected to purchase crypto...
      </p>
    </div>
  );

  const renderCardTopUpView = () => (
    <div className="pm-iframe-container">
      {!topUpIframeLoaded && (
        <div className="pm-loading-overlay">
          <div className="pm-spinner" />
        </div>
      )}
      {topUpLink && (
        <iframe
          src={topUpLink}
          title="MoonPay Top Up"
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; camera; gyroscope; payment"
          onLoad={handleTopUpIframeLoad}
          onError={handleTopUpIframeError}
          style={{ opacity: topUpIframeLoaded ? 1 : 0 }}
        />
      )}
    </div>
  );

  const renderAwaitingDepositView = () => {
    const displayBalance = balance !== null ? balance.toFixed(2) : '0.00';
    const displayRequired = requiredAmount.toFixed(2);
    const displayNeedToAdd = needToAdd.toFixed(2);
    const deficitToken = paymentAssetSymbol || 'TON';

    return (
      <div className="pm-awaiting-deposit">
        {/* Clock icon */}
        <div className="pm-awaiting-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="#E3F2FD"
              stroke="#0098EA"
              strokeWidth="2"
            />
            <circle
              cx="24"
              cy="24"
              r="10"
              fill="none"
              stroke="#0098EA"
              strokeWidth="2"
            />
            <line
              x1="24"
              y1="18"
              x2="24"
              y2="24"
              stroke="#0098EA"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="24"
              y1="24"
              x2="28"
              y2="26"
              stroke="#0098EA"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p className="pm-awaiting-subtitle">
          Once funds arrive, your balance will refresh automatically
        </p>

        {/* Balance details */}
        <div className="pm-balance-details">
          <div className="pm-balance-row">
            <span className="pm-balance-label">Wallet balance</span>
            <span className="pm-balance-value">
              {tonIcon()}
              {displayBalance} {deficitToken}
            </span>
          </div>
          <div className="pm-balance-row">
            <span className="pm-balance-label">Payment amount</span>
            <span className="pm-balance-value">
              {tonIcon()}
              {displayRequired} {deficitToken}
            </span>
          </div>
          <div className="pm-balance-row pm-balance-row-deficit">
            <span className="pm-balance-label">Minimal top-up for payment</span>
            <span className="pm-balance-value pm-balance-deficit">
              {tonIcon()}
              {displayNeedToAdd} {deficitToken}
            </span>
          </div>
        </div>

        <div className="pm-actions">
          <button
            className="pm-btn pm-btn-primary"
            onClick={handleRefreshBalance}
            disabled={isBalanceLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isBalanceLoading ? (
              <>
                <div
                  className="pm-spinner"
                  style={{ width: 18, height: 18, borderWidth: 2 }}
                />
                Checking...
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
                Refresh balance
              </>
            )}
          </button>

          <p className="pm-awaiting-or">or top up more</p>

          <button
            className="pm-btn pm-btn-outline"
            onClick={() => {
              topupCryptoSourceRef.current = 'insufficient-funds';
              setView('topup-crypto');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="6" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
            Top up with crypto
          </button>
        </div>
      </div>
    );
  };

  const renderTopUpCryptoView = () => {
    const displayBalance = balance !== null ? balance.toFixed(2) : '0.00';
    const displayRequired = requiredAmount.toFixed(2);
    const displayNeedToAdd = needToAdd.toFixed(2);
    const deficitToken = paymentAssetSymbol || 'TON';

    return (
      <div className="pm-topup-crypto">
        {/* QR code - deposit address */}
        <div className="pm-topup-crypto-qr">
          <div className="pm-topup-crypto-qr-container">
            {walletAddress && (
              <QRCodeSVG
                value={walletAddress}
                size={140}
                level="M"
                bgColor="#ffffff"
                fgColor="#0a0a0a"
                style={{ borderRadius: '8px' }}
              />
            )}
          </div>
          <p className="pm-topup-crypto-label">Deposit address</p>
        </div>

        {/* Address display */}
        <div className="pm-topup-crypto-address">
          <span className="pm-topup-crypto-addr-text">
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`
              : ''}
          </span>
          <button
            className="pm-wallet-copy-btn"
            onClick={() => {
              if (walletAddress) {
                try {
                  navigator.clipboard.writeText(walletAddress);
                } catch {}
              }
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>

        {/* Balance details */}
        <div className="pm-balance-details">
          <div className="pm-balance-row">
            <span className="pm-balance-label">Wallet balance</span>
            <span className="pm-balance-value">
              {tonIcon()}
              {displayBalance} {deficitToken}
            </span>
          </div>
          <div className="pm-balance-row">
            <span className="pm-balance-label">Payment amount</span>
            <span className="pm-balance-value">
              {tonIcon()}
              {displayRequired} {deficitToken}
            </span>
          </div>
          <div className="pm-balance-row pm-balance-row-deficit">
            <span className="pm-balance-label">Minimal top-up for payment</span>
            <span className="pm-balance-value pm-balance-deficit">
              {tonIcon()}
              {displayNeedToAdd} {deficitToken}
            </span>
          </div>
        </div>

        <div className="pm-actions" style={{ marginTop: 'auto' }}>
          <button
            className="pm-btn pm-btn-primary"
            onClick={handleRefreshBalance}
            disabled={isBalanceLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isBalanceLoading ? (
              <>
                <div
                  className="pm-spinner"
                  style={{ width: 18, height: 18, borderWidth: 2 }}
                />
                Checking...
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
                Refresh balance
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderTopUpConfirmView = () => {
    const defaultTopUp = calculateTopUpAmount(
      requiredAmount,
      balance || 0,
      moonpayMinBuyAmount || 0,
    );
    const deficitToken = paymentAssetSymbol || 'TON';
    const minAmount =
      moonpayMinBuyAmount && moonpayMinBuyAmount > 0
        ? moonpayMinBuyAmount
        : 0.01;

    const calculated = Math.ceil(defaultTopUp * 100) / 100;
    const roundedTo10 = Math.ceil(calculated / 10) * 10;
    const plus1020 = roundedTo10 + (roundedTo10 >= 20 ? 10 : 20);

    const presetOptions = [calculated, roundedTo10, plus1020];
    const uniquePresets = Array.from(new Set(presetOptions)).sort(
      (a, b) => a - b,
    );

    let currentAmount = 0;
    if (isCustomTopUpSelected) {
      if (!customAmountString) {
        currentAmount = 0;
      } else {
        const parsed = parseFloat(customAmountString.replace(',', '.'));
        currentAmount = !isNaN(parsed) && isFinite(parsed) ? parsed : 0;
      }
    } else {
      currentAmount = customTopUpAmount ?? calculated;
    }

    const isValidAmount = currentAmount >= calculated;

    return (
      <div className="pm-topup-confirm">
        <p className="pm-topup-confirm-subtitle">Choose how much to top up</p>

        {/* Preset amount buttons */}
        <div className="pm-topup-confirm-presets">
          {uniquePresets.map((opt) => (
            <button
              key={opt}
              className={`pm-topup-confirm-preset-btn${currentAmount === opt && !isCustomTopUpSelected ? ' active' : ''}`}
              onClick={() => {
                setCustomTopUpAmount(opt);
                setCustomAmountString(opt.toString());
                setIsCustomTopUpSelected(false);
              }}
            >
              {opt} {deficitToken}
            </button>
          ))}
          <button
            className={`pm-topup-confirm-preset-btn${isCustomTopUpSelected ? ' active' : ''}`}
            onClick={() => {
              if (!isCustomTopUpSelected) {
                // Pre-fill input with current selection if switching to custom
                const val = (customTopUpAmount ?? calculated).toString();
                setCustomAmountString(val);
                setIsCustomTopUpSelected(true);
              }
            }}
          >
            Custom
          </button>
        </div>

        {/* Custom amount input - only shown when Custom is selected */}
        {isCustomTopUpSelected && (
          <div className="pm-topup-confirm-custom">
            <label className="pm-topup-confirm-custom-label">
              Custom amount (min {calculated} {deficitToken})
            </label>
            <div className="pm-topup-confirm-input-wrap">
              <input
                type="text"
                inputMode="decimal"
                className="pm-topup-confirm-input"
                style={{
                  borderColor: !isValidAmount
                    ? 'var(--tg-theme-destructive-text-color, #ff3b30)'
                    : undefined,
                  color: !isValidAmount
                    ? 'var(--tg-theme-destructive-text-color, #ff3b30)'
                    : undefined,
                }}
                value={customAmountString}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*([.,]\d*)?$/.test(val)) {
                    setCustomAmountString(val);
                    const num = parseFloat(val.replace(',', '.'));
                    if (!isNaN(num) && isFinite(num)) {
                      setCustomTopUpAmount(num);
                    } else if (val === '') {
                      setCustomTopUpAmount(0);
                    }
                  }
                }}
              />
              <span className="pm-topup-confirm-input-unit">
                {deficitToken}
              </span>
            </div>
          </div>
        )}

        <div className="pm-balance-details" style={{ marginTop: 12 }}>
          <div className="pm-balance-row">
            <span className="pm-balance-label">Wallet balance</span>
            <span className="pm-balance-value">
              {tonIcon()}
              {(balance ?? 0).toFixed(2)} {deficitToken}
            </span>
          </div>
          <div className="pm-balance-row">
            <span className="pm-balance-label">Top up amount</span>
            <span
              className="pm-balance-value"
              style={{ color: '#0098EA', fontWeight: 600 }}
            >
              {tonIcon('#0098EA')}+{currentAmount.toFixed(2)} {deficitToken}
            </span>
          </div>
          <div
            className="pm-balance-row"
            style={{
              borderTop: '1px solid var(--pm-border, #e5e7eb)',
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <span className="pm-balance-label">Balance after top up</span>
            <span className="pm-balance-value" style={{ fontWeight: 700 }}>
              {tonIcon()}
              {((balance ?? 0) + currentAmount).toFixed(2)} {deficitToken}
            </span>
          </div>
        </div>

        {network === 'testnet' && onRampAvailable && (
          <p className="pm-topup-min-note">
            Testnet mode: Card top-ups credit only 1% of the indicated amount.
          </p>
        )}

        {/* Action button - only card top-up */}
        <div className="pm-actions" style={{ marginTop: 16 }}>
          <button
            className={`pm-btn ${isValidAmount ? 'pm-btn-primary' : 'pm-btn-disabled'}`}
            onClick={() => handleTopUpWithCard(currentAmount)}
            disabled={isTopUpLoading || !isValidAmount}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Top up by card
          </button>
        </div>
      </div>
    );
  };

  const renderReadyToPayView = () => {
    const displayTotal = requiredAmount.toFixed(4);

    return (
      <div className="pm-ready-to-pay">
        <div className="pm-ready-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle
              cx="28"
              cy="28"
              r="26"
              fill="#E8F5E9"
              stroke="#4CAF50"
              strokeWidth="2"
            />
            <path
              d="M20 28l6 6 12-12"
              stroke="#4CAF50"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>

        <h2 className="pm-ready-title">Ready to Pay</h2>
        <p className="pm-ready-subtitle">
          Balance topped up, you can proceed with payment
        </p>

        {/* Order summary */}
        <div className="pm-ready-summary">
          <div className="pm-ready-row">
            <span className="pm-ready-label">Recipient</span>
            <span className="pm-ready-value">{itemTitle || 'Merchant'}</span>
          </div>
          <div className="pm-ready-row">
            <span className="pm-ready-label">Amount</span>
            <span className="pm-ready-value">
              {tonIcon()}
              {amount} {paymentAssetSymbol || currency}
            </span>
          </div>
          {isNativeTon && (
            <div className="pm-ready-row">
              <span className="pm-ready-label">Network fee</span>
              <span className="pm-ready-value">
                {tonIcon()}~{gasFee} TON
              </span>
            </div>
          )}
          <div className="pm-ready-row pm-ready-row-total">
            <span className="pm-ready-label">Total</span>
            <span className="pm-ready-value pm-ready-total">
              {tonIcon()}
              {displayTotal} {paymentAssetSymbol || currency}
            </span>
          </div>
        </div>

        <div className="pm-actions">
          <button
            className="pm-btn pm-btn-primary"
            onClick={executeAutoPay}
            disabled={isAutoPayInProgress}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isAutoPayInProgress ? (
              <>
                <div
                  className="pm-spinner"
                  style={{ width: 18, height: 18, borderWidth: 2 }}
                />
                Processing...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 56 56" fill="none">
                  <path
                    d="M28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z"
                    fill="white"
                  />
                  <path
                    d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.6944 19.4202 14.4632 22.4861L26.2644 42.9409C27.0345 44.2765 28.9644 44.2765 29.7345 42.9409L41.5765 22.4861C43.3045 19.4202 41.0761 15.6277 37.5765 15.6277H37.5603ZM26.2793 36.8068L23.927 31.4284L17.9755 20.9879C17.5765 20.3114 18.0755 19.4607 18.8755 19.4607H26.2793V36.8068ZM38.0755 20.9879L32.0831 31.4284L29.7308 36.8068V19.4607H37.1345C37.9345 19.4607 38.4336 20.3114 38.0345 20.9879H38.0755Z"
                    fill="#0098EA"
                  />
                </svg>
                Pay
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderSignlessView = () => (
    <div
      className="pm-signless-iframe-container"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <SignlessIframe
        isOpen={true}
        mode={view === 'signless-setup' ? 'setup' : 'payment'}
        baseUrl={signlessApiUrl}
        walletConnection="iframe"
        network={network}
        asset={paymentAssetId}
        assetSymbol={paymentAssetSymbol}
        amount={amount}
        recipient={recipientWalletAddress}
        comment={itemTitle}
        apiKey={apiKey}
        referenceId={signlessReferenceId || undefined}
        onSetupComplete={(data) => {
          onSignlessSetupComplete?.(data);
          setView('signless-unlock');
        }}
        onSigned={(payload) => {
          const reference = payload?.referenceId || signlessReferenceId;
          if (reference) {
            onPaymentSuccess?.({
              reference,
              status: 'success',
              txHash: payload?.txHash || '',
            });
          } else {
            onPaymentSuccess?.();
          }
          handleSignlessPaymentSuccess();
        }}
        onUseWallet={() => {
          onPayWithCrypto();
        }}
        onError={(msg) => handlePaymentError(msg, 'signless')}
        onClose={handleSignlessIframeClose}
        onSetupRequired={() => {
          console.log(
            '[PaymentModal] Setup required received, switching to setup view',
          );
          setSignlessReferenceId(null);
          onPendingReferenceChange?.(null);
          onClearPendingTransaction?.();
          setSheetDetent([INSTANT_PAYMENT_SHEET_DETENT]);
          setView('signless-setup');
        }}
        variant="embedded"
      />
    </div>
  );

  const renderCardView = () => (
    <div className="pm-iframe-container">
      {isOnRampLoading && (
        <div className="pm-loading-container">
          <div className="pm-spinner" />
          <p>Loading {PROVIDER.name}...</p>
        </div>
      )}
      {onRampError && (
        <div className="pm-error-inline">
          <ErrorIcon />
          <p>{onRampError}</p>
          <button className="pm-btn pm-btn-outline" onClick={handleRetryCard}>
            Try Again
          </button>
        </div>
      )}
      {onRampLink && !isOnRampLoading && !onRampError && (
        <>
          {!iframeLoaded && (
            <div className="pm-loading-overlay">
              <div className="pm-spinner" />
            </div>
          )}
          <iframe
            src={onRampLink}
            title={PROVIDER.name}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; camera; gyroscope; payment"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{ opacity: iframeLoaded ? 1 : 0 }}
          />
        </>
      )}
    </div>
  );

  const renderSuccessView = () => (
    <div className="pm-success-container">
      <div className="pm-success-icon">
        <CheckIcon />
      </div>
      <h2 className="pm-success-title">Payment Successful</h2>
      <p className="pm-success-text">Your purchase is being processed</p>
    </div>
  );

  const renderErrorView = () => (
    <div className="pm-error-container">
      <div className="pm-error-icon">
        <ErrorIcon />
      </div>
      <h2 className="pm-error-title">Payment Failed</h2>
      <p className="pm-error-text">{iframeError || 'Something went wrong'}</p>
      <div className="pm-error-actions">
        <button
          className="pm-btn pm-btn-primary"
          onClick={
            lastFlow === 'signless' ? handleRetrySignless : handleRetryCard
          }
        >
          Try Again
        </button>
        <button className="pm-btn pm-btn-outline" onClick={onPayWithCrypto}>
          Pay with Crypto Instead
        </button>
      </div>
    </div>
  );

  const renderConfirmingCardView = () => (
    <div
      className="pm-confirming-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        textAlign: 'center',
        minHeight: '300px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          marginBottom: '1.5rem',
          position: 'relative',
        }}
      >
        <svg
          viewBox="0 0 64 64"
          style={{
            width: '100%',
            height: '100%',
            animation: 'spin 1.5s linear infinite',
          }}
        >
          <defs>
            <linearGradient
              id="tonGradientConfirm"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#0098EA" />
              <stop offset="100%" stopColor="#00D4FF" />
            </linearGradient>
          </defs>
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="url(#tonGradientConfirm)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="120"
            strokeDashoffset="30"
          />
        </svg>
      </div>
      <h2
        style={{
          margin: '0 0 0.75rem 0',
          fontSize: '1.25rem',
          fontWeight: '700',
          color: '#0a0a0a',
          letterSpacing: '-0.02em',
        }}
      >
        Confirming Transaction
      </h2>
      <p
        style={{
          margin: '0',
          fontSize: '0.9375rem',
          color: '#6b7280',
          lineHeight: '1.5',
        }}
      >
        Verifying payment on TON blockchain...
      </p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  // ========== CONTENT RENDER ==========

  const renderContent = () => {
    const hideHeader =
      view === 'success' ||
      view === 'error' ||
      view === 'confirming-card' ||
      view === 'signless-setup' ||
      view === 'signless-unlock' ||
      view === 'redirecting-moonpay';

    return (
      <div
        ref={contentMeasureRef}
        className="pm-content"
        style={{ height: '100%' }}
        data-theme="light"
      >
        {!hideHeader && renderHeader()}
        {view === 'main' && renderMainView()}
        {(view === 'signless-setup' || view === 'signless-unlock') &&
          renderSignlessView()}
        {view === 'card' && renderCardView()}
        {view === 'confirming-card' && renderConfirmingCardView()}
        {view === 'success' && renderSuccessView()}
        {view === 'error' && renderErrorView()}
        {/* New flow views */}
        {view === 'insufficient-funds' && renderInsufficientFundsView()}
        {view === 'redirecting-moonpay' && renderRedirectingMoonPayView()}
        {view === 'card-topup' && renderCardTopUpView()}
        {view === 'awaiting-deposit' && renderAwaitingDepositView()}
        {view === 'topup-crypto' && renderTopUpCryptoView()}
        {view === 'topup-confirm' && renderTopUpConfirmView()}
        {view === 'ready-to-pay' && renderReadyToPayView()}
      </div>
    );
  };

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        detents={sheetDetent}
        initialDetent={0}
        enableSwipeToClose={view === 'main' || view === 'insufficient-funds'}
      >
        {renderContent()}
      </BottomSheet>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="pm-desktop-overlay" onClick={onClose}>
      <div
        className="pm-desktop-modal"
        data-theme="light"
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}
      </div>
    </div>
  );
};
