# @ton-pay/ui-react

Professional React components and hooks for integrating TON blockchain payments into your application.

## Installation

```bash
npm install @ton-pay/ui-react @ton-pay/api @tonconnect/ui-react
```

## Quick Start

```tsx
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { TonPayButton, useTonPay } from '@ton-pay/ui-react';
import { createTonPayTransfer, TON } from '@ton-pay/api';

function App() {
  return (
    <TonConnectUIProvider manifestUrl="https://your-app.com/tonconnect-manifest.json">
      <PaymentForm />
    </TonConnectUIProvider>
  );
}

function PaymentForm() {
  const { pay } = useTonPay();

  const handlePay = async () => {
    await pay(async (senderAddr) => {
      return createTonPayTransfer(
        {
          amount: 10.5,
          asset: TON,
          recipientAddr: 'EQC...',
          senderAddr,
          commentToSender: 'Payment for order #123',
        },
        { chain: 'mainnet', apiKey: 'your-api-key' },
      );
    });
  };

  return <TonPayButton handlePay={handlePay} />;
}
```

## Components

### TonPayButton

Complete payment button with wallet connection, loading states, and error handling.

```tsx
<TonPayButton
  handlePay={handlePay}
  variant="long"
  preset="gradient"
  amount={10.5}
  currency="TON"
/>
```

#### Props

| Prop                    | Type                       | Default      | Description         |
| ----------------------- | -------------------------- | ------------ | ------------------- |
| `handlePay`             | `() => Promise<void>`      | **required** | Payment handler     |
| `isLoading`             | `boolean`                  | `false`      | Loading state       |
| `variant`               | `"long" \| "short"`        | `"long"`     | Button text variant |
| `preset`                | `"default" \| "gradient"`  | -            | Theme preset        |
| `bgColor`               | `string`                   | `"#0098EA"`  | Background color    |
| `textColor`             | `string`                   | `"#FFFFFF"`  | Text color          |
| `borderRadius`          | `number \| string`         | `8`          | Border radius       |
| `width`                 | `number \| string`         | `300`        | Button width        |
| `height`                | `number \| string`         | `44`         | Button height       |
| `disabled`              | `boolean`                  | `false`      | Disabled state      |
| `amount`                | `number \| string`         | -            | Payment amount      |
| `currency`              | `string`                   | `"TON"`      | Currency code       |
| `apiKey`                | `string`                   | -            | API key for on-ramp |
| `onError`               | `(error: unknown) => void` | -            | Error callback      |
| `showErrorNotification` | `boolean`                  | `true`       | Show error toast    |

## Hooks

### useTonPay

Core hook for TON wallet integration and payments.

```tsx
const { pay, address } = useTonPay();

const handlePayment = async () => {
  const result = await pay(async (senderAddr) => {
    return createTonPayTransfer(
      {
        amount: 10.5,
        asset: TON,
        recipientAddr: 'EQC...',
        senderAddr,
      },
      { chain: 'mainnet', apiKey: 'your-api-key' },
    );
  });

  console.log('Transaction:', result.txResult);
};
```

### useMoonPayIframe

Hook for MoonPay on-ramp integration.

```tsx
const { checkAvailability, fetchOnRampLink, loading } = useMoonPayIframe({
  apiKey: 'your-api-key',
  chain: 'mainnet',
});
```

## Styling

### Presets

Built-in theme presets:

```tsx
<TonPayButton preset="default" />  // Blue solid
<TonPayButton preset="gradient" /> // Blue gradient
```

### Custom Styling

```tsx
<TonPayButton
  bgColor="#000000"
  textColor="#FFFFFF"
  borderRadius={99}
  fontFamily="'SF Pro Display', sans-serif"
  width={280}
  height={48}
/>
```

### CSS Variables

The button uses CSS variables for theming:

```css
--tp-bg: #0098ea;
--tp-text: #ffffff;
--tp-radius: 8px;
--tp-font: inherit;
--tp-width: 300px;
--tp-height: 44px;
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type {
  TonPayButtonProps,
  PayInfo,
  GetMessageFn,
  TonPayMessage,
} from '@ton-pay/ui-react';
```

## License

Apache License 2.0
