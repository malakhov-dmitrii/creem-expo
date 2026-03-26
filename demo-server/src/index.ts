import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createCreemRouter } from '../../packages/creem-expo/src/server/index.js';

const app = express();
app.use(cors());

const users = new Map<string, { subscriptionId?: string; customerId?: string }>();

function authMiddleware(req: any, _res: any, next: any) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    req.userId = auth.slice(7);
  }
  next();
}
app.use(authMiddleware);

const creemRouter = createCreemRouter({
  apiKey: process.env.CREEM_API_KEY || 'creem_test_placeholder',
  webhookSecret: process.env.CREEM_WEBHOOK_SECRET || 'whsec_placeholder',
  serverIdx: 1,

  // Demo mode: allow all requests (no auth check)
  // In production, uncomment the authorize callback below
  // authorize: async (req, subscriptionId) => {
  //   const userId = (req as any).userId;
  //   if (!userId) return false;
  //   const user = users.get(userId);
  //   return user?.subscriptionId === subscriptionId;
  // },

  onCheckoutCompleted: async (event) => {
    console.log('[webhook] checkout.completed', event.object);
    const obj = event.object as any;
    const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
    const subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id;
    if (customerId) {
      users.set(customerId, { subscriptionId, customerId });
    }
  },

  onSubscriptionCanceled: async (event) => {
    console.log('[webhook] subscription.canceled', event.object);
  },

  onSubscriptionActive: async (event) => {
    console.log('[webhook] subscription.active', event.object);
  },

  onSubscriptionPaused: async (event) => {
    console.log('[webhook] subscription.paused', event.object);
  },

  onSubscriptionExpired: async (event) => {
    console.log('[webhook] subscription.expired', event.object);
  },

  onSubscriptionPastDue: async (event) => {
    console.log('[webhook] subscription.past_due', event.object);
  },

  onSubscriptionPaid: async (event) => {
    console.log('[webhook] subscription.paid', event.object);
  },

  onSubscriptionUnpaid: async (event) => {
    console.log('[webhook] subscription.unpaid', event.object);
  },
});

app.use('/api/creem', creemRouter);

// Redirect endpoint: Creem requires http(s):// successUrl.
// After payment, Creem redirects here, then we redirect to the app's deep link.
app.get('/checkout-redirect', (req, res) => {
  const sessionId = req.query.checkout_id || req.query.session_id || '';
  const scheme = req.query.scheme || 'creemexpo';
  res.redirect(`${scheme}://checkout/success?session_id=${sessionId}`);
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Demo server running on http://localhost:${PORT}`);
  console.log(`Creem routes at /api/creem`);
});
