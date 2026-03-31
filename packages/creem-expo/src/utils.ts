import type { SubscriptionData, SubscriptionStatus, ProductBillingPeriod } from './types';

export function formatPrice(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

const PERIOD_LABELS: Record<ProductBillingPeriod, string> = {
  'every-month': 'Monthly',
  'every-three-months': 'Quarterly',
  'every-six-months': 'Semi-annual',
  'every-year': 'Yearly',
  'once': 'One-time',
};

export function formatBillingPeriod(period: ProductBillingPeriod): string {
  return PERIOD_LABELS[period] ?? period;
}

export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const target = new Date(isoString).getTime();
  const diffMs = target - now;
  const absDiff = Math.abs(diffMs);
  const future = diffMs > 0;

  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  let label: string;
  if (days > 0) label = `${days} day${days > 1 ? 's' : ''}`;
  else if (hours > 0) label = `${hours} hour${hours > 1 ? 's' : ''}`;
  else if (minutes > 0) label = `${minutes} minute${minutes > 1 ? 's' : ''}`;
  else label = 'just now';

  if (label === 'just now') return label;
  return future ? `in ${label}` : `${label} ago`;
}

export function isSubscriptionActive(subscription: SubscriptionData | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'active' || subscription.status === 'trialing';
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  trialing: 'Trial',
  paused: 'Paused',
  canceled: 'Canceled',
  scheduled_cancel: 'Canceling',
  unpaid: 'Unpaid',
};

export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  return STATUS_LABELS[status] ?? status;
}
