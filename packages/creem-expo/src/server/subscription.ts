import { Router } from 'express';
import { Creem } from 'creem';
import type { CreemRouterConfig } from '../types';

export function serializeSubscription(sub: any) {
  return {
    id: sub.id,
    status: sub.status,
    productId: typeof sub.product === 'string' ? sub.product : sub.product?.id,
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    currentPeriodStartDate: sub.currentPeriodStartDate?.toISOString?.() ?? sub.currentPeriodStartDate,
    currentPeriodEndDate: sub.currentPeriodEndDate?.toISOString?.() ?? sub.currentPeriodEndDate,
    canceledAt: sub.canceledAt?.toISOString?.() ?? sub.canceledAt,
    createdAt: sub.createdAt?.toISOString?.() ?? sub.createdAt,
    updatedAt: sub.updatedAt?.toISOString?.() ?? sub.updatedAt,
  };
}

export function createSubscriptionRouter(creem: InstanceType<typeof Creem>, config: CreemRouterConfig): Router {
  const router = Router();

  const checkAuth = async (req: any, res: any, next: any) => {
    if (!config.authorize) { next(); return; }
    const subId = req.params.id;
    const allowed = await config.authorize(req, subId);
    if (!allowed) { res.status(403).json({ error: 'Unauthorized' }); return; }
    next();
  };

  router.get('/:id', checkAuth, async (req, res) => {
    try {
      const sub = await creem.subscriptions.get(req.params.id);
      res.json(serializeSubscription(sub));
    } catch { res.status(500).json({ error: 'Failed to fetch subscription' }); }
  });

  router.post('/:id/cancel', checkAuth, async (req, res) => {
    try {
      const { mode, onExecute } = req.body ?? {};
      const sub = await creem.subscriptions.cancel(req.params.id, { mode, onExecute });
      res.json(serializeSubscription(sub));
    } catch { res.status(500).json({ error: 'Failed to cancel subscription' }); }
  });

  router.post('/:id/upgrade', checkAuth, async (req, res) => {
    const { productId, updateBehavior } = req.body ?? {};
    if (!productId) { res.status(400).json({ error: 'productId is required' }); return; }
    try {
      const sub = await creem.subscriptions.upgrade(req.params.id, { productId, updateBehavior });
      res.json(serializeSubscription(sub));
    } catch { res.status(500).json({ error: 'Failed to upgrade subscription' }); }
  });

  router.post('/:id/pause', checkAuth, async (req, res) => {
    try {
      const sub = await creem.subscriptions.pause(req.params.id);
      res.json(serializeSubscription(sub));
    } catch { res.status(500).json({ error: 'Failed to pause subscription' }); }
  });

  router.post('/:id/resume', checkAuth, async (req, res) => {
    try {
      const sub = await creem.subscriptions.resume(req.params.id);
      res.json(serializeSubscription(sub));
    } catch { res.status(500).json({ error: 'Failed to resume subscription' }); }
  });

  return router;
}
