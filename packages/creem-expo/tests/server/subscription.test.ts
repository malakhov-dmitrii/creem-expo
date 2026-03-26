import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createSubscriptionRouter, serializeSubscription } from '../../src/server/subscription';

const mockSubGet = vi.fn();
const mockSubCancel = vi.fn();
const mockSubUpgrade = vi.fn();
const mockSubPause = vi.fn();
const mockSubResume = vi.fn();
const mockCreem = {
  subscriptions: {
    get: mockSubGet, cancel: mockSubCancel, upgrade: mockSubUpgrade,
    pause: mockSubPause, resume: mockSubResume,
  },
} as any;

const MOCK_SUB_ENTITY = {
  id: 'sub_1', status: 'active',
  product: { id: 'prod_1', name: 'Pro Plan' },
  customer: { id: 'cust_1', email: 'test@test.com' },
  currentPeriodStartDate: new Date('2026-03-01T00:00:00Z'),
  currentPeriodEndDate: new Date('2026-04-01T00:00:00Z'),
  canceledAt: null,
  createdAt: new Date('2026-01-15T00:00:00Z'),
  updatedAt: new Date('2026-03-01T00:00:00Z'),
};

const EXPECTED_SERIALIZED = {
  id: 'sub_1', status: 'active', productId: 'prod_1', customerId: 'cust_1',
  currentPeriodStartDate: '2026-03-01T00:00:00.000Z',
  currentPeriodEndDate: '2026-04-01T00:00:00.000Z',
  canceledAt: null,
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

function buildApp(authorize?: (req: any, subId: string) => Promise<boolean> | boolean) {
  const config: any = { apiKey: 'k', webhookSecret: 's', authorize };
  const app = express();
  app.use(express.json());
  app.use('/subscription', createSubscriptionRouter(mockCreem, config));
  return app;
}

describe('serializeSubscription', () => {
  it('serializes product object to productId string', () => {
    const result = serializeSubscription(MOCK_SUB_ENTITY);
    expect(result.productId).toBe('prod_1');
  });
  it('serializes product-as-string to productId', () => {
    const sub = { ...MOCK_SUB_ENTITY, product: 'prod_direct' };
    const result = serializeSubscription(sub);
    expect(result.productId).toBe('prod_direct');
  });
  it('serializes customer object to customerId string', () => {
    const result = serializeSubscription(MOCK_SUB_ENTITY);
    expect(result.customerId).toBe('cust_1');
  });
  it('serializes Date objects to ISO strings', () => {
    const result = serializeSubscription(MOCK_SUB_ENTITY);
    expect(result.currentPeriodEndDate).toBe('2026-04-01T00:00:00.000Z');
    expect(result.createdAt).toBe('2026-01-15T00:00:00.000Z');
  });
  it('passes through string dates unchanged', () => {
    const sub = { ...MOCK_SUB_ENTITY, currentPeriodEndDate: '2026-04-01' };
    const result = serializeSubscription(sub);
    expect(result.currentPeriodEndDate).toBe('2026-04-01');
  });
  it('handles null canceledAt', () => {
    const result = serializeSubscription(MOCK_SUB_ENTITY);
    expect(result.canceledAt).toBeNull();
  });
});

describe('GET /subscription/:id', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns serialized subscription data', async () => {
    mockSubGet.mockResolvedValue(MOCK_SUB_ENTITY);
    const app = buildApp();
    const res = await request(app).get('/subscription/sub_1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(EXPECTED_SERIALIZED);
    expect(mockSubGet).toHaveBeenCalledWith('sub_1');
  });
  it('returns 403 when authorize returns false', async () => {
    const app = buildApp(async () => false);
    const res = await request(app).get('/subscription/sub_1');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(mockSubGet).not.toHaveBeenCalled();
  });
  it('proceeds when authorize returns true', async () => {
    mockSubGet.mockResolvedValue(MOCK_SUB_ENTITY);
    const authorize = vi.fn().mockResolvedValue(true);
    const app = buildApp(authorize);
    const res = await request(app).get('/subscription/sub_1');
    expect(res.status).toBe(200);
    expect(authorize).toHaveBeenCalledWith(expect.anything(), 'sub_1');
  });
  it('returns 500 when SDK throws', async () => {
    mockSubGet.mockRejectedValue(new Error('API error'));
    const app = buildApp();
    const res = await request(app).get('/subscription/sub_1');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch subscription');
  });
});

describe('POST /subscription/:id/cancel', () => {
  beforeEach(() => vi.clearAllMocks());
  it('calls cancel with mode and onExecute, returns serialized sub', async () => {
    mockSubCancel.mockResolvedValue({ ...MOCK_SUB_ENTITY, status: 'canceled' });
    const app = buildApp();
    const res = await request(app).post('/subscription/sub_1/cancel').send({ mode: 'scheduled', onExecute: 'cancel' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('canceled');
    expect(mockSubCancel).toHaveBeenCalledWith('sub_1', { mode: 'scheduled', onExecute: 'cancel' });
  });
  it('calls cancel with empty body (SDK defaults)', async () => {
    mockSubCancel.mockResolvedValue(MOCK_SUB_ENTITY);
    const app = buildApp();
    const res = await request(app).post('/subscription/sub_1/cancel').send({});
    expect(res.status).toBe(200);
    expect(mockSubCancel).toHaveBeenCalledWith('sub_1', { mode: undefined, onExecute: undefined });
  });
  it('returns 403 when authorize returns false', async () => {
    const app = buildApp(async () => false);
    const res = await request(app).post('/subscription/sub_1/cancel').send({});
    expect(res.status).toBe(403);
    expect(mockSubCancel).not.toHaveBeenCalled();
  });
});

describe('POST /subscription/:id/upgrade', () => {
  beforeEach(() => vi.clearAllMocks());
  it('calls upgrade with productId and returns serialized sub', async () => {
    mockSubUpgrade.mockResolvedValue({ ...MOCK_SUB_ENTITY, product: { id: 'prod_new', name: 'Enterprise' } });
    const app = buildApp();
    const res = await request(app).post('/subscription/sub_1/upgrade').send({ productId: 'prod_new' });
    expect(res.status).toBe(200);
    expect(res.body.productId).toBe('prod_new');
    expect(mockSubUpgrade).toHaveBeenCalledWith('sub_1', { productId: 'prod_new', updateBehavior: undefined });
  });
  it('returns 400 when productId is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/subscription/sub_1/upgrade').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('productId is required');
    expect(mockSubUpgrade).not.toHaveBeenCalled();
  });
});

describe('POST /subscription/:id/pause', () => {
  beforeEach(() => vi.clearAllMocks());
  it('calls pause with just id and returns serialized sub', async () => {
    mockSubPause.mockResolvedValue({ ...MOCK_SUB_ENTITY, status: 'paused' });
    const app = buildApp();
    const res = await request(app).post('/subscription/sub_1/pause');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paused');
    expect(mockSubPause).toHaveBeenCalledWith('sub_1');
  });
});

describe('POST /subscription/:id/resume', () => {
  beforeEach(() => vi.clearAllMocks());
  it('calls resume with just id and returns serialized sub', async () => {
    mockSubResume.mockResolvedValue(MOCK_SUB_ENTITY);
    const app = buildApp();
    const res = await request(app).post('/subscription/sub_1/resume');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(mockSubResume).toHaveBeenCalledWith('sub_1');
  });
});
