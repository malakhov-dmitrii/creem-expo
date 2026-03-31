import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCustomerRouter, serializeCustomer } from '../../src/server/customer';

const mockRetrieve = vi.fn();
const mockGenerateBillingLinks = vi.fn();
const mockCreem = {
  customers: { retrieve: mockRetrieve, generateBillingLinks: mockGenerateBillingLinks },
} as any;

const MOCK_CUSTOMER = {
  id: 'cust_1', email: 'test@test.com', name: 'Test User', country: 'US',
  createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-03-01T00:00:00Z'),
};

function buildApp(authorize?: (req: any, entityId: string) => Promise<boolean> | boolean) {
  const config: any = { apiKey: 'k', webhookSecret: 's', authorize };
  const app = express();
  app.use(express.json());
  app.use('/customer', createCustomerRouter(mockCreem, config));
  return app;
}

beforeEach(() => { mockRetrieve.mockReset(); mockGenerateBillingLinks.mockReset(); });

describe('serializeCustomer', () => {
  it('serializes dates and name', () => {
    const result = serializeCustomer(MOCK_CUSTOMER);
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.name).toBe('Test User');
  });

  it('handles null name', () => {
    const result = serializeCustomer({ ...MOCK_CUSTOMER, name: null });
    expect(result.name).toBeNull();
  });
});

describe('GET /customer/:customerId', () => {
  it('retrieves a customer', async () => {
    mockRetrieve.mockResolvedValueOnce(MOCK_CUSTOMER);
    const res = await request(buildApp()).get('/customer/cust_1');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@test.com');
    expect(mockRetrieve).toHaveBeenCalledWith('cust_1');
  });

  it('returns 500 on error', async () => {
    mockRetrieve.mockRejectedValueOnce(new Error('fail'));
    const res = await request(buildApp()).get('/customer/cust_1');
    expect(res.status).toBe(500);
  });

  it('respects authorize callback', async () => {
    const res = await request(buildApp(() => false)).get('/customer/cust_1');
    expect(res.status).toBe(403);
  });
});

describe('POST /customer/portal', () => {
  it('generates portal link', async () => {
    mockGenerateBillingLinks.mockResolvedValueOnce({
      customerPortalLink: 'https://portal.creem.io/cust_1',
    });
    const res = await request(buildApp())
      .post('/customer/portal')
      .send({ customerId: 'cust_1' });
    expect(res.status).toBe(200);
    expect(res.body.portalUrl).toBe('https://portal.creem.io/cust_1');
    expect(mockGenerateBillingLinks).toHaveBeenCalledWith({ customerId: 'cust_1' });
  });

  it('returns 400 without customerId', async () => {
    const res = await request(buildApp()).post('/customer/portal').send({});
    expect(res.status).toBe(400);
  });

  it('returns 500 on error', async () => {
    mockGenerateBillingLinks.mockRejectedValueOnce(new Error('fail'));
    const res = await request(buildApp())
      .post('/customer/portal')
      .send({ customerId: 'cust_1' });
    expect(res.status).toBe(500);
  });
});
