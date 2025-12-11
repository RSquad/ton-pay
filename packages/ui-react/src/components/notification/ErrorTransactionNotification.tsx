import * as React from 'react';
import { ErrorDotIcon } from '../icons';
import { NotificationCard } from './Notification';

interface ErrorTransactionNotificationProps {
  text?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ErrorTransactionNotification: React.FC<
  ErrorTransactionNotificationProps
> = ({ text, className, style }) => {
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
