import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState } from 'react-native';
import { CreemProvider } from '../src/CreemProvider';
import { useSubscription } from '../src/useSubscription';
import type { CreemConfig } from '../src/types';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

let appStateListener: ((state: string) => void) | null = null;
const mockRemove = jest.fn();
jest.spyOn(AppState, 'addEventListener').mockImplementation((event: string, handler: any) => {
  if (event === 'change') appStateListener = handler;
  return { remove: mockRemove } as any;
});

const CONFIG: CreemConfig = { apiUrl: 'http://localhost:3001/api', authToken: 'tok_test' };
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CreemProvider, { config: CONFIG, children });
}

const MOCK_SUB_RESPONSE = {
  id: 'sub_1', status: 'active', productId: 'prod_1', customerId: 'cust_1',
  currentPeriodEndDate: '2026-04-01T00:00:00.000Z',
  createdAt: '2026-01-15T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
};

function mockOkFetch(data: any = MOCK_SUB_RESPONSE) {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => data });
}
function mockFailFetch(status = 500) {
  mockFetch.mockResolvedValueOnce({ ok: false, status, json: async () => ({ error: 'fail' }) });
}

describe('useSubscription', () => {
  beforeEach(() => { jest.clearAllMocks(); appStateListener = null; });

  it('fetches subscription data on mount', async () => {
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => { expect(result.current.subscription).toEqual(MOCK_SUB_RESPONSE); });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/subscription/sub_1',
      expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': 'Bearer tok_test' }) }),
    );
  });

  it('sets loading to true during fetch and false after', async () => {
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.subscription).not.toBeNull();
  });

  it('sets error when fetch fails', async () => {
    mockFailFetch(500);
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => { expect(result.current.error).toBeTruthy(); });
    expect(result.current.error!.message).toContain('Failed to fetch subscription');
    expect(result.current.subscription).toBeNull();
  });

  it('does NOT fetch when subscriptionId is null', async () => {
    const { result } = renderHook(() => useSubscription(null), { wrapper });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.subscription).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('cancel() sends POST with mode and onExecute', async () => {
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => expect(result.current.subscription).not.toBeNull());
    mockOkFetch({ ...MOCK_SUB_RESPONSE, status: 'canceled' });
    await act(async () => { await result.current.cancel({ mode: 'scheduled', onExecute: 'cancel' }); });
    expect(mockFetch).toHaveBeenLastCalledWith(
      'http://localhost:3001/api/subscription/sub_1/cancel',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ mode: 'scheduled', onExecute: 'cancel' }) }),
    );
    expect(result.current.subscription!.status).toBe('canceled');
  });

  it('cancel() sets error when server returns 4xx and does not update subscription', async () => {
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => expect(result.current.subscription).not.toBeNull());
    mockFailFetch(403);
    await act(async () => { await result.current.cancel({ mode: 'immediate' }); });
    expect(result.current.error).toBeTruthy();
    expect(result.current.error!.message).toContain('Failed to cancel');
    expect(result.current.subscription!.status).toBe('active');
  });

  it('upgrade() sends POST with productId', async () => {
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => expect(result.current.subscription).not.toBeNull());
    mockOkFetch({ ...MOCK_SUB_RESPONSE, productId: 'prod_new' });
    await act(async () => { await result.current.upgrade({ productId: 'prod_new' }); });
    expect(mockFetch).toHaveBeenLastCalledWith(
      'http://localhost:3001/api/subscription/sub_1/upgrade',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ productId: 'prod_new' }) }),
    );
    expect(result.current.subscription!.productId).toBe('prod_new');
  });

  it('pause() sends POST with no body', async () => {
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => expect(result.current.subscription).not.toBeNull());
    mockOkFetch({ ...MOCK_SUB_RESPONSE, status: 'paused' });
    await act(async () => { await result.current.pause(); });
    expect(mockFetch).toHaveBeenLastCalledWith(
      'http://localhost:3001/api/subscription/sub_1/pause',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.subscription!.status).toBe('paused');
  });

  it('resume() sends POST with no body', async () => {
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => expect(result.current.subscription).not.toBeNull());
    mockOkFetch(MOCK_SUB_RESPONSE);
    await act(async () => { await result.current.resume(); });
    expect(mockFetch).toHaveBeenLastCalledWith(
      'http://localhost:3001/api/subscription/sub_1/resume',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('refetch() re-fetches subscription data', async () => {
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => expect(result.current.subscription).not.toBeNull());
    mockOkFetch({ ...MOCK_SUB_RESPONSE, status: 'paused' });
    await act(async () => { await result.current.refetch(); });
    expect(result.current.subscription!.status).toBe('paused');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('refetches on AppState change to active', async () => {
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => expect(result.current.subscription).not.toBeNull());
    expect(appStateListener).not.toBeNull();
    mockOkFetch({ ...MOCK_SUB_RESPONSE, status: 'canceled' });
    await act(async () => {
      appStateListener!('active');
      await new Promise((r) => setTimeout(r, 50));
    });
    await waitFor(() => { expect(result.current.subscription!.status).toBe('canceled'); });
  });

  it('includes Authorization header when authToken is configured', async () => {
    mockOkFetch();
    renderHook(() => useSubscription('sub_1'), { wrapper });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': 'Bearer tok_test' }) }),
      );
    });
  });
});
