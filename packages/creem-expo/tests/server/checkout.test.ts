import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCheckoutRouter } from '../../src/server/checkout';

const mockCheckoutsCreate = vi.fn();
const mockCheckoutsRetrieve = vi.fn();
const mockCreem = {
  checkouts: { create: mockCheckoutsCreate, retrieve: mockCheckoutsRetrieve },
} as any;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/checkout', createCheckoutRouter(mockCreem));
  return app;
}

describe('POST /checkout', () => {
  let app: express.Express;
  beforeEach(() => { vi.clearAllMocks(); app = buildApp(); });

  it('creates checkout session and returns sessionId + checkoutUrl', async () => {
    mockCheckoutsCreate.mockResolvedValue({
      id: 'cs_1',
      checkoutUrl: 'https://checkout.creem.io/cs_1',
      status: 'pending',
    });
    const res = await request(app)
      .post('/checkout')
      .send({ productId: 'prod_123' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      sessionId: 'cs_1',
      checkoutUrl: 'https://checkout.creem.io/cs_1',
      status: 'pending',
    });
    expect(mockCheckoutsCreate).toHaveBeenCalledWith({
      productId: 'prod_123',
      successUrl: expect.stringContaining('/checkout-redirect?scheme=creemexpo'),
      metadata: undefined,
      discountCode: undefined,
    });
  });

  it('passes successUrl, metadata, and discountCode to SDK', async () => {
    mockCheckoutsCreate.mockResolvedValue({ id: 'cs_2', checkoutUrl: 'https://x.io/cs_2', status: 'pending' });
    await request(app)
      .post('/checkout')
      .send({ productId: 'prod_123', successUrl: 'myapp://success', metadata: { userId: '1' }, discountCode: 'SAVE10' });
    expect(mockCheckoutsCreate).toHaveBeenCalledWith({
      productId: 'prod_123',
      successUrl: 'myapp://success',
      metadata: { userId: '1' },
      discountCode: 'SAVE10',
    });
  });

  it('returns 400 when productId is missing', async () => {
    const res = await request(app).post('/checkout').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'productId is required' });
    expect(mockCheckoutsCreate).not.toHaveBeenCalled();
  });

  it('returns checkoutUrl as null when SDK returns undefined', async () => {
    mockCheckoutsCreate.mockResolvedValue({ id: 'cs_3', checkoutUrl: undefined, status: 'pending' });
    const res = await request(app).post('/checkout').send({ productId: 'prod_x' });
    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toBeNull();
  });

  it('returns 500 when SDK throws', async () => {
    mockCheckoutsCreate.mockRejectedValue(new Error('SDK error'));
    const res = await request(app).post('/checkout').send({ productId: 'prod_x' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to create checkout session');
  });
});

describe('GET /checkout/:sessionId/verify', () => {
  let app: express.Express;
  beforeEach(() => { vi.clearAllMocks(); app = buildApp(); });

  it('returns sessionId and status from SDK', async () => {
    mockCheckoutsRetrieve.mockResolvedValue({ id: 'cs_1', status: 'completed' });
    const res = await request(app).get('/checkout/cs_1/verify');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sessionId: 'cs_1', status: 'completed' });
    expect(mockCheckoutsRetrieve).toHaveBeenCalledWith('cs_1');
  });

  it('returns pending status when checkout not yet completed', async () => {
    mockCheckoutsRetrieve.mockResolvedValue({ id: 'cs_1', status: 'pending' });
    const res = await request(app).get('/checkout/cs_1/verify');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });

  it('returns 404 when SDK throws (session not found)', async () => {
    mockCheckoutsRetrieve.mockRejectedValue(new Error('Not found'));
    const res = await request(app).get('/checkout/cs_invalid/verify');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Checkout session not found');
  });
});
