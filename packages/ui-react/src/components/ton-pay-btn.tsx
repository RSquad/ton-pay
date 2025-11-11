import { useTonAddress, useTonConnectModal, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { CHAIN, toUserFriendlyAddress } from "@tonconnect/ui";
import { useEffect, useState } from "react";
import { NotificationRoot } from "./notification/Notification";
import { ErrorTransactionNotification } from "./notification/ErrorTransactionNotification";

type TonPayPreset = "default" | "gradient";

type TonPayButtonProps = {
    handlePay: () => Promise<void>,
    isLoading?: boolean,
    variant?: "long" | "short",
    preset?: TonPayPreset,
    onError?: (error: unknown) => void,
    showErrorNotification?: boolean,
    bgColor?: string,
    textColor?: string,
    borderRadius?: number | string,
    fontFamily?: string,
    width?: number | string,
    height?: number | string,
    text?: string,
    loadingText?: string,
    style?: Record<string, any>,
    className?: string,
    showMenu?: boolean,
    disabled?: boolean,
}

const PRESETS: Record<TonPayPreset, { bgColor: string, textColor: string }> = {
    default: {
        bgColor: "#0098EA",
        textColor: "#FFFFFF",
    },
    gradient: {
        bgColor: "linear-gradient(91.69deg, #2A82EB 8.9%, #0355CF 158.29%)",
        textColor: "#FFFFFF",
    },
};

const stylesAndAnimations = `
  @keyframes tp-pulse { 0%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.02)} 100%{opacity:1;transform:scale(1)} }
  @keyframes tp-fade-in { from{opacity:0;transform:translateY(-4px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes tp-spin { to{transform:rotate(360deg)} }
  .tp-wrap{display:inline-flex;flex-direction:column;position:relative;width:var(--tp-width,300px);max-width:100%}
  .tp-btn-container{display:flex;flex-direction:row;width:100%}
  .tp-btn{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:13px 10px;gap:10px;flex:1;min-height:var(--tp-height,44px);background:var(--tp-bg,#0098EA);color:var(--tp-text,#fff);border:none;border-radius:var(--tp-radius,8px) 0 0 var(--tp-radius,8px);cursor:pointer;transition:filter .12s ease, transform .12s ease;font-family:var(--tp-font,inherit);font-style:normal;font-weight:500;font-size:20px;line-height:25px;text-align:center;position:relative}
  .tp-btn.with-menu{padding-left:calc(10px + (var(--tp-height,44px))/2)}
  .tp-btn.no-menu{border-radius:var(--tp-radius,8px)}
  .tp-btn-content{display:flex;flex-direction:row;align-items:center;padding:0;gap:5px;white-space:nowrap;margin-top:-4px}
  .tp-btn-content svg{margin-top:4px}
  .tp-btn:hover:not(:disabled){filter:brightness(0.92)}
  .tp-btn:active:not(:disabled){filter:brightness(0.85);transform:translateY(1px)}
  .tp-btn:disabled{cursor:not-allowed;opacity:.85}
  .tp-btn.loading{animation:none}
  .tp-arrow{display:flex;align-items:center;justify-content:center;padding:13px 10px;min-width:calc(var(--tp-height,44px));min-height:var(--tp-height,44px);background:var(--tp-bg,#0098EA);color:var(--tp-text,#fff);border:none;border-left:1px solid rgba(255,255,255,.2);border-radius:0 var(--tp-radius,8px) var(--tp-radius,8px) 0;cursor:pointer;transition:filter .12s ease, transform .12s ease;font-size:14px}
  .tp-arrow:hover:not(:disabled){filter:brightness(0.92)}
  .tp-arrow:active:not(:disabled){filter:brightness(0.85);transform:translateY(1px)}
  .tp-arrow:disabled{cursor:not-allowed;opacity:.85;transition:none;filter:none;transform:none}
  .tp-menu{position:absolute;right:0;top:calc(100% + 8px);width:256px;background:var(--tp-menu-bg,#ffffff);color:var(--tp-menu-text,#111827);border:1px solid rgba(0,0,0,.08);border-radius:var(--tp-menu-radius,16px);padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:1000;animation:tp-fade-in .15s ease}
  .tp-menu-arrow{position:absolute;top:-8px;right:20px;width:0;height:0;border-style:solid;border-width:0 8px 8px 8px;border-color:transparent transparent var(--tp-menu-bg,#ffffff) transparent;filter:drop-shadow(0 -1px 1px rgba(0,0,0,.08))}
  .tp-menu-address{padding:.5rem .75rem;font-size:.85rem;color:var(--tp-menu-muted,#6b7280);cursor:default;user-select:text}
  .tp-menu-item{display:flex;align-items:center;gap:8px;width:100%;height:40px;padding-left:12px;padding-right:12px;border:none;background:transparent;text-align:left;cursor:pointer;font-size:15px;font-weight:590;color:var(--tp-menu-text,#111827);transition:background-color .15s ease, transform .1s ease-in-out;border-radius:8px;margin:2px}
  .tp-menu-item:hover:not(:disabled){background:var(--tp-menu-hover,rgba(0,0,0,.06))}
  .tp-menu-item:active{transform:scale(0.96)}
  .tp-menu-item.danger{color:#e74c3c}
  .tp-menu-item.danger:hover:not(:disabled){background:rgba(231,76,60,.12);color:#c0392b}
  .tp-menu-item:disabled{cursor:default;opacity:1;color:var(--tp-menu-muted,#6b7280)}
  .tp-menu-item:disabled:hover{background:transparent}
  .tp-menu-icon{width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:currentColor}
  .tp-menu-item:disabled .tp-menu-icon{opacity:.5}
  .tp-spinner{border:2px solid rgba(255,255,255,.35);border-top-color:var(--tp-text,#fff);border-radius:50%;width:18px;height:18px;animation:tp-spin .6s linear infinite}
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = stylesAndAnimations;
    document.head.appendChild(style);
}

const TonGlyph = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <g clipPath="url(#clip0_144_4719)">
            <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37257 18.6274 0 12 0C5.37257 0 0 5.37257 0 12C0 18.6274 5.37257 24 12 24Z" fill="#0098EA"/>
            <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37257 18.6274 0 12 0C5.37257 0 0 5.37257 0 12C0 18.6274 5.37257 24 12 24Z" fill="white"/>
            <path d="M16.0972 6.69763H7.9022C6.39543 6.69763 5.4404 8.32299 6.19846 9.63695L11.2561 18.4033C11.5862 18.9757 12.4133 18.9757 12.7433 18.4033L17.802 9.63695C18.559 8.32509 17.604 6.69763 16.0982 6.69763H16.0972ZM11.252 15.7744L10.1505 13.6426L7.49278 8.88922C7.31746 8.58497 7.53401 8.1951 7.90117 8.1951H11.251V15.7754L11.252 15.7744ZM16.5046 8.88819L13.8479 13.6437L12.7464 15.7744V8.19407H16.0962C16.4633 8.19407 16.6799 8.58395 16.5046 8.88819Z" fill="#0098EA"/>
        </g>
        <defs>
            <clipPath id="clip0_144_4719">
                <rect width="24" height="24" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);

const CopyGlyph = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7.76228 2.09998H10.2378C11.0458 2.09997 11.7067 2.09996 12.2438 2.14384C12.7997 2.18926 13.3017 2.28614 13.7706 2.52505C14.5045 2.89896 15.1011 3.49558 15.475 4.22941C15.7139 4.6983 15.8108 5.20038 15.8562 5.75629C15.9001 6.29337 15.9001 6.95422 15.9001 7.76227V8.1H16.2377C17.0457 8.09999 17.7066 8.09998 18.2437 8.14386C18.7996 8.18928 19.3017 8.28616 19.7705 8.52507C20.5044 8.89898 21.101 9.4956 21.4749 10.2294C21.7138 10.6983 21.8107 11.2004 21.8561 11.7563C21.9 12.2934 21.9 12.9542 21.9 13.7623V16.2377C21.9 17.0458 21.9 17.7066 21.8561 18.2437C21.8107 18.7996 21.7138 19.3017 21.4749 19.7706C21.101 20.5044 20.5044 21.101 19.7705 21.4749C19.3017 21.7138 18.7996 21.8107 18.2437 21.8561C17.7066 21.9 17.0458 21.9 16.2378 21.9H13.7623C12.9543 21.9 12.2934 21.9 11.7563 21.8561C11.2004 21.8107 10.6983 21.7138 10.2294 21.4749C9.49561 21.101 8.89898 20.5044 8.52508 19.7706C8.28616 19.3017 8.18928 18.7996 8.14386 18.2437C8.09998 17.7066 8.09999 17.0458 8.1 16.2377V15.9H7.76227C6.95426 15.9 6.29335 15.9 5.75629 15.8561C5.20038 15.8107 4.6983 15.7138 4.22941 15.4749C3.49558 15.101 2.89896 14.5044 2.52505 13.7705C2.28614 13.3017 2.18926 12.7996 2.14384 12.2437C2.09996 11.7066 2.09997 11.0458 2.09998 10.2377V7.76228C2.09997 6.95424 2.09996 6.29336 2.14384 5.75629C2.18926 5.20038 2.28614 4.6983 2.52505 4.22941C2.89896 3.49558 3.49558 2.89896 4.22941 2.52505C4.6983 2.28614 5.20038 2.18926 5.75629 2.14384C6.29336 2.09996 6.95425 2.09997 7.76228 2.09998ZM8.1 14.1V13.7623C8.09999 12.9542 8.09998 12.2934 8.14386 11.7563C8.18928 11.2004 8.28616 10.6983 8.52508 10.2294C8.89898 9.4956 9.49561 8.89898 10.2294 8.52507C10.6983 8.28616 11.2004 8.18928 11.7563 8.14386C12.2934 8.09998 12.9542 8.09999 13.7623 8.1H14.1001V7.79998C14.1001 6.94505 14.0994 6.35798 14.0622 5.90287C14.0259 5.45827 13.9593 5.21944 13.8712 5.0466C13.6699 4.65146 13.3486 4.3302 12.9535 4.12886C12.7806 4.04079 12.5418 3.97419 12.0972 3.93786C11.6421 3.90068 11.055 3.89998 10.2001 3.89998H7.79998C6.94505 3.89998 6.35798 3.90068 5.90287 3.93786C5.45827 3.97419 5.21944 4.04079 5.0466 4.12886C4.65146 4.3302 4.3302 4.65146 4.12886 5.0466C4.04079 5.21944 3.97419 5.45827 3.93786 5.90287C3.90068 6.35798 3.89998 6.94505 3.89998 7.79998V10.2C3.89998 11.0549 3.90068 11.642 3.93786 12.0971C3.97419 12.5417 4.04079 12.7805 4.12886 12.9534C4.3302 13.3485 4.65146 13.6698 5.0466 13.8711C5.21944 13.9592 5.45827 14.0258 5.90287 14.0621C6.35798 14.0993 6.94505 14.1 7.79998 14.1H8.1ZM11.0466 10.1289C11.2195 10.0408 11.4583 9.97421 11.9029 9.93788C12.358 9.9007 12.9451 9.9 13.8 9.9H16.2C17.0549 9.9 17.642 9.9007 18.0971 9.93788C18.5417 9.97421 18.7805 10.0408 18.9534 10.1289C19.3485 10.3302 19.6698 10.6515 19.8711 11.0466C19.9592 11.2195 20.0258 11.4583 20.0621 11.9029C20.0993 12.358 20.1 12.9451 20.1 13.8V16.2C20.1 17.0549 20.0993 17.642 20.0621 18.0971C20.0258 18.5417 19.9592 18.7805 19.8711 18.9534C19.6698 19.3485 19.3485 19.6698 18.9534 19.8711C18.7805 19.9592 18.5417 20.0258 18.0971 20.0621C17.642 20.0993 17.0549 20.1 16.2 20.1H13.8C12.9451 20.1 12.358 20.0993 11.9029 20.0621C11.4583 20.0258 11.2195 19.9592 11.0466 19.8711C10.6515 19.6698 10.3302 19.3485 10.1289 18.9534C10.0408 18.7805 9.97421 18.5417 9.93788 18.0971C9.9007 17.642 9.9 17.0549 9.9 16.2V13.8C9.9 12.9451 9.9007 12.358 9.93788 11.9029C9.97421 11.4583 10.0408 11.2195 10.1289 11.0466C10.3302 10.6515 10.6515 10.3302 11.0466 10.1289Z"
            fill="currentColor"
        />
    </svg>
);

const DisconnectGlyph = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
            d="M8.7624 3.10001C7.95435 3.1 7.29349 3.09999 6.75642 3.14387C6.2005 3.18929 5.69842 3.28617 5.22954 3.52508C4.4957 3.89899 3.89908 4.49561 3.52517 5.22944C3.28626 5.69833 3.18938 6.20041 3.14396 6.75632C3.10008 7.2934 3.10009 7.95424 3.1001 8.76229V15.2377C3.10009 16.0458 3.10008 16.7066 3.14396 17.2437C3.18938 17.7996 3.28626 18.3017 3.52517 18.7706C3.89908 19.5044 4.4957 20.101 5.22954 20.4749C5.69842 20.7138 6.2005 20.8107 6.75642 20.8561C7.29349 20.9 7.95434 20.9 8.76239 20.9H12.0001C12.4972 20.9 12.9001 20.4971 12.9001 20C12.9001 19.503 12.4972 19.1 12.0001 19.1H8.8001C7.94517 19.1 7.3581 19.0993 6.90299 19.0621C6.45839 19.0258 6.21956 18.9592 6.04672 18.8711C5.65158 18.6698 5.33032 18.3485 5.12898 17.9534C5.04092 17.7805 4.97431 17.5417 4.93798 17.0971C4.9008 16.642 4.9001 16.0549 4.9001 15.2V8.80001C4.9001 7.94508 4.9008 7.35801 4.93798 6.9029C4.97431 6.4583 5.04092 6.21947 5.12898 6.04663C5.33032 5.65149 5.65158 5.33023 6.04672 5.12889C6.21956 5.04082 6.45839 4.97422 6.90299 4.93789C7.3581 4.90071 7.94517 4.90001 8.8001 4.90001H12.0001C12.4972 4.90001 12.9001 4.49706 12.9001 4.00001C12.9001 3.50295 12.4972 3.10001 12.0001 3.10001H8.7624Z"
            fill="currentColor"
        />
        <path
            d="M17.6364 7.3636C17.2849 7.01212 16.7151 7.01212 16.3636 7.3636C16.0121 7.71507 16.0121 8.28492 16.3636 8.63639L18.8272 11.1H9.00001C8.50295 11.1 8.10001 11.5029 8.10001 12C8.10001 12.497 8.50295 12.9 9.00001 12.9H18.8272L16.3636 15.3636C16.0121 15.7151 16.0121 16.2849 16.3636 16.6364C16.7151 16.9879 17.2849 16.9879 17.6364 16.6364L21.6364 12.6364C21.9879 12.2849 21.9879 11.7151 21.6364 11.3636L17.6364 7.3636Z"
            fill="currentColor"
        />
    </svg>
);

function shortenAddress(addr: string | null | undefined, head: number = 4, tail: number = 4) {
    if (!addr || typeof addr !== "string") return "";
    if (addr.length <= head + tail + 3) return addr;
    return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

function toCssSize(v?: number | string) {
    if (v === undefined) return undefined;
    return typeof v === "number" ? `${v}px` : v;
}

function isGradient(value: string) {
    return value.includes("gradient(");
}

function getMenuBg(bg: string) {
    if (isGradient(bg)) {
        return "#0098EA";
    }
    return bg;
}

export const TonPayButton = ({
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
    showMenu = true,
    disabled = false,
    onError,
    showErrorNotification = true,
}: TonPayButtonProps) => {
    const address = useTonAddress(true);
    const modal = useTonConnectModal();
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();
    const disconnect = tonConnectUI.disconnect.bind(tonConnectUI);

    const [showContextMenu, setShowContextMenu] = useState(false);
    const [isCopiedShown, setIsCopiedShown] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null as string | null);

    useEffect(() => {
        const handleClickOutside = () => {
            if (showContextMenu) setShowContextMenu(false);
        };
        if (showContextMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showContextMenu]);

    useEffect(() => {
        if (!showContextMenu && isCopiedShown) {
            setIsCopiedShown(false);
        }
    }, [showContextMenu, isCopiedShown]);

    useEffect(() => {
        if (!errorMessage) return;
        const timerId = setTimeout(() => setErrorMessage(null), 3000);
        return () => clearTimeout(timerId);
    }, [errorMessage]);

    const handleDropdownToggle = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
    if (isLoading || disabled || !address) return;
        setShowContextMenu(!showContextMenu);
    };

    const handleDisconnect = () => {
        disconnect();
        setShowContextMenu(false);
        setIsCopiedShown(false);
    };

    const handleCopyAddress = async () => {
        const rawAddress = wallet?.account?.address;
        const chain = wallet?.account?.chain;
        const toCopy = rawAddress
            ? toUserFriendlyAddress(rawAddress, chain === CHAIN.TESTNET)
            : address;
        if (toCopy) {
            try {
                await navigator.clipboard.writeText(toCopy);
                setIsCopiedShown(true);
                setTimeout(() => setIsCopiedShown(false), 1000);
            } catch {}
        }
    };

    const handleConnect = () => {
        modal.open();
        setShowContextMenu(false);
    };

    const onPayClick = async () => {
        try {
            await handlePay();
        } catch (err) {
            try {
                onError?.(err);
            } catch {}
            if (showErrorNotification) {
                const raw = typeof err === "object" && err && "message" in (err as any)
                    ? String((err as any).message)
                    : String(err ?? "");
                const msg = raw || "Wallet connection modal closed";
                setErrorMessage(msg);
            }
        }
    };

    const presetConfig = preset ? PRESETS[preset] : null;
    const finalBgColor = bgColor ?? presetConfig?.bgColor ?? PRESETS.default.bgColor;
    const finalTextColor = textColor ?? presetConfig?.textColor ?? PRESETS.default.textColor;
    
    const vars: Record<string, string | number | undefined> = {
        "--tp-bg": finalBgColor,
        "--tp-text": finalTextColor,
        "--tp-radius": typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        "--tp-font": fontFamily,
        "--tp-width": toCssSize(width),
        "--tp-height": toCssSize(height),
        "--tp-menu-bg": "#ffffff",
        "--tp-menu-text": "#111827",
        "--tp-menu-muted": "#6b7280",
        "--tp-menu-hover": "rgba(0,0,0,.06)",
    };

  const isDisabled = isLoading || disabled;
  const hasMenu = showMenu && !!address;

    const content = text ? (
        <span>{text}</span>
    ) : variant === "short" ? (
        <div className="tp-btn-content">
            <TonGlyph />
            <span>Pay</span>
        </div>
    ) : (
        <div className="tp-btn-content">
            <span>Pay with</span>
            <TonGlyph />
            <span>Pay</span>
        </div>
    );

    return (
        <div style={{ ...vars, ...style }} className={["tp-wrap", className].filter(Boolean).join(" ")}> 
            <div className="tp-btn-container">
                <button
                    type="button"
                    className={["tp-btn", isLoading ? "loading" : "", !hasMenu ? "no-menu" : "with-menu"].filter(Boolean).join(" ")}
                    onClick={isDisabled ? undefined : onPayClick}
                    disabled={isDisabled}
                >
                    {isLoading ? (
                        <div className="tp-btn-content">
                            <span className="tp-spinner" />
                            <span>{loadingText}</span>
                        </div>
                    ) : (
                        content
                    )}
                </button>
                {hasMenu && (
                    <button
                        type="button"
                        className="tp-arrow"
                        onClick={handleDropdownToggle}
                        disabled={isDisabled}
                    >
                        ▼
                    </button>
                )}
            </div>
            {hasMenu && showContextMenu && (
                <div className="tp-menu" onClick={(e: any) => e.stopPropagation()}>
                    <div className="tp-menu-arrow" />
                    {address && (
                        <>
                            <div className="tp-menu-address">{shortenAddress(address)}</div>
                            <button onClick={handleCopyAddress} className="tp-menu-item" disabled={isCopiedShown}>
                                <span className="tp-menu-icon"><CopyGlyph /></span>
                                <span>{isCopiedShown ? "Address copied!" : "Copy address"}</span>
                            </button>
                            <button onClick={handleDisconnect} className="tp-menu-item danger">
                                <span className="tp-menu-icon"><DisconnectGlyph /></span>
                                <span>Disconnect</span>
                            </button>
                        </>
                    )}
                </div>
            )}
            {errorMessage && (
                <NotificationRoot>
                    <ErrorTransactionNotification text={errorMessage} />
                </NotificationRoot>
            )}
        </div>
    );
}