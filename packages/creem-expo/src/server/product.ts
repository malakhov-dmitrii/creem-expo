import { Router } from 'express';
import { Creem } from 'creem';

export function serializeProduct(prod: any) {
  return {
    id: prod.id,
    name: prod.name,
    description: prod.description ?? '',
    imageUrl: prod.imageUrl,
    price: prod.price,
    currency: prod.currency,
    billingType: prod.billingType,
    billingPeriod: prod.billingPeriod,
    status: prod.status,
    productUrl: prod.productUrl,
    createdAt: prod.createdAt?.toISOString?.() ?? prod.createdAt,
    updatedAt: prod.updatedAt?.toISOString?.() ?? prod.updatedAt,
  };
}

export function createProductRouter(creem: InstanceType<typeof Creem>): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const pageNumber = req.query.pageNumber ? Number(req.query.pageNumber) : undefined;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
      const result = await creem.products.search(pageNumber, pageSize);
      const items = (result.items ?? []).map(serializeProduct);
      res.json({ items, pagination: result.pagination ?? null });
    } catch { res.status(500).json({ error: 'Failed to search products' }); }
  });

  router.get('/:productId', async (req, res) => {
    try {
      const prod = await creem.products.get(req.params.productId);
      res.json(serializeProduct(prod));
    } catch { res.status(500).json({ error: 'Failed to get product' }); }
  });

  return router;
}
