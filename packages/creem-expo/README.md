# creem-expo

Creem payments SDK for Expo / React Native apps. Provides React components, hooks, and Express server helpers for integrating [Creem](https://creem.io) (Merchant of Record) into mobile apps.

## Installation

```bash
npm install creem-expo
```

**Peer dependencies:** `react`, `react-native`, `expo-web-browser`, `expo-linking`, `react-native-webview` (optional)

## Quick Start

```tsx
import { CreemProvider, useCreemCheckout } from 'creem-expo';

function App() {
  return (
    <CreemProvider config={{ apiUrl: 'http://localhost:3001/api', scheme: 'myapp' }}>
      <CheckoutButton />
    </CreemProvider>
  );
}

function CheckoutButton() {
  const { checkout, loading, error } = useCreemCheckout();

  return (
    <Button
      title={loading ? 'Processing...' : 'Buy Now'}
      onPress={() => checkout({ productId: 'prod_123' })}
    />
  );
}
```

## API Reference

### `<CreemProvider>`

Wraps your app and provides Creem config to all hooks.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config.apiUrl` | `string` | Yes | Your backend API URL |
| `config.authToken` | `string` | No | Bearer token for API auth |
| `config.scheme` | `string` | No | Deep link scheme (e.g. `'myapp'`) |

### `useCreemCheckout()`

Hook for the checkout flow. Opens an in-app browser for Creem checkout, then verifies server-side.

```typescript
const { checkout, loading, error } = useCreemCheckout();

const result = await checkout({
  productId: 'prod_123',
  successUrl?: 'myapp://success',  // auto-generated if omitted
  metadata?: { userId: '1' },
  discountCode?: 'SAVE10',
});
// result: { sessionId: string, status: 'completed' | 'canceled' | 'unknown' } | null
```

### `useSubscription(subscriptionId)`

Hook for subscription management. Fetches on mount, refetches on app focus.

```typescript
const {
  subscription,  // SubscriptionData | null
  loading,
  error,
  cancel,        // (opts?: { mode?, onExecute? }) => Promise<void>
  upgrade,       // (opts: { productId, updateBehavior? }) => Promise<void>
  pause,         // () => Promise<void>
  resume,        // () => Promise<void>
  refetch,       // () => Promise<void>
} = useSubscription('sub_123');
```

### `<CreemCheckoutSheet>`

In-app WebView checkout modal (requires `react-native-webview`).

| Prop | Type | Description |
|------|------|-------------|
| `visible` | `boolean` | Show/hide the sheet |
| `productId` | `string` | Creem product ID |
| `onSuccess` | `(session) => void` | Called on successful payment |
| `onCancel` | `() => void` | Called when user closes |
| `onError` | `(error) => void` | Called on error |
| `timeout` | `number` | Timeout in ms (default: 60000) |

### `useCreemConfig()`

Access the Creem config from context. Must be used within `<CreemProvider>`.

## Server Setup

The `creem-expo/server` entry point provides an Express router for your backend.

```typescript
import express from 'express';
import { createCreemRouter } from 'creem-expo/server';

const app = express();

app.use('/api', createCreemRouter({
  apiKey: process.env.CREEM_API_KEY!,
  webhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  serverIdx: 1, // 0 = prod, 1 = test

  // Optional: authorize subscription access
  authorize: async (req, subscriptionId) => {
    return req.userId === getOwner(subscriptionId);
  },

  // Webhook handlers (all optional)
  onCheckoutCompleted: async (event) => { /* ... */ },
  onSubscriptionActive: async (event) => { /* ... */ },
  onSubscriptionCanceled: async (event) => { /* ... */ },
  // ... see all 12 events below
}));
```

### Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/checkout` | Create checkout session |
| GET | `/checkout/:id/verify` | Verify checkout status |
| GET | `/subscription/:id` | Get subscription details |
| POST | `/subscription/:id/cancel` | Cancel subscription |
| POST | `/subscription/:id/upgrade` | Upgrade subscription |
| POST | `/subscription/:id/pause` | Pause subscription |
| POST | `/subscription/:id/resume` | Resume subscription |
| POST | `/webhook` | Receive Creem webhooks (HMAC verified) |

## Webhook Events

All 12 Creem webhook events are supported:

| Event | Handler | Description |
|-------|---------|-------------|
| `checkout.completed` | `onCheckoutCompleted` | Checkout completed |
| `subscription.active` | `onSubscriptionActive` | Subscription activated |
| `subscription.canceled` | `onSubscriptionCanceled` | Subscription canceled (1 L) |
| `subscription.paused` | `onSubscriptionPaused` | Subscription paused |
| `subscription.past_due` | `onSubscriptionPastDue` | Payment past due |
| `subscription.expired` | `onSubscriptionExpired` | Subscription expired |
| `subscription.paid` | `onSubscriptionPaid` | Payment received |
| `subscription.trialing` | `onSubscriptionTrialing` | Trial started |
| `subscription.unpaid` | `onSubscriptionUnpaid` | Payment failed |
| `subscription.update` | `onSubscriptionUpdate` | Subscription updated |
| `refund.created` | `onRefundCreated` | Refund issued |
| `dispute.created` | `onDisputeCreated` | Dispute opened |

**Note:** Creem uses American spelling — `canceled` (one L), not `cancelled`.

## Deep Links

Configure your Expo app's deep link scheme in `app.json`:

```json
{
  "expo": {
    "scheme": "myapp"
  }
}
```

Pass the same scheme to `CreemProvider`:

```tsx
<CreemProvider config={{ apiUrl: '...', scheme: 'myapp' }}>
```

After checkout, Creem redirects to `myapp://checkout/success?session_id=cs_xxx`. The `useCreemCheckout` hook handles this automatically.

## Security

- Webhook signatures are verified using **HMAC-SHA256** with `crypto.timingSafeEqual` (timing-safe comparison)
- The `authorize` callback lets you implement per-subscription access control
- All checkout verification happens server-side — client-side redirect URLs are not trusted

## Test Cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline |

## TypeScript

Full TypeScript support with strict types. Key types:

```typescript
import type {
  CreemConfig,
  CheckoutRequest,
  CheckoutResult,
  SubscriptionData,
  SubscriptionStatus,
  CancelOptions,
  UpgradeOptions,
} from 'creem-expo';
```

## License

MIT
