import crypto from 'node:crypto';
import { Router, raw } from 'express';
import type { WebhookEvent, CreemRouterConfig } from '../types';

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function parseWebhookEvent(body: string): WebhookEvent {
  return JSON.parse(body);
}

const EVENT_MAP: Record<string, keyof CreemRouterConfig> = {
  'checkout.completed': 'onCheckoutCompleted',
  'subscription.active': 'onSubscriptionActive',
  'subscription.canceled': 'onSubscriptionCanceled',
  'subscription.paused': 'onSubscriptionPaused',
  'subscription.past_due': 'onSubscriptionPastDue',
  'subscription.expired': 'onSubscriptionExpired',
  'subscription.paid': 'onSubscriptionPaid',
  'subscription.trialing': 'onSubscriptionTrialing',
  'subscription.unpaid': 'onSubscriptionUnpaid',
  'subscription.update': 'onSubscriptionUpdate',
  'refund.created': 'onRefundCreated',
  'dispute.created': 'onDisputeCreated',
};

export async function dispatchWebhookEvent(event: WebhookEvent, config: CreemRouterConfig): Promise<void> {
  const handlerKey = EVENT_MAP[event.eventType];
  if (!handlerKey) return;
  const handler = config[handlerKey] as ((event: WebhookEvent) => Promise<void> | void) | undefined;
  if (handler) await handler(event);
}

export function createWebhookRouter(config: CreemRouterConfig): Router {
  const router = Router();
  router.post('/', raw({ type: 'application/json' }), async (req, res, next) => {
    const rawBody = typeof req.body === 'string' ? req.body : req.body?.toString('utf-8');
    if (!rawBody) { res.status(400).json({ error: 'Empty body' }); return; }
    const signature = req.headers['creem-signature'] as string;
    if (!verifyWebhookSignature(rawBody, signature, config.webhookSecret)) {
      res.status(401).json({ error: 'Invalid signature' }); return;
    }
    try {
      const event = parseWebhookEvent(rawBody);
      await dispatchWebhookEvent(event, config);
      res.status(200).json({ received: true });
    } catch (err) {
      if (err instanceof SyntaxError) {
        res.status(400).json({ error: 'Invalid JSON' });
      } else {
        next(err);
      }
    }
  });
  return router;
}
