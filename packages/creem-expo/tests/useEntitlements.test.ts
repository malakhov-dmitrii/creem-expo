import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { CreemProvider } from '../src/CreemProvider';
import { useEntitlements } from '../src/useEntitlements';
import type { CreemConfig } from '../src/types';
import AsyncStorage from './__mocks__/async-storage';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const CONFIG: CreemConfig = { apiUrl: 'http://localhost:3001/api', authToken: 'tok_test' };
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CreemProvider, { config: CONFIG, children });
}

function mockOkFetch(data: any) {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => data });
}
function mockFailFetch(status = 500) {
  mockFetch.mockResolvedValueOnce({ ok: false, status, json: async () => ({ error: 'fail' }) });
}

const SUB_RESPONSE = {
  id: 'sub_123',
  status: 'active',
  productId: 'prod_1',
  customerId: 'cust_1',
  currentPeriodEndDate: '2026-04-30T00:00:00Z',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

describe('useEntitlements', () => {
  beforeEach(() => { jest.clearAllMocks(); AsyncStorage.clear(); });

  it('fetches subscription and creates entitlement on mount', async () => {
    mockOkFetch(SUB_RESPONSE);
    const { result } = renderHook(() => useEntitlements('sub_123'), { wrapper });

    await waitFor(() => { expect(result.current.entitlement).not.toBeNull(); });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/subscription/sub_123',
      expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': 'Bearer tok_test' }) }),
    );
    expect(result.current.entitlement!.subscriptionId).toBe('sub_123');
    expect(result.current.entitlement!.status).toBe('active');
    expect(result.current.entitlement!.productId).toBe('prod_1');
    expect(result.current.entitlement!.expiresAt).toBe('2026-04-30T00:00:00Z');
    expect(result.current.loading).toBe(false);
  });

  it('isActive true when status is active', async () => {
    mockOkFetch(SUB_RESPONSE);
    const { result } = renderHook(() => useEntitlements('sub_123'), { wrapper });

    await waitFor(() => { expect(result.current.entitlement).not.toBeNull(); });
    expect(result.current.isActive).toBe(true);
  });

  it('isActive true when status is trialing', async () => {
    mockOkFetch({ ...SUB_RESPONSE, status: 'trialing' });
    const { result } = renderHook(() => useEntitlements('sub_123'), { wrapper });

    await waitFor(() => { expect(result.current.entitlement).not.toBeNull(); });
    expect(result.current.isActive).toBe(true);
  });

  it('isActive false when status is canceled', async () => {
    mockOkFetch({ ...SUB_RESPONSE, status: 'canceled' });
    const { result } = renderHook(() => useEntitlements('sub_123'), { wrapper });

    await waitFor(() => { expect(result.current.entitlement).not.toBeNull(); });
    expect(result.current.isActive).toBe(false);
  });

  it('does nothing when subscriptionId is null', async () => {
    const { result } = renderHook(() => useEntitlements(null), { wrapper });

    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.entitlement).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    mockFailFetch(500);
    const { result } = renderHook(() => useEntitlements('sub_123'), { wrapper });

    await waitFor(() => { expect(result.current.error).toBeTruthy(); });
    expect(result.current.error!.message).toContain('Failed to fetch subscription');
    expect(result.current.entitlement).toBeNull();
  });

  it('wraps non-Error throws', async () => {
    mockFetch.mockRejectedValueOnce('network down');
    const { result } = renderHook(() => useEntitlements('sub_123'), { wrapper });

    await waitFor(() => { expect(result.current.error).toBeTruthy(); });
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('network down');
  });

  it('refresh refetches from server', async () => {
    mockOkFetch(SUB_RESPONSE);
    const { result } = renderHook(() => useEntitlements('sub_123'), { wrapper });

    await waitFor(() => { expect(result.current.entitlement).not.toBeNull(); });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockOkFetch({ ...SUB_RESPONSE, status: 'canceled' });
    await act(async () => { await result.current.refresh(); });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.entitlement!.status).toBe('canceled');
    expect(result.current.isActive).toBe(false);
  });
});
