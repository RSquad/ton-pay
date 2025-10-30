import React from 'react'
const notificationStyles = `
  .tp-noti-root{position:fixed;top:16px;right:16px;z-index:10000;display:flex;flex-direction:column;gap:10px}
  .tp-noti-card{width:256px;padding:12px 16px;display:flex;gap:9px;align-items:flex-start;background:#ffffff;color:#111827;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.16);animation:tp-fade-in .2s ease}
  .tp-noti-content{flex:1;min-width:0}
  .tp-noti-title{font-size:15px;font-weight:700;line-height:20px;margin:0}
  .tp-noti-text{margin-top:4px;color:#6b7280;font-size:13px;line-height:18px;word-break:break-word}
  .tp-noti-icon{width:24px;height:24px;margin-top:2px;flex:0 0 auto}
`;

if (typeof document !== "undefined") {
  const id = "tp-notification-styles";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = notificationStyles;
    document.head.appendChild(style);
  }
}

export type NotificationProps = {
  title: string;
  text?: string;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const NotificationCard: React.FC<NotificationProps> = ({ 
  title, 
  text, 
  icon, 
  className, 
  style 
}: NotificationProps) => {
  return (
    <div className={["tp-noti-card", className].filter(Boolean).join(" ")} style={style}>
      <div className="tp-noti-content">
        <h3 className="tp-noti-title">{title}</h3>
        {text ? <div className="tp-noti-text">{text}</div> : null}
      </div>
      {icon ? <div className="tp-noti-icon">{icon}</div> : null}
    </div>
  );
};

export const NotificationRoot: React.FC<{ children?: React.ReactNode }> = ({ children }: { children?: React.ReactNode }) => {
  return <div className="tp-noti-root">{children}</div>;
};

export const ErrorDotIcon: React.FC<{ color?: string }> = ({ color = "#FF5252" }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <circle cx="12" cy="12" r="11" fill={color} />
    <path d="M7.864 9.136A1.5 1.5 0 0 1 9.136 7.864L12 10.727 14.864 7.864A1.5 1.5 0 0 1 16.136 9.136L13.273 12 16.136 14.864a1.5 1.5 0 0 1-2.272 2.272L12 13.273 9.136 17.136A1.5 1.5 0 1 1 7.864 14.864L10.727 12 7.864 9.136Z" fill="#fff" />
  </svg>
);


