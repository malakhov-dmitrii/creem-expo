import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import crypto from 'node:crypto';

const mockCheckoutsCreate = vi.fn();
const mockCheckoutsRetrieve = vi.fn();
const mockSubGet = vi.fn();
const mockSubCancel = vi.fn();
const mockSubUpgrade = vi.fn();
const mockSubPause = vi.fn();
const mockSubResume = vi.fn();

vi.mock('creem', () => ({
  Creem: vi.fn().mockImplementation(() => ({
    checkouts: { create: mockCheckoutsCreate, retrieve: mockCheckoutsRetrieve },
    subscriptions: {
      get: mockSubGet, cancel: mockSubCancel, upgrade: mockSubUpgrade,
      pause: mockSubPause, resume: mockSubResume,
    },
  })),
}));

import { createCreemRouter } from '../../src/server/index';

function buildApp(config?: Partial<import('../../src/types').CreemRouterConfig>) {
  const fullConfig = { apiKey: 'test_key', webhookSecret: 'whsec_test', ...config };
  const app = express();
  app.use('/api', createCreemRouter(fullConfig));
  return app;
}

function computeSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('createCreemRouter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /api/checkout with no body returns 400', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/checkout').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('productId is required');
  });

  it('GET /api/checkout/:id/verify route is mounted', async () => {
    mockCheckoutsRetrieve.mockResolvedValue({ id: 'cs_1', status: 'completed' });
    const app = buildApp();
    const res = await request(app).get('/api/checkout/cs_1/verify');
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe('cs_1');
  });

  it('GET /api/subscription/:id route is mounted', async () => {
    mockSubGet.mockResolvedValue({
      id: 'sub_1', status: 'active', product: 'prod_1', customer: 'cust_1',
      createdAt: '2026-01-01', updatedAt: '2026-01-01',
    });
    const app = buildApp();
    const res = await request(app).get('/api/subscription/sub_1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('sub_1');
  });

  it('POST /api/subscription/:id/cancel route is mounted', async () => {
    mockSubCancel.mockResolvedValue({ id: 'sub_1', status: 'canceled', product: 'p', customer: 'c', createdAt: '', updatedAt: '' });
    const app = buildApp();
    const res = await request(app).post('/api/subscription/sub_1/cancel').send({});
    expect(res.status).toBe(200);
  });

  it('POST /api/webhook with valid signature returns 200', async () => {
    const handler = vi.fn();
    const app = buildApp({ onCheckoutCompleted: handler });
    const body = JSON.stringify({ eventType: 'checkout.completed', id: 'evt_1', created_at: '', object: {} });
    const sig = computeSignature(body, 'whsec_test');
    const res = await request(app)
      .post('/api/webhook')
      .set('Content-Type', 'application/json')
      .set('creem-signature', sig)
      .send(body);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('all routes accessible when no authorize callback is configured', async () => {
    mockSubGet.mockResolvedValue({ id: 'sub_1', status: 'active', product: 'p', customer: 'c', createdAt: '', updatedAt: '' });
    const app = buildApp();
    const res = await request(app).get('/api/subscription/sub_1');
    expect(res.status).toBe(200);
  });

  it('subscription routes return 403 when authorize returns false', async () => {
    const app = buildApp({ authorize: async () => false });
    const res = await request(app).get('/api/subscription/sub_1');
    expect(res.status).toBe(403);
  });
});
