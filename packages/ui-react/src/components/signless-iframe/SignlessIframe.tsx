import * as React from 'react';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import type { TonProofData } from '../../types';
import BottomSheet from '../bottom-sheet/BottomSheet';
import {
  authenticateBiometry,
  isBiometryMounted,
  mountBiometry,
  requestBiometryAccess,
  updateBiometryToken,
} from '@telegram-apps/sdk';

export type SignlessIframeMode = 'setup' | 'payment';
export type SignlessWalletConnection = 'iframe' | 'merchant';
export type SignlessIframeTheme = 'system' | 'light' | 'dark';

export interface SignlessIframeProps {
  isOpen: boolean;
  mode: SignlessIframeMode;
  sessionId?: string;
  baseUrl?: string;
  walletConnection?: SignlessWalletConnection;
  theme?: SignlessIframeTheme;
  network?: 'mainnet' | 'testnet';

  walletAddress?: string;
  tonProofData?: TonProofData;

  amount?: string | number;
  recipient?: string;
  asset?: string;
  assetSymbol?: string;
  escrowTonBalance?: number;
  comment?: string;
  apiKey?: string;
  referenceId?: string;

  onSetupComplete?: (data: SignlessSetupResult) => void;
  onSessionReady?: (data: { walletAddress: string }) => void;
  onSigned?: (data: SignlessSignedResult) => void;
  onUseWallet?: () => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  onTopUpRequired?: (data: { asset: string; requiredAmount: string }) => void;
  onTonProofRequestStateChange?: (isRequesting: boolean) => void;
  onSetupRequired?: () => void;
  variant?: 'modal' | 'embedded';
}

export interface SignlessSetupResult {
  publicKey: string;
  walletAddress: string;
}

