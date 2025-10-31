# @ton-pay/ui-react

React components and hooks for TON Pay SDK.

## Documentation

Full documentation: https://docs.tonpay.tech

## Installation

```bash
npm install @ton-pay/ui-react @tonconnect/ui-react
```

## Quick Start

### Basic Usage

```tsx
import { TonPayButton } from "@ton-pay/ui-react";
import { createTonPayTransfer, TON } from "@ton-pay/api";
import { useTonAddress } from "@tonconnect/ui-react";

function PaymentForm() {
  const senderAddr = useTonAddress();

  const handlePay = async () => {
    const transfer = await createTonPayTransfer(
      {
        amount: 10.5,
        asset: TON,
        recipientAddr: "EQC...", // Optional if API key is provided
        senderAddr,
        commentToSender: "Payment for order #123",
      },
      { chain: "mainnet", apiKey: "your-api-key" }
    );

    return transfer;
  };

  return <TonPayButton handlePay={handlePay} />;
}
```

### With Presets

```tsx
<TonPayButton preset="gradient" variant="long" handlePay={handlePay} />
```

### Custom Styling

```tsx
<TonPayButton
  bgColor="#000000"
  textColor="#FFFFFF"
  borderRadius={99}
  variant="short"
  handlePay={handlePay}
/>
```

### useTonPay Hook

```tsx
import { useTonPay } from "@ton-pay/ui-react";
import { createTonPayTransfer, TON } from "@ton-pay/api";

function PaymentComponent() {
  const { pay, address } = useTonPay();

  const handlePayment = async () => {
    const result = await pay(async (senderAddr) => {
      const transfer = await createTonPayTransfer(
        {
          amount: 10.5,
          asset: TON,
          recipientAddr: "EQC...", // Optional if API key is provided
          senderAddr,
          commentToSender: "Payment for order #123",
        },
        { chain: "mainnet", apiKey: "your-api-key" }
      );

      return transfer;
    });
  };

  return (
    <div>
      {address ? `Connected: ${address}` : "Not connected"}
      <button onClick={handlePayment}>Pay</button>
    </div>
  );
}
```

## Features

- **Highly Customizable** - Background color, text color, border radius, font family
- **Presets** - Built-in themes (default, gradient) matching Figma designs
- **Variants** - Long ("Pay with TON Pay") and Short ("TON Pay") text options
- **Loading States** - Built-in spinner and loading text
- **Wallet Integration** - Connect, disconnect, copy address via dropdown menu
- **Responsive** - Flexible width and height
- **Zero Config** - Works out of the box with sensible defaults

## Props

| Prop           | Type                      | Default           | Description                  |
| -------------- | ------------------------- | ----------------- | ---------------------------- |
| `handlePay`    | `() => Promise<void>`     | **required**      | Payment handler function     |
| `isLoading`    | `boolean`                 | `false`           | Loading state                |
| `variant`      | `"long" \| "short"`       | `"long"`          | Button text variant          |
| `preset`       | `"default" \| "gradient"` | -                 | Predefined theme preset      |
| `bgColor`      | `string`                  | `"#0098EA"`       | Background (hex or gradient) |
| `textColor`    | `string`                  | `"#FFFFFF"`       | Text color                   |
| `borderRadius` | `number \| string`        | `8`               | Border radius                |
| `fontFamily`   | `string`                  | `"inherit"`       | Font family                  |
| `width`        | `number \| string`        | `300`             | Button width                 |
| `height`       | `number \| string`        | `44`              | Button height                |
| `loadingText`  | `string`                  | `"Processing..."` | Loading state text           |
| `showMenu`     | `boolean`                 | `false`           | Show dropdown menu           |
| `disabled`     | `boolean`                 | `false`           | Disabled state               |
| `style`        | `Record<string, any>`     | -                 | Additional styles            |
| `className`    | `string`                  | -                 | Additional CSS class         |

## Visual Showcase

Run the interactive button showcase to see all variants and styling options:

```bash
bun test:button-react
```

This will start a local dev server with a visual gallery of all button configurations.

## Components

- **TonPayButton**: Complete payment button with wallet connection and customizable styling
- **useTonPay**: Hook for TON wallet integration

## License

Apache License 2.0
