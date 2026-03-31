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
  authorize?: (req: any, entityId: string) => Promise<boolean> | boolean;
}

// ── License types ──────────────────────────────────────────────────────

export type LicenseStatus = 'inactive' | 'active' | 'expired' | 'disabled';

export interface LicenseInstance {
  id: string;
  name: string;
  status: 'active' | 'deactivated';
  createdAt: string;
}

export interface LicenseData {
  id: string;
  status: LicenseStatus;
  key: string;
  activation: number;
  activationLimit?: number | null;
  expiresAt?: string | null;
  createdAt: string;
  instance?: LicenseInstance | null;
}

export interface ActivateLicenseRequest {
  key: string;
  instanceName: string;
}

export interface ValidateLicenseRequest {
  key: string;
  instanceId: string;
}

export interface DeactivateLicenseRequest {
  key: string;
  instanceId: string;
}

// ── Product types ──────────────────────────────────────────────────────

export type ProductBillingType = 'recurring' | 'onetime';
export type ProductBillingPeriod =
  | 'every-month' | 'every-three-months' | 'every-six-months' | 'every-year' | 'once';

export interface ProductData {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  currency: string;
  billingType: ProductBillingType;
  billingPeriod: ProductBillingPeriod;
  status: 'active' | 'archived';
  productUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationData {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  nextPage: number | null;
  prevPage: number | null;
}

export interface ProductListData {
  items: ProductData[];
  pagination: PaginationData;
}

// ── Customer types ─────────────────────────────────────────────────────

export interface CustomerData {
  id: string;
  email: string;
  name?: string | null;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPortalData {
  portalUrl: string;
}

// ── Entitlement types (unique to creem-expo) ───────────────────────────

export interface EntitlementData {
  subscriptionId: string;
  status: SubscriptionStatus;
  productId: string;
  expiresAt?: string | null;
  cachedAt: number;
}

export interface EntitlementOptions {
  /** TTL in milliseconds. Default: 300000 (5 minutes) */
  ttl?: number;
  /** AsyncStorage key prefix. Default: '@creem_entitlement_' */
  storageKeyPrefix?: string;
}
