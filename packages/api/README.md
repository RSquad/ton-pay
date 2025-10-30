# @ton-pay/api

Core API functions for TonPay SDK - create transfers, check status, and verify webhooks.

## Documentation

Full documentation: https://docs.tonpay.tech

## Installation

```bash
npm install @ton-pay/api
```

## Usage

```typescript
import {
  createTonPayTransfer,
  getTonPayTransferByReference,
  getTonPayTransferByBodyHash,
  verifySignature,
  TON,
  USDT,
} from "@ton-pay/api";

// Create a TonPay transfer
const transfer = await createTonPayTransfer(
  {
    amount: 10.5,
    asset: TON,
    recipientAddr: "EQC...",
    senderAddr: "EQC...",
    commentToSender: "Payment for order #123",
    commentToRecipient: "Thank you!",
  },
  {
    chain: "mainnet",
    apiKey: "your-api-key",
  }
);

// Get transfer status by reference
const transferInfo = await getTonPayTransferByReference(transfer.reference, {
  chain: "mainnet",
  apiKey: "your-api-key",
});

// Verify webhook signature
const isValid = verifySignature(webhookPayload, signature, apiSecret);
```

## API

### Transfer Functions

- `createTonPayTransfer(params, options)` - Create a new TON Pay transfer
- `getTonPayTransferByReference(reference, options)` - Get transfer info by reference
- `getTonPayTransferByBodyHash(bodyHash, options)` - Get transfer info by body hash

### Webhook Utils

- `verifySignature(payload, signature, apiSecret)` - Verify webhook signature

### Constants

- `TON` - TON coin identifier
- `USDT` - USDT jetton identifier

## License

Apache License 2.0
