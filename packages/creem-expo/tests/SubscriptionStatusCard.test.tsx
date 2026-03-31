import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { SubscriptionStatusCard } from '../src/SubscriptionStatusCard';
import type { SubscriptionData } from '../src/types';

const ACTIVE_SUB: SubscriptionData = {
  id: 'sub_1', status: 'active', productId: 'p1', customerId: 'c1',
  currentPeriodEndDate: '2026-04-30T00:00:00Z',
  createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
};

const CANCELED_SUB: SubscriptionData = {
  id: 'sub_2', status: 'canceled', productId: 'p1', customerId: 'c1',
  canceledAt: '2026-03-15T00:00:00Z',
  createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
};

describe('SubscriptionStatusCard', () => {
  it('renders active state', () => {
    const { getByText } = render(<SubscriptionStatusCard subscription={ACTIVE_SUB} />);
    expect(getByText('Active')).toBeTruthy();
  });

  it('renders trialing state', () => {
    const sub = { ...ACTIVE_SUB, status: 'trialing' as const };
    const { getByText } = render(<SubscriptionStatusCard subscription={sub} />);
    expect(getByText('Trial')).toBeTruthy();
  });

  it('renders canceled state', () => {
    const { getByText } = render(<SubscriptionStatusCard subscription={CANCELED_SUB} />);
    expect(getByText('canceled')).toBeTruthy();
  });

  it('renders loading state', () => {
    const { getByText } = render(<SubscriptionStatusCard subscription={null} loading />);
    expect(getByText('Loading subscription...')).toBeTruthy();
  });

  it('renders error state', () => {
    const err = new Error('Network error');
    const { getByText } = render(<SubscriptionStatusCard subscription={null} error={err} />);
    expect(getByText('Network error')).toBeTruthy();
  });

  it('renders empty state', () => {
    const { getByText } = render(<SubscriptionStatusCard subscription={null} />);
    expect(getByText('No subscription')).toBeTruthy();
  });

  it('uses custom renderActive', () => {
    const { getByText } = render(
      <SubscriptionStatusCard
        subscription={ACTIVE_SUB}
        renderActive={(sub) => <Text>{`Custom: ${sub.id}`}</Text>}
      />,
    );
    expect(getByText('Custom: sub_1')).toBeTruthy();
  });

  it('uses custom renderLoading', () => {
    const { getByText } = render(
      <SubscriptionStatusCard subscription={null} loading renderLoading={() => <Text>Spinner</Text>} />,
    );
    expect(getByText('Spinner')).toBeTruthy();
  });
});
