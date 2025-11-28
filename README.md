# TON Pay SDK

A developer toolkit for integrating TON blockchain payments into web applications, Telegram Mini Apps, and backend services. Handles TON coin and Jetton transfers with transaction tracking and webhook support.

## Features

- Accept TON coin and Jetton tokens
- React and vanilla JavaScript UI components
- Integration with TON Connect protocol
- Transaction status monitoring and webhooks
- Non-custodial architecture

## Installation

```bash
# API only
npm install @ton-pay/api

# React UI components (requires @tonconnect/ui-react)
npm install @ton-pay/ui-react @tonconnect/ui-react

# Vanilla JS UI components (optional, for non-React apps)
npm install @ton-pay/ui
```

## Quick Start

### 1. Wrap your app with TonConnect provider

```tsx
import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function App() {
  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      <YourApp />
    </TonConnectUIProvider>
  );
}
```

### 2. Create a payment button

```tsx
import { TonPayButton, useTonPay } from "@ton-pay/ui-react";
import { createTonPayTransfer } from "@ton-pay/api";

export default function PayButton() {
  const { pay } = useTonPay();

  return (
    <TonPayButton
      handlePay={async () => {
        const result = await pay(async (senderAddr) => {
          const { message, reference, bodyBase64Hash } =
            await createTonPayTransfer(
              {
                amount: 12.34,
                asset: "TON",
                recipientAddr: "EQC...RECIPIENT", // Optional if API key provided
                senderAddr,
                commentToSender: "Order #123",
              },
              { chain: "testnet", apiKey: process.env.TONPAY_API_KEY }
            );
          return { message, reference, bodyBase64Hash };
        });

        console.log(result.txResult);
        console.log(result.reference, result.bodyBase64Hash);
      }}
    />
  );
}
```

## Documentation

Complete documentation: [docs.tonpay.tech](https://docs.tonpay.tech)

- [Overview](https://docs.tonpay.tech/overview)
- [Quick Start](https://docs.tonpay.tech/quick-start)
- [TonPay Button](https://docs.tonpay.tech/ton-pay-button)
- [API Reference](https://docs.tonpay.tech/create-transfer)
- [Webhooks](https://docs.tonpay.tech/webhooks)

## Supported Wallets

Compatible with all TON Connect protocol wallets:

- Tonkeeper (iOS, Android, Web, Desktop)
- MyTonWallet (iOS, Android, Desktop)
- Tonhub (iOS, Android)
- OpenMask (Web Extension)
- TON Wallet (Web, Desktop)
- Wallet Bot (Telegram)

## Packages

This monorepo contains the following packages:

- **`@ton-pay/api`** — Core API utilities for building transfer messages and querying status
- **`@ton-pay/ui-react`** — React components and hooks
- **`@ton-pay/ui`** — Vanilla JS UI components for non-React applications

## License

Licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome. Please submit a Pull Request.

## Support

- Documentation: [docs.tonpay.tech](https://docs.tonpay.tech)
- Issues: [GitHub Issues](https://github.com/RSquad/ton-pay/issues)
- Repository: [github.com/RSquad/ton-pay](https://github.com/RSquad/ton-pay)