export interface SignlessSignedResult {
  signature: string;
  referenceId?: string;
  txHash?: string;
  pin?: string;
  sessionId?: string;
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const SIGNLESS_PERSISTED_STORAGE_KEYS = new Set<string>([
  'sl_local_vault',
  'sl_biometric_vault',
  'sl_biometric_enabled',
  'sl_biometric_key',
  'sl_biometric_credential',
  'sl_webauthn_user_id',
  'sl_recover_vault_temp',
  'sl_tonproof',
]);

function extractErrorText(payload: any): string {
  if (typeof payload === 'string') return payload;
  if (typeof payload?.message === 'string') return payload.message;
  if (typeof payload?.error === 'string') return payload.error;
  if (typeof payload?.reason === 'string') return payload.reason;
  return safeJsonStringify(payload);
}

function redactSecrets(text: string): string {
  return String(text)
    .replace(/api_key=([^\s&"]+)/gi, 'api_key=[REDACTED]')
    .replace(/Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi, 'Bearer [REDACTED]');
}

function toUserFacingSignlessErrorMessage(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return 'Payment failed. Please try again.';

  const lowered = s.toLowerCase();
  const looksLikeBackendDump =
    s.length > 220 ||
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
    return 'Payment failed. Please try again or pay with a wallet.';
  return s;
}

const SIGNLESS_IFRAME_SHELL_CSS = `
.tp-signless-shell {
  color-scheme: light;
  --slw-container-bg: #FFFFFF;
  --slw-iframe-bg: #FFFFFF;
  --slw-header-border: #eee;
  --slw-header-bg: rgba(255, 255, 255, 0.92);
  --slw-text: #000000;
  --slw-loading-text: #666666;
  --slw-spinner-track: #E5E5E5;
  --slw-btn-border: rgba(0, 0, 0, 0.10);
  --slw-btn-bg: rgba(0, 0, 0, 0.04);
  --slw-btn-bg-pressed: rgba(0, 0, 0, 0.08);

  background: var(--slw-container-bg);
  color: var(--slw-text);
}

.tp-signless-shell .signless-header {
  border-bottom: 1px solid var(--slw-header-border);
  background: var(--slw-header-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 8px;
}

.tp-signless-shell .signless-title {
  font-weight: 650;
  font-size: 16px;
  letter-spacing: -0.01em;
  padding-top: 4px;
}

.tp-signless-shell .signless-close-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid var(--slw-btn-border);
  background: var(--slw-btn-bg);
  color: var(--slw-text);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  font-size: 20px;
  line-height: 1;
}

.tp-signless-shell .signless-close-btn:active {
  background: var(--slw-btn-bg-pressed);
}

@media (hover: hover) {
  .tp-signless-shell .signless-close-btn:hover {
    background: var(--slw-btn-bg-pressed);
  }
}
`;

const IFRAME_STYLES: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: 'none',
  zIndex: 10001,
};

const CONTAINER_STYLES: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  height: '90%',
  maxHeight: '700px',
  borderRadius: '20px 20px 0 0',
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
};

const LOADING_STYLES: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
};

const SPINNER_STYLES: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '3px solid var(--slw-spinner-track)',
  borderTopColor: '#0098EA',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

type BaseIframeProps = Omit<
  SignlessIframeProps,
  'walletAddress' | 'tonProofData' | 'walletConnection'
> & {
  walletMode: 'internal' | 'merchant';
  walletAddress?: string;
  tonProofData?: TonProofData;
};

function buildSignlessIframeUrl(baseUrl: string, sessionId: string) {
  const url = `${baseUrl}/api/signless/iframe/${sessionId}`;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}theme=light`;
}

function useSignlessIframeSession(
  isOpen: boolean,
  propSessionId: string | undefined,
  baseUrl: string,
  walletAddress?: string,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(
    propSessionId || null,
  );
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const sessionCreationAttempted = useRef(false);
  const lastWalletAddressRef = useRef<string | undefined>(walletAddress);

  const generateLocalSessionId = () =>
    Math.random().toString(36).substring(2) + Date.now().toString(36);

  const SESSION_STORAGE_KEY = 'signless_session_id';
  const SESSION_EXPIRY_MS = 30 * 60 * 1000;

  const isSessionExpired = (storedSessionId: string | null): boolean => {
    if (!storedSessionId) return true;
    const stored = JSON.parse(storedSessionId || '{}');
    return stored.expiresAt ? Date.now() > stored.expiresAt : true;
  };

  const normalizeAddress = (address: string): string => {
    if (!address || address.length < 3) return address;
    return address.slice(2);
  };

  useEffect(() => {
    if (!walletAddress) return;
    const prevAddress = lastWalletAddressRef.current;
    lastWalletAddressRef.current = walletAddress;

    if (
      prevAddress &&
      normalizeAddress(prevAddress) !== normalizeAddress(walletAddress)
    ) {
      console.log(
        '[SignlessIframe] Wallet address changed from',
        prevAddress,
        'to',
        walletAddress,
        '- clearing session and signless keys',
      );
      setSessionId(null);
      setIframeUrl(null);
      sessionCreationAttempted.current = false;
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        // Also clear all signless keys - they are tied to the old escrow wallet
        for (const key of SIGNLESS_PERSISTED_STORAGE_KEYS) {
          localStorage.removeItem(key);
        }
        console.log('[SignlessIframe] Cleared signless keys for wallet change');
      } catch (e) {
        console.warn(
          '[SignlessIframe] Failed to clear session/keys from localStorage:',
          e,
        );
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    console.log(
      '[SignlessIframe] Mount effect running - propSessionId:',
      propSessionId,
      'baseUrl:',
      baseUrl,
      'walletAddress:',
      walletAddress,
    );
    try {
      const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      console.log('[SignlessIframe] Session from localStorage:', storedSession);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        const expired = isSessionExpired(storedSession);
        const sessionWalletMismatch =
          parsed.walletAddress &&
          walletAddress &&
          normalizeAddress(parsed.walletAddress) !==
            normalizeAddress(walletAddress);
        console.log(
          '[SignlessIframe] Parsed session:',
          parsed,
          'expired:',
          expired,
          'walletMismatch:',
          sessionWalletMismatch,
        );
        if (!expired && !propSessionId && !sessionWalletMismatch) {
          console.log(
            '[SignlessIframe] ✓ Restoring session from localStorage:',
            parsed.sessionId,
          );
          setSessionId(parsed.sessionId);
          setIframeUrl(buildSignlessIframeUrl(baseUrl, parsed.sessionId));
          setIsSessionLoaded(true);
        } else {
          if (sessionWalletMismatch) {
            console.log(
              '[SignlessIframe] ✗ Not restoring session - wallet address mismatch (stored:',
              parsed.walletAddress,
              'current:',
              walletAddress,
              ')',
            );
            localStorage.removeItem(SESSION_STORAGE_KEY);
          } else {
            console.log(
              '[SignlessIframe] ✗ Not restoring session - expired:',
              expired,
              'or propSessionId exists:',
              !!propSessionId,
            );
          }
          setIsSessionLoaded(true);
        }
      } else {
        console.log(
          '[SignlessIframe] ✗ No stored session found in localStorage',
        );
        setIsSessionLoaded(true);
      }
    } catch (e) {
      console.warn(
        '[SignlessIframe] Failed to load session from localStorage:',
        e,
      );
      setIsSessionLoaded(true);
    }
  }, [propSessionId, baseUrl, walletAddress]);

  useEffect(() => {
    console.log(
      '[SignlessIframe] isOpen effect running - isOpen:',
      isOpen,
      'propSessionId:',
      propSessionId,
      'sessionId:',
      sessionId,
      'iframeUrl:',
      iframeUrl,
      'isSessionLoaded:',
      isSessionLoaded,
    );

    if (!isOpen) {
      console.log(
        '[SignlessIframe] Modal closed, clearing iframeUrl only, keeping sessionId',
      );
      setIframeUrl(null);
      setLoading(true);
      sessionCreationAttempted.current = false;
      return;
    }

    if (!isSessionLoaded) {
      console.log(
        '[SignlessIframe] Session not loaded yet from localStorage, waiting...',
      );
      return;
    }

    if (propSessionId) {
      console.log(
        '[SignlessIframe] Using provided propSessionId:',
        propSessionId,
        'current sessionId:',
        sessionId,
      );
      if (sessionId !== propSessionId) setSessionId(propSessionId);
      if (!iframeUrl)
        setIframeUrl(buildSignlessIframeUrl(baseUrl, propSessionId));
      return;
    }

    if (sessionId && iframeUrl) {
      console.log(
        '[SignlessIframe] ✓ Session already loaded with URL:',
        sessionId,
        'skip creation',
      );
      return;
    }

    if (sessionId && !iframeUrl) {
      console.log(
        '[SignlessIframe] ✓ Reusing existing session:',
        sessionId,
        'rebuilding iframe URL',
      );
      setIframeUrl(buildSignlessIframeUrl(baseUrl, sessionId));
      return;
    }

    console.log(
      '[SignlessIframe] ✗ No sessionId found, will create new session - sessionId:',
      sessionId,
      'sessionCreationAttempted:',
      sessionCreationAttempted.current,
    );

    if (sessionCreationAttempted.current) return;
    sessionCreationAttempted.current = true;

    const createSession = async () => {
      console.log('[SignlessIframe] Creating new session on backend...');
      let sid = generateLocalSessionId();
      try {
        const res = await fetch(`${baseUrl}/api/signless/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = await res.json();
          sid = data.sessionId;
          console.log('[SignlessIframe] Backend created session:', sid);
        }
      } catch (e) {
        console.warn(
          '[SignlessIframe] Failed to create signless session on backend, using local ID',
          e,
        );
      }
      setSessionId(sid);
      setIframeUrl(buildSignlessIframeUrl(baseUrl, sid));

      // Persist session to localStorage with wallet address for validation
      const sessionData = {
        sessionId: sid,
        expiresAt: Date.now() + SESSION_EXPIRY_MS,
        walletAddress: walletAddress || null,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      console.log(
        '[SignlessIframe] Created and persisted new session:',
        sid,
        'for wallet:',
        walletAddress,
      );
    };

    createSession();
  }, [
    isOpen,
    propSessionId,
    baseUrl,
    iframeUrl,
    sessionId,
    isSessionLoaded,
    walletAddress,
  ]);

  const sendMessage = useCallback(
    (type: string, payload: any) => {
      if (!iframeRef.current?.contentWindow) return;
      const targetOrigin = (() => {
        if (!iframeUrl) return '*';
        try {
          return new URL(iframeUrl).origin;
        } catch {
          return '*';
        }
      })();
      iframeRef.current.contentWindow.postMessage(
        { type, payload },
        targetOrigin,
      );
    },
    [iframeUrl],
  );

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const resetSession = useCallback(() => {
    console.log(
      '[SignlessIframe] resetSession called - clearing all session data',
    );
    setSessionId(null);
    setIframeUrl(null);
    sessionCreationAttempted.current = false;
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      for (const key of SIGNLESS_PERSISTED_STORAGE_KEYS) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(
        '[SignlessIframe] Failed to clear localStorage on reset:',
        e,
      );
    }
  }, []);

  return {
    iframeRef,
    loading,
    sessionId,
    iframeUrl,
    sendMessage,
    handleIframeLoad,
    resetSession,
  };
}

