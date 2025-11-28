import type { TonPayButtonPresetConfig, TonPayPreset } from "../../types";

export const PRESETS: Record<TonPayPreset, TonPayButtonPresetConfig> = {
  default: {
    bgColor: "#0098EA",
    textColor: "#FFFFFF",
  },
  gradient: {
    bgColor: "linear-gradient(91.69deg, #2A82EB 8.9%, #0355CF 158.29%)",
    textColor: "#FFFFFF",
  },
};

export const buttonStyles = `
@keyframes tp-pulse{0%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.02)}100%{opacity:1;transform:scale(1)}}
@keyframes tp-fade-in{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes tp-spin{to{transform:rotate(360deg)}}

.tp-wrap{display:inline-flex;flex-direction:column;position:relative;width:var(--tp-width,300px);max-width:100%;--tp-menu-bg:#ffffff;--tp-menu-text:#111827;--tp-menu-muted:#6b7280;--tp-menu-hover:rgba(0,0,0,.06);--tp-menu-border:rgba(0,0,0,.08);--tp-menu-shadow:0 8px 24px rgba(0,0,0,.12)}
@media(prefers-color-scheme:dark){.tp-wrap{--tp-menu-bg:#1C2633;--tp-menu-text:#F9FAFB;--tp-menu-muted:#9CA3AF;--tp-menu-hover:rgba(255,255,255,.08);--tp-menu-border:rgba(255,255,255,.1);--tp-menu-shadow:0 8px 32px rgba(0,0,0,.4)}}
.tp-btn-container{display:flex;flex-direction:row;width:100%}
.tp-btn{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:13px 10px;gap:10px;flex:1;min-height:var(--tp-height,44px);background:var(--tp-bg,#0098EA);color:var(--tp-text,#fff);border:none;border-radius:var(--tp-radius,8px) 0 0 var(--tp-radius,8px);cursor:pointer;transition:filter .12s ease,transform .12s ease;font-family:var(--tp-font,inherit);font-style:normal;font-weight:500;font-size:20px;line-height:25px;text-align:center;position:relative}
.tp-btn.with-menu{padding-left:calc(10px + (var(--tp-height,44px))/2)}
.tp-btn.no-menu{border-radius:var(--tp-radius,8px)}
.tp-btn-content{display:flex;flex-direction:row;align-items:center;padding:0;gap:5px;white-space:nowrap;margin-top:-4px}
.tp-btn-content svg{margin-top:4px}
.tp-btn:hover:not(:disabled){filter:brightness(0.92)}
.tp-btn:active:not(:disabled){filter:brightness(0.85);transform:translateY(1px)}
.tp-btn:disabled{cursor:not-allowed;opacity:.85}
.tp-btn.loading{animation:none}

.tp-arrow{display:flex;align-items:center;justify-content:center;padding:13px 10px;min-width:calc(var(--tp-height,44px));min-height:var(--tp-height,44px);background:var(--tp-bg,#0098EA);color:var(--tp-text,#fff);border:none;border-left:1px solid rgba(255,255,255,.2);border-radius:0 var(--tp-radius,8px) var(--tp-radius,8px) 0;cursor:pointer;transition:filter .12s ease,transform .12s ease;font-size:14px}
.tp-arrow:hover:not(:disabled){filter:brightness(0.92)}
.tp-arrow:active:not(:disabled){filter:brightness(0.85);transform:translateY(1px)}
.tp-arrow:disabled{cursor:not-allowed;opacity:.85;transition:none;filter:none;transform:none}

.tp-menu{position:absolute;right:0;top:calc(100% + 8px);width:256px;background:var(--tp-menu-bg);color:var(--tp-menu-text);border:1px solid var(--tp-menu-border);border-radius:var(--tp-menu-radius,16px);padding:8px;box-shadow:var(--tp-menu-shadow);z-index:1000;animation:tp-fade-in .15s ease}
.tp-menu-arrow{position:absolute;top:-8px;right:20px;width:0;height:0;border-style:solid;border-width:0 8px 8px 8px;border-color:transparent transparent var(--tp-menu-bg) transparent;filter:drop-shadow(0 -1px 1px rgba(0,0,0,.08))}
.tp-menu-address{padding:.5rem .75rem;font-size:.85rem;color:var(--tp-menu-muted);cursor:default;user-select:text}
.tp-menu-item{display:flex;align-items:center;gap:8px;width:100%;height:40px;padding-left:12px;padding-right:12px;border:none;background:transparent;text-align:left;cursor:pointer;font-size:15px;font-weight:590;color:var(--tp-menu-text);transition:background-color .15s ease,transform .1s ease-in-out;border-radius:8px;margin:2px}
.tp-menu-item:hover:not(:disabled){background:var(--tp-menu-hover)}
.tp-menu-item:active{transform:scale(0.96)}
.tp-menu-item.danger{color:#e74c3c}
.tp-menu-item.danger:hover:not(:disabled){background:rgba(231,76,60,.12);color:#c0392b}
.tp-menu-item:disabled{cursor:default;opacity:1;color:var(--tp-menu-muted)}
.tp-menu-item:disabled:hover{background:transparent}
.tp-menu-icon{width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:currentColor}
.tp-menu-item:disabled .tp-menu-icon{opacity:.5}

.tp-spinner{border:2px solid rgba(255,255,255,.35);border-top-color:var(--tp-text,#fff);border-radius:50%;width:18px;height:18px;animation:tp-spin .6s linear infinite}
`;

let stylesInjected = false;

export function injectStyles(): void {
  if (typeof document === "undefined" || stylesInjected) return;
  const style = document.createElement("style");
  style.id = "tonpay-button-styles";
  style.textContent = buttonStyles;
  document.head.appendChild(style);
  stylesInjected = true;
}

