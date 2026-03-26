import { Router, json } from 'express';
import { Creem } from 'creem';
import type { CreemRouterConfig } from '../types';
import { createCheckoutRouter } from './checkout';
import { createSubscriptionRouter } from './subscription';
import { createWebhookRouter } from './webhook';

export function createCreemRouter(config: CreemRouterConfig): Router {
  const creem = new Creem({
    apiKey: config.apiKey,
    serverIdx: config.serverIdx ?? 1,
  });

  const router = Router();

  // Apply json() only to checkout and subscription routes.
  // Webhook router uses raw() internally for HMAC signature verification —
  // running json() first would consume the raw body and break signature checks.
  router.use('/checkout', json(), createCheckoutRouter(creem));
  router.use('/subscription', json(), createSubscriptionRouter(creem, config));
  router.use('/webhook', createWebhookRouter(config));

  return router;
}

export { createCreemRouter as default };
export type { CreemRouterConfig, WebhookEvent, WebhookHandler } from '../types';
export { verifyWebhookSignature } from './webhook';
