/**
 * tests/server/coverage-gaps.test.ts
 *
 * Parametrized tests targeting specific uncovered branches identified by the
 * initial server coverage run. All tests are additive — no existing tests modified.
 *
 * Gaps targeted:
 *  webhook.ts
 *    - line 44 (true branch): req.body is already a string (not a Buffer)
 *    - line 45: empty rawBody → 400
 *
 *  subscription.ts
 *    - line 42 (catch): cancel throws → 500
 *    - line 46 (?? branch): req.body is undefined/null for upgrade
 *    - line 51 (catch): upgrade throws → 500
 *    - line 58 (catch): pause throws → 500
 *    - line 65 (catch): resume throws → 500
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import crypto from 'node:crypto';
import { createWebhookRouter } from '../../src/server/webhook';
import { createSubscriptionRouter } from '../../src/server/subscription';
import type { CreemRouterConfig } from '../../src/types';

// ── Helpers ──────────────────────────────────────────────────────────────────
function computeSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// ── webhook.ts coverage gaps ─────────────────────────────────────────────────

describe('createWebhookRouter — coverage gap: req.body is a string (line 44 true branch)', () => {
  const secret = 'whsec_gaps';

  it('processes correctly when express delivers body as a string (not Buffer)', async () => {
    // Simulate the case where req.body comes in as a string rather than Buffer.
    // We inject a custom middleware that sets req.body to a string before the
    // webhook handler, bypassing the raw() parser.
    const handler = vi.fn();
    const config: CreemRouterConfig = {
      apiKey: 'k', webhookSecret: secret, onCheckoutCompleted: handler,
    };

    const app = express();
    // Inject a middleware that sets body as a plain string (simulates string body)
    app.use('/webhook', (req, _res, next) => {
      const body = JSON.stringify({ eventType: 'checkout.completed', id: 'evt_str', created_at: '', object: {} });
      (req as any).body = body; // string, not Buffer
      next();
    }, createWebhookRouter(config));

    const body = JSON.stringify({ eventType: 'checkout.completed', id: 'evt_str', created_at: '', object: {} });
    const sig = computeSignature(body, secret);

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('creem-signature', sig)
      .send(body);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });
});

describe('createWebhookRouter — coverage gap: empty body → 400 (line 45)', () => {
  const secret = 'whsec_gaps';

  it('returns 400 when rawBody resolves to empty string', async () => {
    const config: CreemRouterConfig = { apiKey: 'k', webhookSecret: secret };
    const app = express();
    // Inject middleware that sets body to empty Buffer (toString yields '')
    app.use('/webhook', (req, _res, next) => {
      (req as any).body = Buffer.from('');
      next();
    }, createWebhookRouter(config));

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send('');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Empty body');
  });
});

// ── subscription.ts coverage gaps ────────────────────────────────────────────

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

function buildApp() {
  const config: any = { apiKey: 'k', webhookSecret: 's' };
  const app = express();
  app.use(express.json());
  app.use('/subscription', createSubscriptionRouter(mockCreem, config));
  return app;
}

describe('subscription router — coverage gap: error 500 paths (lines 42, 51, 58, 65)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /:id/cancel returns 500 when SDK throws', async () => {
    mockSubCancel.mockRejectedValue(new Error('cancel SDK error'));
    const res = await request(buildApp()).post('/subscription/sub_1/cancel').send({});
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to cancel subscription');
  });

  it('POST /:id/upgrade returns 500 when SDK throws', async () => {
    mockSubUpgrade.mockRejectedValue(new Error('upgrade SDK error'));
    const res = await request(buildApp()).post('/subscription/sub_1/upgrade').send({ productId: 'prod_x' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to upgrade subscription');
  });

  it('POST /:id/pause returns 500 when SDK throws', async () => {
    mockSubPause.mockRejectedValue(new Error('pause SDK error'));
    const res = await request(buildApp()).post('/subscription/sub_1/pause');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to pause subscription');
  });

  it('POST /:id/resume returns 500 when SDK throws', async () => {
    mockSubResume.mockRejectedValue(new Error('resume SDK error'));
    const res = await request(buildApp()).post('/subscription/sub_1/resume');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to resume subscription');
  });
});

describe('subscription router — coverage gap: req.body ?? {} for upgrade (line 46)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /:id/upgrade returns 400 when body is missing (no JSON body sent)', async () => {
    // Send request with no body at all — req.body will be undefined, ?? {} kicks in
    const res = await request(buildApp())
      .post('/subscription/sub_1/upgrade')
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('productId is required');
    expect(mockSubUpgrade).not.toHaveBeenCalled();
  });
});

// Parametrized: all 4 500-error routes covered above as individual tests for clarity.
