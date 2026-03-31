import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { CreemProvider } from '../src/CreemProvider';
import { useCreemCustomerPortal } from '../src/useCreemCustomerPortal';
import type { CreemConfig } from '../src/types';

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

describe('useCreemCustomerPortal', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('generatePortalLink sends correct POST and sets portalUrl', async () => {
    mockOkFetch({ portalUrl: 'https://portal.creem.io/abc' });
    const { result } = renderHook(() => useCreemCustomerPortal(), { wrapper });

    let url: string | null;
    await act(async () => { url = await result.current.generatePortalLink('cust_1'); });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/portal',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ customerId: 'cust_1' }),
      }),
    );
    expect(result.current.portalUrl).toBe('https://portal.creem.io/abc');
    expect(result.current.loading).toBe(false);
  });

  it('generatePortalLink handles customerPortalLink field too', async () => {
    mockOkFetch({ customerPortalLink: 'https://portal.creem.io/xyz' });
    const { result } = renderHook(() => useCreemCustomerPortal(), { wrapper });

    await act(async () => { await result.current.generatePortalLink('cust_1'); });

    expect(result.current.portalUrl).toBe('https://portal.creem.io/xyz');
  });

  it('openPortal calls generatePortalLink then WebBrowser.openBrowserAsync', async () => {
    mockOkFetch({ portalUrl: 'https://portal.creem.io/abc' });
    (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValueOnce({ type: 'dismiss' });
    const { result } = renderHook(() => useCreemCustomerPortal(), { wrapper });

    await act(async () => { await result.current.openPortal('cust_1'); });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/portal',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://portal.creem.io/abc');
  });

  it('openPortal does not call WebBrowser if link generation fails', async () => {
    mockFailFetch(500);
    const { result } = renderHook(() => useCreemCustomerPortal(), { wrapper });

    await act(async () => { await result.current.openPortal('cust_1'); });

    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('sets error on failure', async () => {
    mockFailFetch(403);
    const { result } = renderHook(() => useCreemCustomerPortal(), { wrapper });

    await act(async () => { await result.current.generatePortalLink('cust_1'); });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error!.message).toContain('Failed to generate portal link');
    expect(result.current.portalUrl).toBeNull();
  });

  it('includes auth header when authToken set', async () => {
    mockOkFetch({ portalUrl: 'https://portal.creem.io/abc' });
    const { result } = renderHook(() => useCreemCustomerPortal(), { wrapper });

    await act(async () => { await result.current.generatePortalLink('cust_1'); });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer tok_test' }),
      }),
    );
  });
});
