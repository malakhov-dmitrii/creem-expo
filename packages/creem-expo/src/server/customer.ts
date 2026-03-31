import { Router } from 'express';
import { Creem } from 'creem';
import type { CreemRouterConfig } from '../types';

export function serializeCustomer(cust: any) {
  return {
    id: cust.id,
    email: cust.email,
    name: cust.name ?? null,
    country: cust.country,
    createdAt: cust.createdAt?.toISOString?.() ?? cust.createdAt,
    updatedAt: cust.updatedAt?.toISOString?.() ?? cust.updatedAt,
  };
}

export function createCustomerRouter(creem: InstanceType<typeof Creem>, config: CreemRouterConfig): Router {
  const router = Router();

  const checkAuth = async (req: any, res: any, next: any) => {
    if (!config.authorize) { next(); return; }
    const entityId = req.params.customerId ?? req.body?.customerId;
    const allowed = await config.authorize(req, entityId);
    if (!allowed) { res.status(403).json({ error: 'Unauthorized' }); return; }
    next();
  };

  router.get('/:customerId', checkAuth, async (req, res) => {
    try {
      const cust = await creem.customers.retrieve(req.params.customerId);
      res.json(serializeCustomer(cust));
    } catch { res.status(500).json({ error: 'Failed to retrieve customer' }); }
  });

  router.post('/portal', checkAuth, async (req, res) => {
    const { customerId } = req.body ?? {};
    if (!customerId) { res.status(400).json({ error: 'customerId is required' }); return; }
    try {
      const links = await creem.customers.generateBillingLinks({ customerId });
      res.json({ portalUrl: links.customerPortalLink });
    } catch { res.status(500).json({ error: 'Failed to generate portal link' }); }
  });

  return router;
}
