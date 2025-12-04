import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import BottomSheet from "../bottom-sheet/BottomSheet";
import {
  TonIconBlue,
  CloseIcon,
  BackIcon,
  CheckIcon,
  ErrorIcon,
  MenuIcon,
  CardIcon,
  CryptoIcon,
  TonPayLogo,
  InfoIcon,
} from "../icons";
import type { PaymentModalProps, PaymentViewState } from "../../types";
import "./PaymentModal.css";

const PROVIDER = { id: "moonpay", name: "Moonpay", iconClass: "icon-moonpay" };
const IFRAME_LOAD_TIMEOUT = 30000;

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPayWithCrypto,
  amount = "0.1",
  currency = "TON",
  itemTitle = "Item",
  walletAddress,
  onDisconnect,
  fetchOnRampLink,
  onRampAvailable = false,
  onPaymentSuccess,
  isLoading = false,
}) => {
  const [view, setView] = useState<PaymentViewState>("main");
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [onRampLink, setOnRampLink] = useState<string | null>(null);
  const [onRampError, setOnRampError] = useState<string | null>(null);
  const [isOnRampLoading, setIsOnRampLoading] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [sheetDetent, setSheetDetent] = useState<number[]>([0.55]);

  const iframeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchStartedRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePaymentSuccess = useCallback(() => {
    if (iframeTimeoutRef.current) {
      clearTimeout(iframeTimeoutRef.current);
    }
    setView("success");
    onPaymentSuccess?.();
    setTimeout(() => {
      onClose();
    }, 2000);
  }, [onClose, onPaymentSuccess]);

  const handlePaymentError = useCallback((errorMessage: string) => {
    if (iframeTimeoutRef.current) {
      clearTimeout(iframeTimeoutRef.current);
    }
    setIframeError(errorMessage);
    setView("error");
  }, []);

  const handleRetry = useCallback(() => {
    setOnRampLink(null);
    setOnRampError(null);
    setIframeError(null);
    setIframeLoaded(false);
    fetchStartedRef.current = false;
    setView("card");
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "TONPAY_PAYMENT_SUCCESS") {
        handlePaymentSuccess();
      }
      if (event.data?.type === "TONPAY_PAYMENT_ERROR") {
        const payload = event.data.payload;
        handlePaymentError(payload?.message || "Payment failed");
      }
      if (event.data?.type === "TONPAY_IFRAME_LOADED") {
        setIframeLoaded(true);
        if (iframeTimeoutRef.current) {
          clearTimeout(iframeTimeoutRef.current);
        }
      }
      if (event.data?.type === "TONPAY_MOONPAY_EVENT") {
        const payload = event.data.payload;
        if (
          payload?.type === "onTransactionCompleted" ||
          payload?.eventName === "transactionCompleted"
        ) {
          handlePaymentSuccess();
        }
        if (
          payload?.type === "onTransactionFailed" ||
          payload?.eventName === "transactionFailed"
        ) {
          handlePaymentError(payload?.message || "Transaction failed");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handlePaymentSuccess, handlePaymentError]);

  useEffect(() => {
    if (view !== "card") {
      fetchStartedRef.current = false;
    }
  }, [view]);

  useEffect(() => {
    if (
      view === "card" &&
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

      fetchOnRampLink(PROVIDER.id)
        .then((link: string) => {
          setOnRampLink(link);
          iframeTimeoutRef.current = setTimeout(() => {
            if (!iframeLoaded) {
              handlePaymentError(
                "Payment service is taking too long to load. Please try again."
              );
            }
          }, IFRAME_LOAD_TIMEOUT);
        })
        .catch((err: any) => {
          const errorMsg = err?.message || "Failed to initialize payment";
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
  }, [view, onRampLink, onRampError, fetchOnRampLink, iframeLoaded, handlePaymentError]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setView("main");
      setShowMenu(false);
      setOnRampLink(null);
      setOnRampError(null);
      setIframeLoaded(false);
      setIframeError(null);
      if (iframeTimeoutRef.current) {
        clearTimeout(iframeTimeoutRef.current);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const updateHeight = () => {
      if (view === "card") {
        setSheetDetent([0.9]);
        return;
      }
      if (contentRef.current) {
        const height = contentRef.current.scrollHeight;
        const windowHeight = window.innerHeight;
        const detent = Math.min((height + 40) / windowHeight, 0.95);
        setSheetDetent([detent]);
      }
    };

    setTimeout(updateHeight, 50);

    const observer = new ResizeObserver(updateHeight);
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => observer.disconnect();
  }, [view, isMobile, isOpen]);

  const handleBack = () => setView("main");

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    if (iframeTimeoutRef.current) {
      clearTimeout(iframeTimeoutRef.current);
    }
  };

  const handleIframeError = () => {
    handlePaymentError("Failed to load payment service. Please try again.");
  };

  const renderHeader = () => (
    <div className="pm-header">
      <div className="pm-header-left">
        {view !== "main" ? (
          <button className="pm-back-btn" onClick={handleBack}>
            <BackIcon />
          </button>
        ) : (
          <TonPayLogo />
        )}
      </div>
      {view !== "main" && <div className="pm-title">New Purchase</div>}
      <div className="pm-header-right">
        {walletAddress && view === "main" && (
          <div style={{ position: "relative" }}>
            <button className="pm-close-btn" onClick={() => setShowMenu(!showMenu)}>
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
          <CloseIcon size={32} />
        </button>
      </div>
    </div>
  );

  const renderMainView = () => (
    <div className="pm-body-main">
      <div className="pm-main-container">
        <h2 className="pm-main-title">New Purchase</h2>
        <div className="pm-amount-container">
          <span className="pm-amount-label">Amount</span>
          <div className="pm-amount-value">
            {amount} {currency} <TonIconBlue />
          </div>
        </div>
        <div className="pm-order-info">
          <span className="pm-order-text">{itemTitle}</span>
          <div className="pm-info-icon">
            <InfoIcon size={14} color="#004062" />
          </div>
        </div>
      </div>
      <div className="pm-actions-card">
        <div className="pm-actions">
          <button 
            className={`pm-btn ${isLoading ? 'processing' : 'pm-btn-primary'}`} 
            onClick={isLoading ? undefined : onPayWithCrypto}
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div className="pm-btn-spinner" />
                <span>Processing</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CryptoIcon />
                <span>Pay with Crypto</span>
              </div>
            )}
          </button>
          
          {isLoading && (
            <div className="pm-retry-link">
              Did the wallet fail to open?{" "}
              <span className="pm-retry-action" onClick={onPayWithCrypto}>
                Click here
              </span>
              .
            </div>
          )}

          {onRampAvailable && !isLoading && (
            <button className="pm-btn pm-btn-black" onClick={() => setView("card")}>
              <CardIcon />
              <span>Pay with Card</span>
            </button>
          )}
        </div>
        {onRampAvailable && !isLoading && (
          <div className="pm-footer">
            <span className="pm-footer-text">Processed by {PROVIDER.name}</span>
          </div>
        )}
      </div>
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
          <button className="pm-btn pm-btn-outline" onClick={handleRetry}>
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
      <p className="pm-error-text">{iframeError || "Something went wrong"}</p>
      <div className="pm-error-actions">
        <button className="pm-btn pm-btn-primary" onClick={handleRetry}>
          Try Again
        </button>
        <button className="pm-btn pm-btn-outline" onClick={onPayWithCrypto}>
          Pay with Crypto Instead
        </button>
      </div>
    </div>
  );

  const renderContent = () => (
    <div
      className="pm-content"
      style={{ height: view === "card" ? "100%" : "auto" }}
    >
      {view !== "success" && view !== "error" && renderHeader()}
      {view === "main" && renderMainView()}
      {view === "card" && renderCardView()}
      {view === "success" && renderSuccessView()}
      {view === "error" && renderErrorView()}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        detents={sheetDetent}
        initialDetent={0}
        enableSwipeToClose={view === "main"}
      >
        <div
          ref={contentRef}
          style={{ height: view === "card" ? "100%" : "auto" }}
        >
          {renderContent()}
        </div>
      </BottomSheet>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="pm-desktop-overlay" onClick={onClose}>
      <div className="pm-desktop-modal" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  );
};
