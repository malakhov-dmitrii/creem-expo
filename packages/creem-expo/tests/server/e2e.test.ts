/**
 * End-to-end integration test: boots the full createCreemRouter
 * with all sub-routers (checkout, subscription, license, products,
 * customer, webhook) and exercises a realistic user journey:
 *
 *   1. Search products → pick one
 *   2. Create checkout → verify it completed
 *   3. Fetch subscription → cancel it
 *   4. Activate license → validate → deactivate
 *   5. Retrieve customer → open billing portal
 *   6. Receive webhook → handler fires
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import crypto from 'node:crypto';

// ─── SDK mocks ─────────────────────────────────────────────────────────
const mockCheckoutsCreate = vi.fn();
const mockCheckoutsRetrieve = vi.fn();
const mockSubGet = vi.fn();
const mockSubCancel = vi.fn();
const mockSubUpgrade = vi.fn();
const mockSubPause = vi.fn();
const mockSubResume = vi.fn();
const mockLicenseActivate = vi.fn();
const mockLicenseValidate = vi.fn();
const mockLicenseDeactivate = vi.fn();
const mockProductsSearch = vi.fn();
const mockProductsGet = vi.fn();
const mockCustomersRetrieve = vi.fn();
const mockCustomersGenerateBillingLinks = vi.fn();

vi.mock('creem', () => ({
  Creem: vi.fn().mockImplementation(() => ({
    checkouts: { create: mockCheckoutsCreate, retrieve: mockCheckoutsRetrieve },
    subscriptions: {
      get: mockSubGet, cancel: mockSubCancel, upgrade: mockSubUpgrade,
      pause: mockSubPause, resume: mockSubResume,
    },
    licenses: {
      activate: mockLicenseActivate, validate: mockLicenseValidate,
      deactivate: mockLicenseDeactivate,
    },
    products: { search: mockProductsSearch, get: mockProductsGet },
    customers: {
      retrieve: mockCustomersRetrieve,
      generateBillingLinks: mockCustomersGenerateBillingLinks,
    },
  })),
}));

import { createCreemRouter } from '../../src/server/index';

// ─── Fixtures ──────────────────────────────────────────────────────────
const PRODUCT = {
  id: 'prod_pro', name: 'Pro Plan', description: 'All features',
  price: 2900, currency: 'USD', billingType: 'recurring',
  billingPeriod: 'every-month', status: 'active', productUrl: null,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-03-01'),
};

const CHECKOUT = {
  id: 'cs_abc', checkoutUrl: 'https://checkout.creem.io/cs_abc', status: 'completed',
};

const SUBSCRIPTION = {
  id: 'sub_xyz', status: 'active',
  product: { id: 'prod_pro', name: 'Pro Plan' },
  customer: { id: 'cust_1', email: 'user@test.com' },
  currentPeriodStartDate: new Date('2026-03-01'),
  currentPeriodEndDate: new Date('2026-04-01'),
  canceledAt: null,
  createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-15'),
};

const LICENSE = {
  id: 'lic_1', status: 'active', key: 'LIC-PRO-001',
  activation: 1, activationLimit: 5,
  expiresAt: new Date('2027-03-01'),
  createdAt: new Date('2026-03-01'),
  instance: { id: 'inst_1', name: 'macbook', status: 'active', createdAt: new Date('2026-03-01') },
};

const CUSTOMER = {
  id: 'cust_1', email: 'user@test.com', name: 'Test User', country: 'US',
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-03-01'),
};

// ─── App builder ───────────────────────────────────────────────────────
const WEBHOOK_SECRET = 'whsec_e2e_test';
const onCheckoutCompleted = vi.fn();
const onSubscriptionCanceled = vi.fn();

function buildApp() {
  const app = express();
  app.use('/api', createCreemRouter({
    apiKey: 'creem_test_e2e',
    webhookSecret: WEBHOOK_SECRET,
    serverIdx: 1,
    onCheckoutCompleted,
    onSubscriptionCanceled,
  }));
  return app;
}

function sign(body: string): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

// ─── Tests ─────────────────────────────────────────────────────────────
describe('E2E: full user journey through all routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it('Step 1: search products and get details', async () => {
    mockProductsSearch.mockResolvedValueOnce({
      items: [PRODUCT],
      pagination: { totalRecords: 1, totalPages: 1, currentPage: 1, nextPage: null, prevPage: null },
    });
    mockProductsGet.mockResolvedValueOnce(PRODUCT);

    // Search
    const searchRes = await request(app).get('/api/products?pageNumber=1&pageSize=10');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.items).toHaveLength(1);
    expect(searchRes.body.items[0].name).toBe('Pro Plan');
    expect(searchRes.body.items[0].price).toBe(2900);
    expect(searchRes.body.pagination.totalRecords).toBe(1);
    expect(mockProductsSearch).toHaveBeenCalledWith(1, 10);

    // Get details
    const detailRes = await request(app).get('/api/products/prod_pro');
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe('prod_pro');
    expect(detailRes.body.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('Step 2: create checkout and verify', async () => {
    mockCheckoutsCreate.mockResolvedValueOnce(CHECKOUT);
    mockCheckoutsRetrieve.mockResolvedValueOnce(CHECKOUT);

    // Create
    const createRes = await request(app)
      .post('/api/checkout')
      .send({ productId: 'prod_pro', successUrl: 'myapp://success' });
    expect(createRes.status).toBe(200);
    expect(createRes.body.sessionId).toBe('cs_abc');
    expect(createRes.body.checkoutUrl).toContain('creem.io');

    // Verify
    const verifyRes = await request(app).get('/api/checkout/cs_abc/verify');
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.status).toBe('completed');
  });

  it('Step 3: fetch subscription, upgrade, pause, resume, cancel', async () => {
    mockSubGet.mockResolvedValue(SUBSCRIPTION);
    mockSubUpgrade.mockResolvedValueOnce({ ...SUBSCRIPTION, product: { id: 'prod_enterprise' } });
    mockSubPause.mockResolvedValueOnce({ ...SUBSCRIPTION, status: 'paused' });
    mockSubResume.mockResolvedValueOnce(SUBSCRIPTION);
    mockSubCancel.mockResolvedValueOnce({ ...SUBSCRIPTION, status: 'canceled', canceledAt: new Date() });

    // Fetch
    const getRes = await request(app).get('/api/subscription/sub_xyz');
    expect(getRes.status).toBe(200);
    expect(getRes.body.status).toBe('active');
    expect(getRes.body.productId).toBe('prod_pro');
    expect(getRes.body.customerId).toBe('cust_1');

    // Upgrade
    const upgradeRes = await request(app)
      .post('/api/subscription/sub_xyz/upgrade')
      .send({ productId: 'prod_enterprise', updateBehavior: 'proration-charge-immediately' });
    expect(upgradeRes.status).toBe(200);
    expect(mockSubUpgrade).toHaveBeenCalledWith('sub_xyz', {
      productId: 'prod_enterprise',
      updateBehavior: 'proration-charge-immediately',
    });

    // Pause
    const pauseRes = await request(app).post('/api/subscription/sub_xyz/pause').send({});
    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.status).toBe('paused');

    // Resume
    const resumeRes = await request(app).post('/api/subscription/sub_xyz/resume').send({});
    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.status).toBe('active');

    // Cancel
    const cancelRes = await request(app)
      .post('/api/subscription/sub_xyz/cancel')
      .send({ mode: 'immediate', onExecute: 'cancel' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('canceled');
  });

  it('Step 4: activate license, validate, deactivate', async () => {
    mockLicenseActivate.mockResolvedValueOnce(LICENSE);
    mockLicenseValidate.mockResolvedValueOnce(LICENSE);
    mockLicenseDeactivate.mockResolvedValueOnce({ ...LICENSE, status: 'inactive', instance: null });

    // Activate
    const actRes = await request(app)
      .post('/api/license/activate')
      .send({ key: 'LIC-PRO-001', instanceName: 'macbook' });
    expect(actRes.status).toBe(200);
    expect(actRes.body.status).toBe('active');
    expect(actRes.body.instance.name).toBe('macbook');
    expect(actRes.body.expiresAt).toBe('2027-03-01T00:00:00.000Z');
    expect(mockLicenseActivate).toHaveBeenCalledWith({ key: 'LIC-PRO-001', instanceName: 'macbook' });

    // Validate
    const valRes = await request(app)
      .post('/api/license/validate')
      .send({ key: 'LIC-PRO-001', instanceId: 'inst_1' });
    expect(valRes.status).toBe(200);
    expect(valRes.body.activation).toBe(1);
    expect(mockLicenseValidate).toHaveBeenCalledWith({ key: 'LIC-PRO-001', instanceId: 'inst_1' });

    // Deactivate
    const deactRes = await request(app)
      .post('/api/license/deactivate')
      .send({ key: 'LIC-PRO-001', instanceId: 'inst_1' });
    expect(deactRes.status).toBe(200);
    expect(deactRes.body.status).toBe('inactive');
    expect(deactRes.body.instance).toBeNull();
  });

  it('Step 5: retrieve customer and open billing portal', async () => {
    mockCustomersRetrieve.mockResolvedValueOnce(CUSTOMER);
    mockCustomersGenerateBillingLinks.mockResolvedValueOnce({
      customerPortalLink: 'https://billing.creem.io/portal/cust_1',
    });

    // Retrieve
    const custRes = await request(app).get('/api/customer/cust_1');
    expect(custRes.status).toBe(200);
    expect(custRes.body.email).toBe('user@test.com');
    expect(custRes.body.name).toBe('Test User');
    expect(custRes.body.createdAt).toBe('2026-01-01T00:00:00.000Z');

    // Portal
    const portalRes = await request(app)
      .post('/api/customer/portal')
      .send({ customerId: 'cust_1' });
    expect(portalRes.status).toBe(200);
    expect(portalRes.body.portalUrl).toBe('https://billing.creem.io/portal/cust_1');
    expect(mockCustomersGenerateBillingLinks).toHaveBeenCalledWith({ customerId: 'cust_1' });
  });

  it('Step 6: receive webhooks with HMAC verification', async () => {
    // checkout.completed
    const checkoutBody = JSON.stringify({
      eventType: 'checkout.completed', id: 'evt_1', created_at: '2026-03-30', object: { id: 'cs_abc' },
    });
    const checkoutRes = await request(app)
      .post('/api/webhook')
      .set('Content-Type', 'application/json')
      .set('creem-signature', sign(checkoutBody))
      .send(checkoutBody);
    expect(checkoutRes.status).toBe(200);
    expect(onCheckoutCompleted).toHaveBeenCalledTimes(1);

    // subscription.canceled
    const cancelBody = JSON.stringify({
      eventType: 'subscription.canceled', id: 'evt_2', created_at: '2026-03-30', object: { id: 'sub_xyz' },
    });
    const cancelRes = await request(app)
      .post('/api/webhook')
      .set('Content-Type', 'application/json')
      .set('creem-signature', sign(cancelBody))
      .send(cancelBody);
    expect(cancelRes.status).toBe(200);
    expect(onSubscriptionCanceled).toHaveBeenCalledTimes(1);

    // Invalid signature → 401
    const badRes = await request(app)
      .post('/api/webhook')
      .set('Content-Type', 'application/json')
      .set('creem-signature', 'deadbeef')
      .send(checkoutBody);
    expect(badRes.status).toBe(401);
  });

  // ─── Error cases ───────────────────────────────────────────────────
  it('returns proper errors for invalid requests', async () => {
    // Checkout without productId
    const r1 = await request(app).post('/api/checkout').send({});
    expect(r1.status).toBe(400);

    // License activate without key
    const r2 = await request(app).post('/api/license/activate').send({ instanceName: 'x' });
    expect(r2.status).toBe(400);

    // License validate without instanceId
    const r3 = await request(app).post('/api/license/validate').send({ key: 'x' });
    expect(r3.status).toBe(400);

    // Customer portal without customerId
    const r4 = await request(app).post('/api/customer/portal').send({});
    expect(r4.status).toBe(400);
  });

  it('handles SDK failures gracefully (500 for each route)', async () => {
    mockProductsSearch.mockRejectedValueOnce(new Error('SDK down'));
    mockProductsGet.mockRejectedValueOnce(new Error('SDK down'));
    mockLicenseActivate.mockRejectedValueOnce(new Error('SDK down'));
    mockCustomersRetrieve.mockRejectedValueOnce(new Error('SDK down'));
    mockCustomersGenerateBillingLinks.mockRejectedValueOnce(new Error('SDK down'));

    const results = await Promise.all([
      request(app).get('/api/products'),
      request(app).get('/api/products/prod_x'),
      request(app).post('/api/license/activate').send({ key: 'k', instanceName: 'n' }),
      request(app).get('/api/customer/cust_x'),
      request(app).post('/api/customer/portal').send({ customerId: 'cust_x' }),
    ]);

    results.forEach((r) => expect(r.status).toBe(500));
  });
});
