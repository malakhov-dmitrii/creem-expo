import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { CreemProvider } from '../src/CreemProvider';
import { useCreemCheckout } from '../src/useCreemCheckout';
import { extractSessionId, buildSuccessUrl } from '../src/deep-link';
import type { CreemConfig } from '../src/types';

// --- Mocks ---
const mockOpenAuthSessionAsync = jest.fn();
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: any[]) => mockOpenAuthSessionAsync(...args),
}));
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `creemexpo://${path}`),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// --- Helpers ---
const CONFIG: CreemConfig = { apiUrl: 'http://localhost:3001/api', authToken: 'tok_test', scheme: 'creemexpo' };
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CreemProvider, { config: CONFIG, children });
}

function mockFetchResponses(...responses: Array<{ ok: boolean; json: () => Promise<any>; status?: number }>) {
  responses.forEach((r) => {
    mockFetch.mockResolvedValueOnce({ ok: r.ok, status: r.status ?? (r.ok ? 200 : 500), json: r.json });
  });
}

// extractSessionId unit tests
describe('extractSessionId', () => {
  it('returns session_id from valid URL', () => {
    expect(extractSessionId('creemexpo://checkout/success?session_id=cs_123')).toBe('cs_123');
  });
  it('returns null when session_id param is missing', () => {
    expect(extractSessionId('creemexpo://checkout/success')).toBeNull();
  });
  it('returns null for malformed URL string', () => {
    expect(extractSessionId('not a url at all')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(extractSessionId('')).toBeNull();
  });
});

describe('buildSuccessUrl', () => {
  it('returns a creemexpo:// URL via expo-linking', () => {
    const url = buildSuccessUrl('creemexpo');
    expect(url).toBe('creemexpo://checkout/success');
  });
});

// useCreemCheckout hook tests
describe('useCreemCheckout', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('sends POST to {apiUrl}/checkout with correct body and auth header', async () => {
    mockFetchResponses(
      { ok: true, json: async () => ({ sessionId: 'cs_1', checkoutUrl: 'https://checkout.creem.io/cs_1', status: 'pending' }) },
    );
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    await act(async () => { await result.current.checkout({ productId: 'prod_1' }); });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/checkout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json', 'Authorization': 'Bearer tok_test' }),
      }),
    );
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.productId).toBe('prod_1');
    expect(callBody.successUrl).toBe('http://localhost:3001/checkout-redirect?scheme=creemexpo');
  });

  it('opens browser with openAuthSessionAsync(checkoutUrl, successUrl)', async () => {
    mockFetchResponses(
      { ok: true, json: async () => ({ sessionId: 'cs_1', checkoutUrl: 'https://checkout.creem.io/cs_1', status: 'pending' }) },
    );
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    await act(async () => { await result.current.checkout({ productId: 'prod_1' }); });
    expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
      'https://checkout.creem.io/cs_1', 'creemexpo://checkout/success',
    );
  });

  it('on success: verifies server-side then returns completed result', async () => {
    mockFetchResponses(
      { ok: true, json: async () => ({ sessionId: 'cs_1', checkoutUrl: 'https://checkout.creem.io/cs_1', status: 'pending' }) },
      { ok: true, json: async () => ({ sessionId: 'cs_1', status: 'completed' }) },
    );
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'creemexpo://checkout/success?session_id=cs_1' });
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    let checkoutResult: any;
    await act(async () => { checkoutResult = await result.current.checkout({ productId: 'prod_1' }); });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toBe('http://localhost:3001/api/checkout/cs_1/verify');
    expect(checkoutResult).toEqual({ sessionId: 'cs_1', status: 'completed' });
  });

  it('on cancel: returns canceled result without verification', async () => {
    mockFetchResponses(
      { ok: true, json: async () => ({ sessionId: 'cs_1', checkoutUrl: 'https://checkout.creem.io/cs_1', status: 'pending' }) },
    );
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    let checkoutResult: any;
    await act(async () => { checkoutResult = await result.current.checkout({ productId: 'prod_1' }); });
    expect(checkoutResult).toEqual({ sessionId: 'cs_1', status: 'canceled' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('sets error when checkoutUrl is null from server', async () => {
    mockFetchResponses(
      { ok: true, json: async () => ({ sessionId: 'cs_1', checkoutUrl: null, status: 'pending' }) },
    );
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    let checkoutResult: any;
    await act(async () => { checkoutResult = await result.current.checkout({ productId: 'prod_1' }); });
    expect(checkoutResult).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error!.message).toContain('No checkout URL');
    expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
  });

  it('sets error when POST /checkout fails', async () => {
    mockFetchResponses({ ok: false, status: 500, json: async () => ({}) });
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    await act(async () => { await result.current.checkout({ productId: 'prod_1' }); });
    expect(result.current.error).toBeTruthy();
    expect(result.current.error!.message).toContain('Checkout failed');
  });

  it('sets error when openAuthSessionAsync throws', async () => {
    mockFetchResponses(
      { ok: true, json: async () => ({ sessionId: 'cs_1', checkoutUrl: 'https://checkout.creem.io/cs_1', status: 'pending' }) },
    );
    mockOpenAuthSessionAsync.mockRejectedValue(new Error('Browser not available'));
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    await act(async () => { await result.current.checkout({ productId: 'prod_1' }); });
    expect(result.current.error).toBeTruthy();
    expect(result.current.error!.message).toContain('Browser not available');
  });

  it('returns unknown status when verify returns non-completed', async () => {
    mockFetchResponses(
      { ok: true, json: async () => ({ sessionId: 'cs_1', checkoutUrl: 'https://x.io/cs_1', status: 'pending' }) },
      { ok: true, json: async () => ({ sessionId: 'cs_1', status: 'pending' }) },
    );
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'creemexpo://checkout/success?session_id=cs_1' });
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    let checkoutResult: any;
    await act(async () => { checkoutResult = await result.current.checkout({ productId: 'prod_1' }); });
    expect(checkoutResult!.status).toBe('unknown');
  });

  it('loading is false after checkout completes', async () => {
    mockFetchResponses(
      { ok: true, json: async () => ({ sessionId: 'cs_1', checkoutUrl: 'https://x.io/cs_1', status: 'pending' }) },
    );
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    await act(async () => { await result.current.checkout({ productId: 'prod_1' }); });
    expect(result.current.loading).toBe(false);
  });

  it('passes custom successUrl to POST body', async () => {
    mockFetchResponses(
      { ok: true, json: async () => ({ sessionId: 'cs_1', checkoutUrl: 'https://x.io/cs_1', status: 'pending' }) },
    );
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
    const { result } = renderHook(() => useCreemCheckout(), { wrapper });
    await act(async () => { await result.current.checkout({ productId: 'prod_1', successUrl: 'custom://done' }); });
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.successUrl).toBe('custom://done');
  });
});
