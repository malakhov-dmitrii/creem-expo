import {
  formatPrice,
  formatDate,
  formatBillingPeriod,
  formatRelativeTime,
  isSubscriptionActive,
  getSubscriptionStatusLabel,
} from '../src/utils';
import type { SubscriptionData, SubscriptionStatus } from '../src/types';

describe('formatPrice', () => {
  it('formats USD cents', () => {
    expect(formatPrice(1000, 'USD')).toBe('$10.00');
  });
  it('formats EUR cents', () => {
    expect(formatPrice(999, 'EUR')).toBe('€9.99');
  });
  it('defaults to USD', () => {
    expect(formatPrice(500)).toBe('$5.00');
  });
  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('formats ISO date', () => {
    const result = formatDate('2026-03-31T00:00:00Z');
    expect(result).toContain('Mar');
    expect(result).toContain('31');
    expect(result).toContain('2026');
  });
  it('returns input on invalid date', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('formatBillingPeriod', () => {
  it.each([
    ['every-month', 'Monthly'],
    ['every-three-months', 'Quarterly'],
    ['every-six-months', 'Semi-annual'],
    ['every-year', 'Yearly'],
    ['once', 'One-time'],
  ] as const)('%s → %s', (input, expected) => {
    expect(formatBillingPeriod(input)).toBe(expected);
  });
});

describe('formatRelativeTime', () => {
  it('shows future days', () => {
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    expect(formatRelativeTime(future)).toBe('in 3 days');
  });
  it('shows past hours', () => {
    const past = new Date(Date.now() - 5 * 3600000).toISOString();
    expect(formatRelativeTime(past)).toBe('5 hours ago');
  });
  it('shows singular', () => {
    const future = new Date(Date.now() + 1 * 86400000).toISOString();
    expect(formatRelativeTime(future)).toBe('in 1 day');
  });
});

describe('isSubscriptionActive', () => {
  const makeSub = (status: SubscriptionStatus): SubscriptionData => ({
    id: 's1', status, productId: 'p1', customerId: 'c1',
    createdAt: '', updatedAt: '',
  });

  it('returns true for active', () => {
    expect(isSubscriptionActive(makeSub('active'))).toBe(true);
  });
  it('returns true for trialing', () => {
    expect(isSubscriptionActive(makeSub('trialing'))).toBe(true);
  });
  it('returns false for canceled', () => {
    expect(isSubscriptionActive(makeSub('canceled'))).toBe(false);
  });
  it('returns false for null', () => {
    expect(isSubscriptionActive(null)).toBe(false);
  });
});

describe('getSubscriptionStatusLabel', () => {
  it.each([
    ['active', 'Active'],
    ['trialing', 'Trial'],
    ['paused', 'Paused'],
    ['canceled', 'Canceled'],
    ['scheduled_cancel', 'Canceling'],
    ['unpaid', 'Unpaid'],
  ] as const)('%s → %s', (status, label) => {
    expect(getSubscriptionStatusLabel(status)).toBe(label);
  });
});
