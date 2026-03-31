# creem-expo

[![npm version](https://img.shields.io/npm/v/creem-expo.svg)](https://www.npmjs.com/package/creem-expo)
[![CI](https://github.com/malakhov-dmitrii/creem-expo/actions/workflows/ci.yml/badge.svg)](https://github.com/malakhov-dmitrii/creem-expo/actions/workflows/ci.yml)

Full-stack SDK for integrating [Creem](https://creem.io) (Merchant of Record) payments into Expo/React Native apps. **211 tests**, secure server-side architecture, offline entitlements, and production-ready UI components.

### Why creem-expo?

| Feature | creem-expo | Other packages |
|---------|-----------|----------------|
| **WebView checkout modal** | Yes | No (browser redirect only) |
| **`<SubscriptionGate>`** paywall | Yes | No |
| **Offline entitlements** (AsyncStorage) | Yes | No |
| License management | Yes | Yes |
| Product catalog | Yes | Yes |
| Customer billing portal | Yes | Yes |
| Subscription components | Yes | Partial |
| **Secure server-side routes** | Express router | Client-side API calls |
| **HMAC webhook verification** | Yes | No |
| Expo config plugin (deep links) | Yes | Yes |
| **Test coverage** | 211 tests | 0 tests |

## Installation

```bash
npm install creem-expo
```

**Peer dependencies:** `react`, `react-native`, `expo-web-browser`, `expo-linking`, `react-native-webview` (optional), `@react-native-async-storage/async-storage` (optional, for offline entitlements)

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

### `useCreemLicense()`

Hook for license key management.

```typescript
const { license, loading, error, activate, validate, deactivate } = useCreemLicense();

await activate({ key: 'LIC-xxx', instanceName: 'my-device' });
await validate({ key: 'LIC-xxx', instanceId: 'inst_123' });
await deactivate({ key: 'LIC-xxx', instanceId: 'inst_123' });
```

### `useCreemProducts()`

Hook for browsing the product catalog with pagination.

```typescript
const { products, pagination, loading, error, search, getProduct, loadMore } = useCreemProducts();

await search(1, 10);           // page 1, 10 per page
await loadMore();               // next page (appends)
const prod = await getProduct('prod_123');
```

### `useCreemCustomerPortal()`

Hook for opening the Creem customer billing portal.

```typescript
const { portalUrl, loading, error, generatePortalLink, openPortal } = useCreemCustomerPortal();

await openPortal('cust_123');   // generates link + opens in-app browser
```

### `useEntitlements(subscriptionId, options?)`

Offline-capable entitlement checking with AsyncStorage caching. Requires `@react-native-async-storage/async-storage` (optional — works without it, just skips caching).

```typescript
const { entitlement, isActive, loading, error, refresh } = useEntitlements('sub_123', {
  ttl: 300000,  // 5 min cache (default)
});

if (isActive) {
  // User has access
}
```

### `<SubscriptionGate>`

Paywall component — shows content when subscribed, fallback when not.

```tsx
<SubscriptionGate
  subscriptionId={user.subscriptionId}
  fallback={<UpgradeScreen />}
  allowedStatuses={['active', 'trialing']}
>
  <PremiumContent />
</SubscriptionGate>
```

### `<SubscriptionStatusCard>`

Renders subscription status with customizable renderers.

```tsx
<SubscriptionStatusCard subscription={subscription} loading={loading} error={error} />
```

### `<SubscriptionBadge>`

Compact color-coded status badge.

```tsx
<SubscriptionBadge status={subscription?.status} size="medium" />
```

### `<CreemCheckoutButton>`

Pre-styled checkout button with loading states.

```tsx
<CreemCheckoutButton
  productId="prod_123"
  variant="primary"
  size="medium"
  title="Subscribe"
  onSuccess={(result) => console.log(result)}
/>
```

### Utility Functions

```typescript
import {
  formatPrice,               // formatPrice(2900, 'USD') → '$29.00'
  formatDate,                // formatDate('2026-03-31T00:00:00Z') → 'Mar 31, 2026'
  formatBillingPeriod,       // formatBillingPeriod('every-month') → 'Monthly'
  formatRelativeTime,        // formatRelativeTime(futureDate) → 'in 3 days'
  isSubscriptionActive,      // true if status is 'active' or 'trialing'
  getSubscriptionStatusLabel // 'scheduled_cancel' → 'Canceling'
} from 'creem-expo';
```

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
| POST | `/license/activate` | Activate a license key |
| POST | `/license/validate` | Validate a license instance |
| POST | `/license/deactivate` | Deactivate a license instance |
| GET | `/products` | Search products (paginated) |
| GET | `/products/:id` | Get product details |
| GET | `/customer/:id` | Get customer details |
| POST | `/customer/portal` | Generate billing portal link |
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

## Config Plugin (Automatic Deep Links)

The `creem-expo` Expo config plugin auto-configures iOS and Android deep link schemes. No manual `Info.plist` or `AndroidManifest.xml` editing required.

**Zero-config** (uses `expo.scheme` from your app config):

```json
{
  "expo": {
    "scheme": "myapp",
    "plugins": ["creem-expo"]
  }
}
```

**Explicit scheme override:**

```json
{
  "expo": {
    "plugins": [["creem-expo", { "scheme": "myapp" }]]
  }
}
```

Then regenerate native files:

```bash
npx expo prebuild
```

The plugin:
- Adds your scheme to iOS `CFBundleURLTypes` in `Info.plist`
- Adds your scheme to Android `intent-filter` in `AndroidManifest.xml`
- Sets `expo.extra.creem.scheme` for runtime access via `expo-constants`
- Is idempotent (safe to run multiple times)

Scheme resolution order: plugin props `scheme` > `expo.scheme` > error.

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
  CheckoutRequest, CheckoutResult, CheckoutSession,
  SubscriptionData, SubscriptionStatus, CancelOptions, UpgradeOptions,
  LicenseData, LicenseStatus, LicenseInstance,
  ActivateLicenseRequest, ValidateLicenseRequest, DeactivateLicenseRequest,
  ProductData, ProductListData, PaginationData, ProductBillingType, ProductBillingPeriod,
  CustomerData, CustomerPortalData,
  EntitlementData, EntitlementOptions,
} from 'creem-expo';
```

## License

MIT
