# creem-expo — Creem Payments for Expo/React Native

Full-stack SDK for integrating [Creem](https://creem.io) payments into Expo/React Native apps. Includes React hooks, components, and an Express backend with HMAC-verified webhooks.

## Architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│   Expo Demo App     │        │   Demo Express Server │
│                     │  HTTP  │                       │
│  CreemProvider      │◄──────►│  createCreemRouter()  │
│   ├─useCreemCheckout│        │   ├─POST /checkout    │
│   ├─useSubscription │        │   ├─GET  /checkout/:id│     ┌──────────┐
│   └─CheckoutSheet   │        │   ├─GET  /sub/:id     │────►│ Creem API│
│                     │        │   ├─POST /sub/:id/*   │     └──────────┘
│  Deep link return   │        │   └─POST /webhook     │
│  (expo-linking)     │        │       (HMAC verify)   │
└─────────────────────┘        └──────────────────────┘
```

## Project Structure

```
bounties/02-expo-react-native/
├── packages/creem-expo/       # npm package
│   ├── src/
│   │   ├── index.ts           # Client barrel (Provider, hooks, types)
│   │   ├── CreemProvider.tsx   # React context provider
│   │   ├── useCreemCheckout.ts # Checkout flow hook
│   │   ├── useSubscription.ts  # Subscription management hook
│   │   ├── CreemCheckoutSheet.tsx # WebView checkout modal
│   │   ├── context.ts         # React context
│   │   ├── deep-link.ts       # Deep link utilities
│   │   ├── types.ts           # TypeScript types
│   │   └── server/
│   │       ├── index.ts       # Server barrel (createCreemRouter)
│   │       ├── webhook.ts     # HMAC verification + event dispatch
│   │       ├── checkout.ts    # Checkout routes
│   │       └── subscription.ts # Subscription routes
│   ├── tests/                 # 83 tests (Jest + Vitest)
│   └── dist/                  # Built output (CJS + ESM)
├── demo-server/               # Express backend demo
│   └── src/index.ts
├── demo-app/                  # Expo demo app
│   └── app/                   # Expo Router pages
├── .env.example
└── README.md
```

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/<user>/creem-expo.git
cd creem-expo/bounties/02-expo-react-native

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

# Server tests (Vitest)
npm run test:server

# Client tests (Jest)
npm test

# All tests
npm run test:all
```

## Key Features

- **In-app checkout** via WebView or system browser
- **Server-side verification** — don't trust client redirect URLs
- **HMAC webhook verification** with `crypto.timingSafeEqual`
- **Full subscription lifecycle** — cancel, upgrade, pause, resume
- **12 webhook event handlers** including `subscription.unpaid`
- **TypeScript strict** — zero `any` in public API
- **Dual CJS/ESM** build via tsup
- **83+ tests** across client (Jest) and server (Vitest)

## License

MIT
