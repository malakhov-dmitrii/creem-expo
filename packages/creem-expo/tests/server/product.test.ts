import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createProductRouter, serializeProduct } from '../../src/server/product';

const mockSearch = vi.fn();
const mockGet = vi.fn();
const mockCreem = { products: { search: mockSearch, get: mockGet } } as any;

const MOCK_PRODUCT = {
  id: 'prod_1', name: 'Pro Plan', description: 'The pro plan',
  price: 2900, currency: 'USD', billingType: 'recurring', billingPeriod: 'every-month',
  status: 'active', productUrl: null,
  createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-03-01T00:00:00Z'),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/products', createProductRouter(mockCreem));
  return app;
}

beforeEach(() => { mockSearch.mockReset(); mockGet.mockReset(); });

describe('serializeProduct', () => {
  it('serializes dates', () => {
    const result = serializeProduct(MOCK_PRODUCT);
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2026-03-01T00:00:00.000Z');
  });
});

describe('GET /products', () => {
  it('searches products', async () => {
    mockSearch.mockResolvedValueOnce({
      items: [MOCK_PRODUCT],
      pagination: { totalRecords: 1, totalPages: 1, currentPage: 1, nextPage: null, prevPage: null },
    });
    const res = await request(buildApp()).get('/products');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe('prod_1');
  });

  it('passes query params', async () => {
    mockSearch.mockResolvedValueOnce({ items: [], pagination: null });
    await request(buildApp()).get('/products?pageNumber=2&pageSize=5');
    expect(mockSearch).toHaveBeenCalledWith(2, 5);
  });

  it('returns 500 on error', async () => {
    mockSearch.mockRejectedValueOnce(new Error('fail'));
    const res = await request(buildApp()).get('/products');
    expect(res.status).toBe(500);
  });
});

describe('GET /products/:productId', () => {
  it('gets a product', async () => {
    mockGet.mockResolvedValueOnce(MOCK_PRODUCT);
    const res = await request(buildApp()).get('/products/prod_1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Pro Plan');
    expect(mockGet).toHaveBeenCalledWith('prod_1');
  });

  it('returns 500 on error', async () => {
    mockGet.mockRejectedValueOnce(new Error('not found'));
    const res = await request(buildApp()).get('/products/prod_999');
    expect(res.status).toBe(500);
  });
});
