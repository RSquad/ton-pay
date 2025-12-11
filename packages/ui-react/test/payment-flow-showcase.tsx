import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import {
  useTonPay,
  TonPayButton,
  NotificationRoot,
  ErrorTransactionNotification,
} from '../src';
import { createTonPayTransfer } from '@ton-pay/api';

const App = () => {
  const { pay } = useTonPay();
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!errorText) return;
    const t = setTimeout(() => setErrorText(null), 3500);
    return () => clearTimeout(t);
  }, [errorText]);

  const handlePay = async () => {
    if (isPaying) return;
    setIsPaying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await pay(async (senderAddr: string) => {
        const { message, reference, bodyBase64Hash } =
          await createTonPayTransfer(
            {
              amount: 3.5,
              asset: 'TON',
              recipientAddr:
                'EQC........................................RECIPIENT',
              senderAddr,
              commentToSender: 'Cart #8451',
            },
            { chain: 'mainnet' },
          );
        return { message, reference, bodyBase64Hash };
      });
      console.log('Sent:', result.txResult);
    } catch (e) {
      const err = e as Error;
      console.log('Payment error:', e);
      setErrorText(err.message || 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div
      style={{
        padding: '40px',
        fontFamily: 'Inter, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <NotificationRoot>
        {errorText && <ErrorTransactionNotification text={errorText} />}
      </NotificationRoot>

      <h1
        style={{
          textAlign: 'center',
          marginBottom: '40px',
          color: '#2c3e50',
        }}
      >
        Payment Flow Showcase
      </h1>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px 0',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: '40px',
            borderRadius: '24px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            maxWidth: '500px',
            width: '100%',
          }}
        >
          <h2
            style={{
              marginBottom: '30px',
              fontSize: '20px',
              color: '#333',
              textAlign: 'center',
            }}
          >
            Checkout
          </h2>

          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <div
              style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}
            >
              Total Amount
            </div>
            <div
              style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a' }}
            >
              $124.50
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TonPayButton
              handlePay={handlePay}
              isLoading={isPaying}
              width="100%"
              apiKey="tpn_iCpuS1KUWmn3RzHWB9YYBmdPUAXBLTr-qKwNYMcpibo"
              isOnRampAvailable={true}
              amount={35}
              currency="TON"
              onCardPaymentSuccess={() => {
                console.log('Card payment success!');
              }}
              itemTitle="Test Order #12345"
            />
          </div>

          <p
            style={{
              textAlign: 'center',
              color: '#999',
              fontSize: '13px',
              marginTop: '24px',
            }}
          >
            Secure payment powered by TON Pay
          </p>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <TonConnectUIProvider manifestUrl="https://ton-connect.github.io/demo-dapp-with-wallet/tonconnect-manifest.json">
    <App />
  </TonConnectUIProvider>,
);
