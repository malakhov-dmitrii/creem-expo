import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { CreemProvider } from '../src/CreemProvider';
import { SubscriptionGate } from '../src/SubscriptionGate';
import type { CreemConfig } from '../src/types';

const CONFIG: CreemConfig = { apiUrl: 'http://test-api', authToken: 'tok_test' };
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CreemProvider config={CONFIG}>{children}</CreemProvider>
);

const mockFetch = jest.fn();
beforeEach(() => { global.fetch = mockFetch; mockFetch.mockReset(); });

const ACTIVE_SUB = {
  id: 'sub_1', status: 'active', productId: 'p1', customerId: 'c1',
  createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
};

describe('SubscriptionGate', () => {
  it('shows children when subscription is active', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve(ACTIVE_SUB),
    });

    const { getByText } = render(
      <SubscriptionGate subscriptionId="sub_1">
        <Text>Premium Content</Text>
      </SubscriptionGate>,
      { wrapper },
    );

    await waitFor(() => {
      expect(getByText('Premium Content')).toBeTruthy();
    });
  });

  it('shows fallback when subscription is canceled', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve({ ...ACTIVE_SUB, status: 'canceled' }),
    });

    const { getByText } = render(
      <SubscriptionGate subscriptionId="sub_1" fallback={<Text>Upgrade</Text>}>
        <Text>Premium Content</Text>
      </SubscriptionGate>,
      { wrapper },
    );

    await waitFor(() => {
      expect(getByText('Upgrade')).toBeTruthy();
    });
  });

  it('shows default paywall when no fallback provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve({ ...ACTIVE_SUB, status: 'canceled' }),
    });

    const { getByText } = render(
      <SubscriptionGate subscriptionId="sub_1">
        <Text>Premium Content</Text>
      </SubscriptionGate>,
      { wrapper },
    );

    await waitFor(() => {
      expect(getByText('Subscribe to access')).toBeTruthy();
    });
  });

  it('shows children for trialing status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve({ ...ACTIVE_SUB, status: 'trialing' }),
    });

    const { getByText } = render(
      <SubscriptionGate subscriptionId="sub_1">
        <Text>Premium Content</Text>
      </SubscriptionGate>,
      { wrapper },
    );

    await waitFor(() => {
      expect(getByText('Premium Content')).toBeTruthy();
    });
  });

  it('respects custom allowedStatuses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve({ ...ACTIVE_SUB, status: 'paused' }),
    });

    const { getByText } = render(
      <SubscriptionGate subscriptionId="sub_1" allowedStatuses={['active', 'trialing', 'paused']}>
        <Text>Premium Content</Text>
      </SubscriptionGate>,
      { wrapper },
    );

    await waitFor(() => {
      expect(getByText('Premium Content')).toBeTruthy();
    });
  });

  it('does not fetch when subscriptionId is null', () => {
    render(
      <SubscriptionGate subscriptionId={null}>
        <Text>Premium</Text>
      </SubscriptionGate>,
      { wrapper },
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
