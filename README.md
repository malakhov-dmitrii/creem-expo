# creem-expo — Creem Payments for Expo/React Native

[![npm version](https://img.shields.io/npm/v/creem-expo.svg)](https://www.npmjs.com/package/creem-expo)
[![CI](https://github.com/malakhov-dmitrii/creem-expo/actions/workflows/ci.yml/badge.svg)](https://github.com/malakhov-dmitrii/creem-expo/actions/workflows/ci.yml)

Full-stack SDK for integrating [Creem](https://creem.io) payments into Expo/React Native apps. 231 tests, secure server-side architecture, offline entitlements, and production-ready UI components.

## Architecture

```
┌───────────────────────────┐        ┌──────────────────────────────┐
│   Expo App                │        │   Express Server             │
│                           │  HTTP  │                              │
│  CreemProvider            │◄──────►│  createCreemRouter()         │
│   ├─useCreemCheckout      │        │   ├─POST /checkout           │
│   ├─useSubscription       │        │   ├─GET  /checkout/:id/verify│
│   ├─useCreemLicense       │        │   ├─GET  /subscription/:id   │
│   ├─useCreemProducts      │        │   ├─POST /subscription/:id/* │  ┌──────────┐
│   ├─useCreemCustomerPortal│        │   ├─POST /license/*          │─►│ Creem API│
│   ├─useEntitlements       │        │   ├─GET  /products           │  └──────────┘
│   └─CheckoutSheet         │        │   ├─GET  /customer/:id       │
│                           │        │   ├─POST /customer/portal    │
│  Components:              │        │   └─POST /webhook (HMAC)     │
│   ├─SubscriptionGate      │        └──────────────────────────────┘
│   ├─SubscriptionStatusCard│
│   ├─SubscriptionBadge     │
│   └─CreemCheckoutButton   │
└───────────────────────────┘
```

## Project Structure

```
├── packages/creem-expo/       # npm package (v1.0.0)
│   ├── src/
│   │   ├── index.ts           # Client exports (6 hooks, 5 components, 6 utils)
│   │   ├── CreemProvider.tsx   # React context provider
│   │   ├── useCreemCheckout.ts # Checkout flow hook
│   │   ├── useSubscription.ts  # Subscription management hook
│   │   ├── useCreemLicense.ts  # License key management hook
│   │   ├── useCreemProducts.ts # Product catalog hook
│   │   ├── useCreemCustomerPortal.ts # Billing portal hook
│   │   ├── useEntitlements.ts  # Offline-cached entitlement hook
│   │   ├── CreemCheckoutSheet.tsx # WebView checkout modal
│   │   ├── SubscriptionGate.tsx   # Paywall component
│   │   ├── SubscriptionStatusCard.tsx # Status display
│   │   ├── SubscriptionBadge.tsx  # Status badge
│   │   ├── CreemCheckoutButton.tsx # Styled checkout button
│   │   ├── utils.ts           # formatPrice, formatDate, etc.
│   │   ├── types.ts           # Full TypeScript types
│   │   ├── plugin/            # Expo config plugin (deep links)
│   │   └── server/
│   │       ├── index.ts       # Server barrel (createCreemRouter)
│   │       ├── webhook.ts     # HMAC verification + event dispatch
│   │       ├── checkout.ts    # Checkout routes
│   │       ├── subscription.ts # Subscription routes
│   │       ├── license.ts     # License routes
│   │       ├── product.ts     # Product routes
│   │       └── customer.ts    # Customer routes
│   ├── tests/                 # 231 tests (Jest + Vitest)
│   └── dist/                  # Built output (CJS + ESM + DTS)
├── demo-server/               # Express backend demo
│   └── src/index.ts
├── demo-app/                  # Expo demo app
│   └── app/                   # Expo Router pages
├── .github/workflows/ci.yml   # GitHub Actions (Node 18 + 20)
└── .env.example
```

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/malakhov-dmitrii/creem-expo.git
cd creem-expo

# Install package dependencies
cd packages/creem-expo && npm install --legacy-peer-deps

# Install demo server dependencies
cd ../../demo-server && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Creem test API key and webhook secret
```

### 3. Run

```bash
# Terminal 1: Start demo server
cd demo-server && npm run dev

# Terminal 2: Start Expo app
cd demo-app && npx expo start
```

## Using in Your Own App

```bash
npm install creem-expo
```

See [packages/creem-expo/README.md](packages/creem-expo/README.md) for full API documentation.

## Testing

```bash
cd packages/creem-expo

# Client tests — 133 tests (Jest)
npm test

# Server tests — 98 tests (Vitest)
npm run test:server

# All tests — 231 total
npm run test:all
```

## Key Features

- **6 React hooks** — checkout, subscriptions, licenses, products, customer portal, entitlements
- **5 UI components** — SubscriptionGate (paywall), StatusCard, Badge, CheckoutButton, CheckoutSheet
- **Offline entitlements** — AsyncStorage-cached subscription status with TTL and auto-revalidation
- **In-app checkout** via WebView modal or system browser
- **Server-side verification** — don't trust client redirect URLs
- **HMAC webhook verification** with `crypto.timingSafeEqual`
- **Full subscription lifecycle** — cancel, upgrade, pause, resume
- **License management** — activate, validate, deactivate
- **Product catalog** — search with pagination
- **Customer billing portal** — generate and open portal links
- **12 webhook event handlers** including `subscription.unpaid`
- **Utility functions** — formatPrice, formatDate, formatBillingPeriod, isSubscriptionActive
- **TypeScript strict** — full types for all hooks, components, and server routes
- **Dual CJS/ESM** build via tsup
- **231 tests** across client (Jest) and server (Vitest), including E2E integration
- **GitHub Actions CI** on Node 18 + 20

## License

MIT
