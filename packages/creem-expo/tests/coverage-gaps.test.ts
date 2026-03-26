/**
 * coverage-gaps.test.ts
 *
 * Parametrized tests targeting specific uncovered branches identified by the
 * initial coverage run. All tests are additive — no existing tests modified.
 *
 * Gaps targeted:
 *  useSubscription.ts
 *    - line 30 (false branch): catch block receives a non-Error thrown value
 *    - line 49 (branch): postAction called when subscriptionId is null/undefined
 *    - line 65 (false branch): catch block in postAction receives a non-Error
 *
 *  useCreemCheckout.ts
 *    - lines 35-37: openAuthSessionAsync returns type=success but url is empty/undefined
 *    - line 45 (false branch): catch block receives a non-Error thrown value
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { CreemProvider } from '../src/CreemProvider';
import { useSubscription } from '../src/useSubscription';
import { useCreemCheckout } from '../src/useCreemCheckout';
import type { CreemConfig } from '../src/types';

// ── Global fetch mock ────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// ── expo-web-browser mock ────────────────────────────────────────────────────
const mockOpenAuthSessionAsync = jest.fn();
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: any[]) => mockOpenAuthSessionAsync(...args),
}));
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `creemexpo://${path}`),
}));

// ── Provider wrapper helpers ─────────────────────────────────────────────────
const SUB_CONFIG: CreemConfig = { apiUrl: 'http://localhost:3001/api', authToken: 'tok_test' };
const CHECKOUT_CONFIG: CreemConfig = { apiUrl: 'http://localhost:3001/api', authToken: 'tok_test', scheme: 'creemexpo' };

function subWrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CreemProvider, { config: SUB_CONFIG, children });
}
function checkoutWrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CreemProvider, { config: CHECKOUT_CONFIG, children });
}

const MOCK_SUB_RESPONSE = {
  id: 'sub_1', status: 'active', productId: 'prod_1', customerId: 'cust_1',
  createdAt: '2026-01-15T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
};

function mockOkFetch(data: any = MOCK_SUB_RESPONSE) {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => data });
}

// ── useSubscription coverage gaps ────────────────────────────────────────────

describe('useSubscription — coverage gap: non-Error thrown in fetchSubscription (line 30 false branch)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('wraps a string rejection from fetch into an Error object', async () => {
    // Throw a plain string (not an Error instance) to hit the false branch of
    // `err instanceof Error ? err : new Error(String(err))` on line 30
    mockFetch.mockRejectedValueOnce('plain string error');

    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper: subWrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('plain string error');
  });
});

describe('useSubscription — coverage gap: postAction called with null subscriptionId (line 49 branch)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('cancel() is a no-op when subscriptionId is null', async () => {
    // Render hook with null subscriptionId — postAction should return early
    const { result } = renderHook(() => useSubscription(null), { wrapper: subWrapper });
    await act(async () => { await result.current.cancel(); });
    // fetch should never be called (mount fetch is skipped for null, action skipped too)
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('upgrade() is a no-op when subscriptionId is undefined', async () => {
    const { result } = renderHook(() => useSubscription(undefined), { wrapper: subWrapper });
    await act(async () => { await result.current.upgrade({ productId: 'prod_new' }); });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('pause() is a no-op when subscriptionId is null', async () => {
    const { result } = renderHook(() => useSubscription(null), { wrapper: subWrapper });
    await act(async () => { await result.current.pause(); });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resume() is a no-op when subscriptionId is null', async () => {
    const { result } = renderHook(() => useSubscription(null), { wrapper: subWrapper });
    await act(async () => { await result.current.resume(); });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('useSubscription — coverage gap: non-Error thrown in postAction (line 65 false branch)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('wraps a string rejection from cancel POST into an Error object', async () => {
    // First fetch (mount): succeed
    mockOkFetch();
    const { result } = renderHook(() => useSubscription('sub_1'), { wrapper: subWrapper });
    await waitFor(() => expect(result.current.subscription).not.toBeNull());

    // Second fetch (cancel POST): throw a plain string
    mockFetch.mockRejectedValueOnce('network gone');
    await act(async () => { await result.current.cancel(); });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('network gone');
  });
});

// ── useCreemCheckout coverage gaps ──────────────────────────────────────────

describe('useCreemCheckout — coverage gap: openAuthSessionAsync returns success with empty url (lines 35-37)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('falls through to canceled path when result.type=success but url is empty string', async () => {
    // Hit the `result.type === 'success' && result.url` branch where url is falsy
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ sessionId: 'cs_1', checkoutUrl: 'https://checkout.creem.io/cs_1', status: 'pending' }),
    });
    // type=success but url="" — second condition fails, falls through to return canceled
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'success', url: '' });

    const { result } = renderHook(() => useCreemCheckout(), { wrapper: checkoutWrapper });
    let checkoutResult: any;
    await act(async () => { checkoutResult = await result.current.checkout({ productId: 'prod_1' }); });

    // No verify fetch called (url was falsy)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(checkoutResult).toEqual({ sessionId: 'cs_1', status: 'canceled' });
  });

  it('falls through to canceled path when result.type=success but url is undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ sessionId: 'cs_2', checkoutUrl: 'https://checkout.creem.io/cs_2', status: 'pending' }),
    });
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'success', url: undefined });

    const { result } = renderHook(() => useCreemCheckout(), { wrapper: checkoutWrapper });
    let checkoutResult: any;
    await act(async () => { checkoutResult = await result.current.checkout({ productId: 'prod_2' }); });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(checkoutResult).toEqual({ sessionId: 'cs_2', status: 'canceled' });
  });
});

describe('useCreemCheckout — coverage gap: non-Error thrown (line 45 false branch)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('wraps a non-Error rejection from fetch into an Error object', async () => {
    // Throw a plain number to hit the false branch of `err instanceof Error`
    mockFetch.mockRejectedValueOnce(42);

    const { result } = renderHook(() => useCreemCheckout(), { wrapper: checkoutWrapper });
    let checkoutResult: any;
    await act(async () => { checkoutResult = await result.current.checkout({ productId: 'prod_1' }); });

    expect(checkoutResult).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('42');
  });
});

describe('useCreemCheckout — coverage gap: extractSessionId returns null, falls back to data.sessionId (line 35 ?? branch)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('uses data.sessionId when success URL has no session_id query param', async () => {
    // openAuthSessionAsync returns a success URL without ?session_id=... so
    // extractSessionId returns null and the ?? falls back to data.sessionId
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ sessionId: 'cs_fallback', checkoutUrl: 'https://checkout.creem.io/cs_fallback', status: 'pending' }),
    });
    // Verify call response
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ sessionId: 'cs_fallback', status: 'completed' }),
    });
    // Success URL with NO session_id param — extractSessionId returns null
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'creemexpo://checkout/success' });

    const { result } = renderHook(() => useCreemCheckout(), { wrapper: checkoutWrapper });
    let checkoutResult: any;
    await act(async () => { checkoutResult = await result.current.checkout({ productId: 'prod_fallback' }); });

    // Verify call was made with data.sessionId (cs_fallback), not from URL
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toBe('http://localhost:3001/api/checkout/cs_fallback/verify');
    expect(checkoutResult).toEqual({ sessionId: 'cs_fallback', status: 'completed' });
  });
});

// ── Parametrized: all 12 dispatchWebhookEvent event types are covered in vitest.
// No need to replicate here — this file targets client-side (jest) coverage only.
