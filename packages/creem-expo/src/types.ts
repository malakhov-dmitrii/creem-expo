// Checkout types
export interface CheckoutRequest {
  productId: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
  discountCode?: string;
}

export interface CheckoutResult {
  sessionId: string;
  status: 'completed' | 'canceled' | 'unknown';
}

export interface CheckoutSession {
  id: string;
  checkoutUrl: string | undefined;
  status: 'pending' | 'processing' | 'completed' | 'expired';
}

// Subscription types
export type SubscriptionStatus =
  | 'active' | 'canceled' | 'unpaid'
  | 'paused' | 'trialing' | 'scheduled_cancel';

export interface SubscriptionData {
  id: string;
  status: SubscriptionStatus;
  productId: string;
  customerId: string;
  currentPeriodStartDate?: string;
  currentPeriodEndDate?: string;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CancelOptions {
  mode?: 'immediate' | 'scheduled';
  onExecute?: 'cancel' | 'pause';
}

export interface UpgradeOptions {
  productId: string;
  updateBehavior?: 'proration-charge-immediately' | 'proration-charge' | 'proration-none';
}

// Provider config
export interface CreemConfig {
  apiUrl: string;
  authToken?: string;
  scheme?: string; // deep link scheme, e.g. 'creemexpo'
}

// Webhook types — 12 real Creem webhook events
export type WebhookEventType =
  | 'checkout.completed'
  | 'subscription.active'
  | 'subscription.canceled'    // ONE L — American spelling
  | 'subscription.paused'
  | 'subscription.past_due'
  | 'subscription.expired'
  | 'subscription.paid'
  | 'subscription.trialing'
  | 'subscription.unpaid'
  | 'subscription.update'
  | 'refund.created'
  | 'dispute.created';

export interface WebhookEvent<T = any> {
  eventType: string;
  id: string;
  created_at: string;
  object: T;
}

// Server router config
export type WebhookHandler<T = any> = (event: WebhookEvent<T>) => Promise<void> | void;

export interface CreemRouterConfig {
  apiKey: string;
  webhookSecret: string;
  serverIdx?: 0 | 1; // 0 = prod, 1 = test (default: 1)
  onCheckoutCompleted?: WebhookHandler;
  onSubscriptionActive?: WebhookHandler;
  onSubscriptionCanceled?: WebhookHandler; // ONE L
  onSubscriptionPaused?: WebhookHandler;
  onSubscriptionPastDue?: WebhookHandler;
  onSubscriptionExpired?: WebhookHandler;
  onSubscriptionPaid?: WebhookHandler;
  onSubscriptionTrialing?: WebhookHandler;
  onSubscriptionUnpaid?: WebhookHandler;
  onSubscriptionUpdate?: WebhookHandler;
  onRefundCreated?: WebhookHandler;
  onDisputeCreated?: WebhookHandler;
  authorize?: (req: any, subscriptionId: string) => Promise<boolean> | boolean;
}
