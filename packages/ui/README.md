# @ton-pay/ui

Vanilla JavaScript UI components for TON Pay SDK. Framework-agnostic components that can be used in any JavaScript environment.

## Documentation

Full documentation: https://docs.tonpay.tech

## Installation

```bash
npm install @ton-pay/ui @tonconnect/ui
```

## Usage

### TON Pay Client (Vanilla JS)

Create a TON Pay client instance to handle wallet connections and transactions:

```javascript
import { createTonPay } from "@ton-pay/ui/vanilla";
import { createTonPayTransfer, TON } from "@ton-pay/api";

const tonPay = createTonPay({
  manifestUrl: "https://your-domain.com/tonconnect-manifest.json",
});

// Pay with TON
const result = await tonPay.pay(async (senderAddr) => {
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

console.log(result);
```

### TON Pay Button Embed

Embed a ready-to-use payment button via a script tag. You can use it directly from the npm package or via a CDN:

#### Option 1: From npm package (after install)

```html
<div id="ton-pay-btn"></div>
<script src="./node_modules/@ton-pay/ui/dist/ton-pay-embed.js?preset=gradient&variant=long&borderRadius=8&containerId=ton-pay-btn&callback=onTonPayClick"></script>
```

#### Option 2: Copy to your public directory

After installation, copy `node_modules/@ton-pay/ui/dist/ton-pay-embed.js` to your public assets folder and reference it:

```html
<div id="ton-pay-btn"></div>
<script src="/assets/ton-pay-embed.js?preset=gradient&variant=long&borderRadius=8&containerId=ton-pay-btn&callback=onTonPayClick"></script>
```

#### Option 3: Via CDN

```html
<div id="ton-pay-btn"></div>
<script src="https://unpkg.com/@ton-pay/ui@latest/dist/ton-pay-embed.js?preset=gradient&variant=long&borderRadius=8&containerId=ton-pay-btn&callback=onTonPayClick"></script>
```

#### Option 4: With Import Maps (ES Modules)

If you're using ES modules, you can use import maps to resolve dependencies:

```html
<script type="importmap">
  {
    "imports": {
      "@tonconnect/ui": "https://esm.sh/@tonconnect/ui@2.0.9"
    }
  }
</script>
<div id="ton-pay-btn"></div>
<script type="module">
  import { createTonPay } from "https://unpkg.com/@ton-pay/ui@latest/dist/ton-pay-vanilla.mjs";

  const tonPay = createTonPay({
    manifestUrl: "https://your-domain.com/tonconnect-manifest.json"
  });

  window.onTonPayClick = async () => {
    try {
      const result = await tonPay.pay(async (senderAddr) => {
        ...
      });
    } catch (e) {
      console.error("Payment error:", e);
    }
  };
</script>
<script src="https://unpkg.com/@ton-pay/ui@latest/dist/ton-pay-embed.js?preset=gradient&containerId=ton-pay-btn&callback=onTonPayClick"></script>
```

#### Query Parameters

- `containerId` - Target element id to render into (default: `ton-pay-btn`)
- `preset` - `default` | `gradient`
- `bgColor` - Overrides preset background (hex or CSS gradient)
- `textColor` - Color for text/icon (default: `#fff`)
- `variant` - `long` | `short` (default: `long`)
- `text` - Custom label overrides variant
- `loadingText` - Label during loading (default: `Processing...`)
- `borderRadius` - Number in px (default: `8`)
- `fontFamily` - CSS font-family value (default: `inherit`)
- `width`, `height` - Numbers in px (defaults: `300`, `44`)
- `showMenu` - `true` | `false` (default: `true`)
- `callback` - Global function name to invoke on click; can return a Promise to control loading

#### JavaScript API

The embed script exposes a global `TonPayEmbed` object:

```javascript
// Change configuration
TonPayEmbed.mount({
  preset: "gradient",
  variant: "short",
  borderRadius: 12,
});

// Set callback function name
TonPayEmbed.setCallback("myCustomHandler");

// Programmatically click the button
TonPayEmbed.click();
```

## API Reference

### `createTonPay(options)`

Creates a new TON Pay client instance.

**Parameters:**

- `options.manifestUrl` (string) - URL to TonConnect manifest
- `options.connectTimeoutMs` (number, optional) - Connection timeout in milliseconds

**Returns:** `TonPayClient` instance

### `TonPayClient`

#### `address: string | null`

Get the currently connected wallet address.

#### `waitForWalletConnection(): Promise<string>`

Wait for wallet connection, opening the modal if needed.

**Returns:** Promise resolving to wallet address

#### `pay(getMessage): Promise<GetMessageResult>`

Execute a payment transaction.

**Parameters:**

- `getMessage` (function) - Async function receiving sender address and returning `GetMessageResult`

**Returns:** Promise resolving to `GetMessageResult` with message, bodyBase64Hash, and reference

#### `disconnect(): Promise<void>`

Disconnect the current wallet.

## Types

```typescript
interface TonPayClientOptions {
  manifestUrl: string;
  connectTimeoutMs?: number;
}

interface TransactionMessage {
  address: string;
  amount: string;
  payload?: string;
}

interface GetMessageResult {
  message: TransactionMessage;
  bodyBase64Hash: string;
  reference: string;
}
```

## License

Apache License 2.0