const MIN_SHEET_HEIGHT_PX = 450;

const SignlessIframeBase: React.FC<
  BaseIframeProps & {
    onParentMessage: (
      data: { type: string; payload: any },
      sendMessage: (type: string, payload: any) => void,
    ) => void;
    isWalletReady: boolean;
  }
> = ({
  isOpen,
  mode,
  sessionId: propSessionId,
  baseUrl = '',
  walletMode,
  walletAddress,
  tonProofData,
  amount,
  recipient,
  asset = 'TON',
  assetSymbol,
  escrowTonBalance,
  comment,
  apiKey,
  referenceId,
  onSetupComplete,
  onSessionReady,
  onSigned,
  onError,
  onClose,
  onTopUpRequired,
  onSetupRequired,
  variant = 'modal',
  onParentMessage,
  isWalletReady,
  network,
}) => {
  const {
    iframeRef,
    loading,
    iframeUrl,
    sendMessage,
    handleIframeLoad,
    resetSession,
  } = useSignlessIframeSession(isOpen, propSessionId, baseUrl, walletAddress);

  const initialMessageSentRef = useRef(false);
  const activeModeRef = useRef<'setup' | 'payment'>(mode);

  useEffect(() => {
    if (!isOpen) {
      initialMessageSentRef.current = false;
    }
  }, [isOpen]);

  const sheetDetents = useMemo(() => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const minDetent = Math.max(MIN_SHEET_HEIGHT_PX / vh, 0.5);
    return [Math.min(minDetent, 0.9), 0.9];
  }, []);

  const initialSheetDetent = useMemo(() => {
    return mode === 'payment' ? 1 : 0;
  }, [mode]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      const isFromOurIframe = event.source === iframeRef.current?.contentWindow;

      if (!isFromOurIframe) return;

      const replyStorage = (resultPayload: any) => {
        if (!iframeRef.current?.contentWindow) return;
        const targetOrigin = (() => {
          if (!iframeUrl) return '*';
          try {
            return new URL(iframeUrl).origin;
          } catch {
            return '*';
          }
        })();
        iframeRef.current.contentWindow.postMessage(
          { type: 'SIGNLESS_STORAGE_RESULT', payload: resultPayload },
          targetOrigin,
        );
      };

      const replyBiometry = (resultPayload: any) => {
        if (!iframeRef.current?.contentWindow) return;
        const targetOrigin = (() => {
          if (!iframeUrl) return '*';
          try {
            return new URL(iframeUrl).origin;
          } catch {
            return '*';
          }
        })();
        iframeRef.current.contentWindow.postMessage(
          { type: 'SIGNLESS_TG_BIOMETRY_RESULT', payload: resultPayload },
          targetOrigin,
        );
      };

      if (
        type === 'SIGNLESS_STORAGE_GET' ||
        type === 'SIGNLESS_STORAGE_SET' ||
        type === 'SIGNLESS_STORAGE_REMOVE'
      ) {
        const reqId = payload?.reqId;
        const key = typeof payload?.key === 'string' ? payload.key : '';
        const op =
          type === 'SIGNLESS_STORAGE_GET'
            ? 'get'
            : type === 'SIGNLESS_STORAGE_SET'
              ? 'set'
              : 'remove';

        if (!reqId || !key || !SIGNLESS_PERSISTED_STORAGE_KEYS.has(key)) {
          replyStorage({
            reqId,
            ok: false,
            op,
            key,
            error: 'Unauthorized key',
          });
          return;
        }

        try {
          if (type === 'SIGNLESS_STORAGE_GET') {
            const value = localStorage.getItem(key);
            replyStorage({ reqId, ok: true, op, key, value });
            return;
          }

          if (type === 'SIGNLESS_STORAGE_SET') {
            const value =
              typeof payload?.value === 'string' ? payload.value : '';
            localStorage.setItem(key, value);
            replyStorage({ reqId, ok: true, op, key, value: null });

            return;
          }

          localStorage.removeItem(key);
          replyStorage({ reqId, ok: true, op, key, value: null });

          return;
        } catch (e: any) {
          replyStorage({
            reqId,
            ok: false,
            op,
            key,
            error:
              typeof e?.message === 'string'
                ? e.message
                : 'Storage operation failed',
          });

          return;
        }
      }

      const ensureBiometryReady = async () => {
        if (mountBiometry.isAvailable() && !isBiometryMounted()) {
          await mountBiometry(undefined as any);
        }
      };

      if (
        type === 'SIGNLESS_TG_BIOMETRY_REQUEST_ACCESS' ||
        type === 'SIGNLESS_TG_BIOMETRY_AUTH' ||
        type === 'SIGNLESS_TG_BIOMETRY_UPDATE_TOKEN'
      ) {
        const reqId = payload?.reqId;
        try {
          await ensureBiometryReady();

          if (type === 'SIGNLESS_TG_BIOMETRY_REQUEST_ACCESS') {
            const granted = requestBiometryAccess.isAvailable()
              ? await requestBiometryAccess()
              : false;
            replyBiometry({ reqId, ok: true, granted });
            return;
          }

          if (type === 'SIGNLESS_TG_BIOMETRY_UPDATE_TOKEN') {
            const token =
              typeof payload?.token === 'string' ? payload.token : undefined;
            const reason =
              typeof payload?.reason === 'string' ? payload.reason : undefined;
            const updated = updateBiometryToken.isAvailable()
              ? await updateBiometryToken({ token, reason })
              : false;
            replyBiometry({ reqId, ok: true, updated });
            return;
          }

          if (type === 'SIGNLESS_TG_BIOMETRY_AUTH') {
            const reason =
              typeof payload?.reason === 'string' ? payload.reason : undefined;
            const { status, token } = authenticateBiometry.isAvailable()
              ? await authenticateBiometry(reason ? { reason } : {})
              : { status: 'failed' as const, token: undefined };
            replyBiometry({ reqId, ok: true, status, token });
            return;
          }
        } catch (e: any) {
          replyBiometry({
            reqId,
            ok: false,
            error:
              typeof e?.message === 'string' ? e.message : 'Biometry failed',
          });
          return;
        }
      }

      if (type === 'SIGNLESS_READY') {
        sendMessage('SIGNLESS_SET_THEME', { theme: 'light' });
        const reportedMode =
          payload?.mode === 'setup' || payload?.mode === 'payment'
            ? payload.mode
            : null;
        const effectiveMode = reportedMode ?? mode;
        const force = payload?.force === true;

        if (
          !force &&
          initialMessageSentRef.current &&
          activeModeRef.current === effectiveMode
        )
          return;
        initialMessageSentRef.current = true;
        activeModeRef.current = effectiveMode;

        if (effectiveMode === 'setup') {
          sendMessage('SIGNLESS_START_SETUP', {
            walletMode,
            walletAddress,
            network: network || tonProofData?.network,
            publicKey: tonProofData?.publicKey,
            proof: tonProofData?.proof,
            asset,
            assetSymbol,
            escrowTonBalance,
            amount,
          });
        } else {
          sendMessage('SIGNLESS_INTENT', {
            walletMode,
            walletAddress,
            network: network || tonProofData?.network,
            amount,
            recipient,
            asset,
            assetSymbol,
            escrowTonBalance,
            comment,
            apiKey,
            referenceId,
          });
        }
        return;
      }

      onParentMessage({ type, payload }, sendMessage);

      switch (type) {
        case 'SIGNLESS_SUCCESS':
          if (activeModeRef.current === 'setup') {
            onSetupComplete?.(payload);
          } else {
            onSigned?.(payload);
          }
          break;
        case 'SIGNLESS_SESSION_READY':
          activeModeRef.current = 'payment';
          sendMessage('SIGNLESS_INTENT', {
            walletMode,
            walletAddress: payload?.walletAddress || walletAddress,
            network: network || tonProofData?.network,
            amount,
            recipient,
            asset,
            assetSymbol,
            escrowTonBalance,
            comment,
            apiKey,
            referenceId,
          });
          onSessionReady?.(payload);
          break;
        case 'TONPAY_PAYMENT_SUCCESS':
          if (mode !== 'setup') {
            onSigned?.(payload);
          }
          break;
        case 'SIGNLESS_CANCEL':
          onClose?.();
          break;
        case 'TONPAY_PAYMENT_ERROR':
          if (mode !== 'setup') {
            const rawText = extractErrorText(payload);
            const redacted = redactSecrets(rawText);
            console.error('[SignlessIframe] Payment failed', {
              type,
              error: redacted,
              payload,
            });
            onError?.(toUserFacingSignlessErrorMessage(redacted));
          }
          break;
        case 'SIGNLESS_TOP_UP_REQUIRED':
          onTopUpRequired?.(payload);
          onClose?.();
          break;
        case 'SIGNLESS_KEY_MISMATCH':
          onError?.(
            'Your local keys do not match the registered account. Please disconnect and reconnect your wallet to re-setup.',
          );
          onClose?.();
          break;
        case 'SIGNLESS_WALLET_DISCONNECTED':
          // User disconnected wallet inside iframe - clear all local data and close modal
          console.log(
            '[SignlessIframe] Wallet disconnected in iframe - clearing all signless data',
          );
          resetSession();
          onClose?.();
          break;
        case 'SIGNLESS_ERROR':
        case 'SIGNLESS_FAILURE':
          {
            const rawText = extractErrorText(payload);
            const redacted = redactSecrets(rawText);
            console.error('[SignlessIframe] Signless flow failed', {
              type,
              error: redacted,
              payload,
            });
            onError?.(toUserFacingSignlessErrorMessage(redacted));
          }
          break;
        case 'SIGNLESS_SETUP_REQUIRED':
          console.log(
            '[SignlessIframe] Setup required - resetting for setup mode',
          );
          activeModeRef.current = 'setup';
          sendMessage('SIGNLESS_START_SETUP', {
            walletMode,
            walletAddress,
            network: network || tonProofData?.network,
            publicKey: tonProofData?.publicKey,
            proof: tonProofData?.proof,
            asset,
            assetSymbol,
            escrowTonBalance,
            amount,
          });
          initialMessageSentRef.current = true;
          onSetupRequired?.();
          break;
        case 'SIGNLESS_ESCROW_TOPUP_CONFIRMED':
          console.log(
            '[SignlessIframe] Escrow topup confirmed, resending intent for payment retry',
          );
          sendMessage('SIGNLESS_INTENT', {
            walletMode,
            walletAddress: payload?.walletAddress || walletAddress,
            network: network || tonProofData?.network,
            amount,
            recipient,
            asset,
            assetSymbol,
            escrowTonBalance,
            comment,
            apiKey,
            referenceId,
          });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    isOpen,
    onSetupComplete,
    onSessionReady,
    onSigned,
    onError,
    onClose,
    onTopUpRequired,
    mode,
    sendMessage,
    walletAddress,
    tonProofData,
    amount,
    recipient,
    asset,
    assetSymbol,
    escrowTonBalance,
    comment,
    apiKey,
    referenceId,
    onParentMessage,
    walletMode,
    network,
    resetSession,
  ]);

  useEffect(() => {
    if (isOpen && !isWalletReady) {
      onError?.('Wallet not connected. Please connect your wallet first.');
      onClose?.();
    }
  }, [isOpen, isWalletReady, onError, onClose]);

  if (!isOpen || !isWalletReady) return null;

  const content = (
    <div
      className="tp-signless-shell"
      data-theme="light"
      style={{
        ...(variant === 'modal'
          ? {
              display: 'flex',
              flexDirection: 'column' as const,
              height: '100%',
              overflow: 'hidden',
            }
          : {
              ...CONTAINER_STYLES,
              borderRadius: 0,
              maxHeight: 'none',
              minHeight: 0,
              height: '100%',
              maxWidth: 'none',
            }),
      }}
    >
      <div className="signless-header">
        <div className="signless-title">TON Pay</div>
        <button
          className="signless-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {loading && (
        <div style={{ ...LOADING_STYLES, color: 'var(--slw-loading-text)' }}>
          <div style={SPINNER_STYLES} />
          <span>Loading...</span>
        </div>
      )}
      {iframeUrl && (
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          style={{
            ...IFRAME_STYLES,
            position: 'relative',
            opacity: loading ? 0 : 1,
            flex: 1,
            height: '100%',
            background: 'var(--slw-iframe-bg)',
          }}
          onLoad={handleIframeLoad}
          title="Signless"
          allow="publickey-credentials-get; publickey-credentials-create; camera"
        />
      )}
    </div>
  );

  if (variant === 'embedded') {
    return (
      <>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          ${SIGNLESS_IFRAME_SHELL_CSS}
        `}</style>
        {content}
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ${SIGNLESS_IFRAME_SHELL_CSS}
      `}</style>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        detents={sheetDetents}
        initialDetent={initialSheetDetent}
        minHeight={`${MIN_SHEET_HEIGHT_PX}px`}
        maxHeight="90vh"
        enableSwipeToClose={true}
        enableBackdropClose={true}
      >
        {content}
      </BottomSheet>
    </>
  );
};

const SignlessIframeIframeWallet: React.FC<SignlessIframeProps> = (props) => {
  const onParentMessage = useCallback(() => {}, []);
  return (
    <SignlessIframeBase
      {...props}
      walletMode="internal"
      isWalletReady={true}
      onParentMessage={onParentMessage}
    />
  );
};

export const SignlessIframe: React.FC<SignlessIframeProps> = (props) => {
  return <SignlessIframeIframeWallet {...props} />;
};

export default SignlessIframe;
