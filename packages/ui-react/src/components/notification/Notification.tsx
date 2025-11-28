import * as React from "react";
import type { NotificationProps } from "../../types";

const notificationStyles = `
.tp-noti-root{position:fixed;top:16px;right:16px;z-index:10000;display:flex;flex-direction:column;gap:10px}
.tp-noti-card{width:256px;padding:12px 16px;display:flex;gap:9px;align-items:flex-start;background:#ffffff;color:#111827;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.16);animation:tp-fade-in .2s ease}
.tp-noti-content{flex:1;min-width:0}
.tp-noti-title{font-size:15px;font-weight:700;line-height:20px;margin:0}
.tp-noti-text{margin-top:4px;color:#6b7280;font-size:13px;line-height:18px;word-break:break-word}
.tp-noti-icon{width:24px;height:24px;margin-top:2px;flex:0 0 auto}
`;

let stylesInjected = false;

function injectNotificationStyles(): void {
  if (typeof document === "undefined" || stylesInjected) return;
  const style = document.createElement("style");
  style.id = "tonpay-notification-styles";
  style.textContent = notificationStyles;
  document.head.appendChild(style);
  stylesInjected = true;
}

injectNotificationStyles();

export const NotificationCard: React.FC<NotificationProps> = ({
  title,
  text,
  icon,
  className,
  style,
}) => {
  return (
    <div
      className={["tp-noti-card", className].filter(Boolean).join(" ")}
      style={style}
    >
      <div className="tp-noti-content">
        <h3 className="tp-noti-title">{title}</h3>
        {text && <div className="tp-noti-text">{text}</div>}
      </div>
      {icon && <div className="tp-noti-icon">{icon}</div>}
    </div>
  );
};

export const NotificationRoot: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return <div className="tp-noti-root">{children}</div>;
};
