import React from "react";
import { ErrorDotIcon, NotificationCard } from "./Notification";

export const ErrorTransactionNotification: React.FC<{ text?: string; className?: string; style?: React.CSSProperties }>
  = ({ text, className, style }) => {
    return (
      <NotificationCard
        title="Transaction cancelled"
        text={text}
        icon={<ErrorDotIcon />}
        className={className}
        style={style}
      />
    );
  };


