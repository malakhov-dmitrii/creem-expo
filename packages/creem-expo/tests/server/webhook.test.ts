import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { verifyWebhookSignature, parseWebhookEvent, dispatchWebhookEvent, createWebhookRouter } from '../../src/server/webhook';
import type { CreemRouterConfig, WebhookEvent } from '../../src/types';

function computeSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyWebhookSignature', () => {
  const secret = 'whsec_test123';
  const body = '{"eventType":"checkout.completed","id":"evt_1"}';

  it('returns true for valid HMAC-SHA256 signature', () => {
    const sig = computeSignature(body, secret);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it('returns false for tampered body', () => {
    const sig = computeSignature(body, secret);
    expect(verifyWebhookSignature(body + 'tampered', sig, secret)).toBe(false);
  });

  it('returns false for empty signature', () => {
    expect(verifyWebhookSignature(body, '', secret)).toBe(false);
  });

  it('returns false for undefined signature', () => {
    expect(verifyWebhookSignature(body, undefined as any, secret)).toBe(false);
  });

  it('returns false for wrong-length signature', () => {
    expect(verifyWebhookSignature(body, 'tooshort', secret)).toBe(false);
  });
});

describe('parseWebhookEvent', () => {
  it('parses JSON body into WebhookEvent with correct fields', () => {
    const raw = JSON.stringify({
      eventType: 'checkout.completed',
      id: 'evt_123',
      created_at: '2026-01-01T00:00:00Z',
      object: { checkout_id: 'cs_1' },
    });
    const event = parseWebhookEvent(raw);
    expect(event.eventType).toBe('checkout.completed');
    expect(event.id).toBe('evt_123');
    expect(event.created_at).toBe('2026-01-01T00:00:00Z');
    expect(event.object).toEqual({ checkout_id: 'cs_1' });
  });

  it('throws on malformed JSON', () => {
    expect(() => parseWebhookEvent('not json')).toThrow();
  });
});

describe('dispatchWebhookEvent', () => {
  it('calls onCheckoutCompleted for checkout.completed event', async () => {
    const handler = vi.fn();
    const config = { apiKey: 'k', webhookSecret: 's', onCheckoutCompleted: handler } as CreemRouterConfig;
    const event: WebhookEvent = { eventType: 'checkout.completed', id: 'evt_1', created_at: '', object: {} };
    await dispatchWebhookEvent(event, config);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('calls onSubscriptionCanceled (one L) for subscription.canceled event', async () => {
    const handler = vi.fn();
    const config = { apiKey: 'k', webhookSecret: 's', onSubscriptionCanceled: handler } as CreemRouterConfig;
    const event: WebhookEvent = { eventType: 'subscription.canceled', id: 'evt_2', created_at: '', object: {} };
    await dispatchWebhookEvent(event, config);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('calls onSubscriptionUnpaid for subscription.unpaid event', async () => {
    const handler = vi.fn();
    const config = { apiKey: 'k', webhookSecret: 's', onSubscriptionUnpaid: handler } as CreemRouterConfig;
    const event: WebhookEvent = { eventType: 'subscription.unpaid', id: 'evt_3', created_at: '', object: {} };
    await dispatchWebhookEvent(event, config);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('silently ignores unhandled event types (no throw)', async () => {
    const config = { apiKey: 'k', webhookSecret: 's' } as CreemRouterConfig;
    const event: WebhookEvent = { eventType: 'unknown.event', id: 'evt_4', created_at: '', object: {} };
    await expect(dispatchWebhookEvent(event, config)).resolves.toBeUndefined();
  });

  it('silently ignores event when matching handler is not configured', async () => {
    const config = { apiKey: 'k', webhookSecret: 's' } as CreemRouterConfig;
    const event: WebhookEvent = { eventType: 'checkout.completed', id: 'evt_5', created_at: '', object: {} };
    await expect(dispatchWebhookEvent(event, config)).resolves.toBeUndefined();
  });

  it('propagates error when handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('handler exploded'));
    const config = { apiKey: 'k', webhookSecret: 's', onCheckoutCompleted: handler } as CreemRouterConfig;
    const event: WebhookEvent = { eventType: 'checkout.completed', id: 'evt_6', created_at: '', object: {} };
    await expect(dispatchWebhookEvent(event, config)).rejects.toThrow('handler exploded');
  });
});

describe('createWebhookRouter (Express integration)', () => {
  const secret = 'whsec_integration';
  let app: express.Express;
  let handler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handler = vi.fn();
    const config: CreemRouterConfig = {
      apiKey: 'test_key',
      webhookSecret: secret,
      onCheckoutCompleted: handler,
    };
    app = express();
    app.use('/webhook', createWebhookRouter(config));
  });

  it('returns 200 with valid signature and calls handler', async () => {
    const body = JSON.stringify({ eventType: 'checkout.completed', id: 'evt_1', created_at: '', object: {} });
    const sig = computeSignature(body, secret);
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('creem-signature', sig)
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(handler).toHaveBeenCalled();
  });

  it('returns 401 with invalid signature', async () => {
    const body = JSON.stringify({ eventType: 'checkout.completed', id: 'evt_1', created_at: '', object: {} });
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('creem-signature', 'invalid_sig')
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid signature');
  });

  it('returns 401 when creem-signature header is missing entirely', async () => {
    const body = JSON.stringify({ eventType: 'checkout.completed', id: 'evt_1', created_at: '', object: {} });
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send(body);
    expect(res.status).toBe(401);
  });

  it('returns 400 with malformed JSON body', async () => {
    const body = 'not valid json {{{';
    const sig = computeSignature(body, secret);
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('creem-signature', sig)
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid JSON');
  });

  it('returns 500 when handler throws (error propagates to Express error handler)', async () => {
    handler.mockRejectedValue(new Error('handler failed'));
    const body = JSON.stringify({ eventType: 'checkout.completed', id: 'evt_1', created_at: '', object: {} });
    const sig = computeSignature(body, secret);
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(500).json({ error: 'Internal error' });
    });
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('creem-signature', sig)
      .send(body);
    expect(res.status).toBe(500);
  });
});
