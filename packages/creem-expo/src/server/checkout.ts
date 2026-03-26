import { Router } from 'express';
import { Creem } from 'creem';

export function createCheckoutRouter(creem: InstanceType<typeof Creem>): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const { productId, successUrl, metadata, discountCode } = req.body;
    if (!productId) {
      res.status(400).json({ error: 'productId is required' });
      return;
    }
    try {
      // Creem requires http(s):// with a valid hostname (not IP addresses).
      // Default to localhost-based URL if none provided or if IP-based.
      const effectiveSuccessUrl = successUrl && !successUrl.match(/\/\/\d+\.\d+\.\d+\.\d+/)
        ? successUrl
        : `http://localhost:${req.socket.localPort || 3001}/checkout-redirect?scheme=creemexpo`;
      const checkout = await creem.checkouts.create({ productId, successUrl: effectiveSuccessUrl, metadata, discountCode });
      res.json({ sessionId: checkout.id, checkoutUrl: checkout.checkoutUrl ?? null, status: checkout.status });
    } catch (err: any) {
      console.error('[creem-expo] checkout error:', err.message || err, err.body || '');
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  router.get('/:sessionId/verify', async (req, res) => {
    try {
      const checkout = await creem.checkouts.retrieve(req.params.sessionId);
      res.json({ sessionId: checkout.id, status: checkout.status });
    } catch (err) {
      res.status(404).json({ error: 'Checkout session not found' });
    }
  });

  return router;
}
