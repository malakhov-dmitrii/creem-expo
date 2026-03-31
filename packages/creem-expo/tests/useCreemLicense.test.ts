import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { CreemProvider } from '../src/CreemProvider';
import { useCreemLicense } from '../src/useCreemLicense';
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

const MOCK_LICENSE = {
  id: 'lic_1',
  status: 'active',
  key: 'ABCD-1234',
  activation: 1,
  activationLimit: 3,
  expiresAt: null,
  createdAt: '2026-03-01T00:00:00Z',
  instance: { id: 'inst_1', name: 'my-laptop', status: 'active', createdAt: '2026-03-01T00:00:00Z' },
};

describe('useCreemLicense', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('initial state: license=null, loading=false, error=null', () => {
    const { result } = renderHook(() => useCreemLicense(), { wrapper });
    expect(result.current.license).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('activate sends correct POST with body and sets license on success', async () => {
    mockOkFetch(MOCK_LICENSE);
    const { result } = renderHook(() => useCreemLicense(), { wrapper });

    await act(async () => {
      await result.current.activate({ key: 'ABCD-1234', instanceName: 'my-laptop' });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/license/activate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'ABCD-1234', instanceName: 'my-laptop' }),
      }),
    );
    expect(result.current.license).toEqual(MOCK_LICENSE);
    expect(result.current.loading).toBe(false);
  });

  it('validate sends correct POST with body', async () => {
    mockOkFetch(MOCK_LICENSE);
    const { result } = renderHook(() => useCreemLicense(), { wrapper });

    await act(async () => {
      await result.current.validate({ key: 'ABCD-1234', instanceId: 'inst_1' });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/license/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'ABCD-1234', instanceId: 'inst_1' }),
      }),
    );
    expect(result.current.license).toEqual(MOCK_LICENSE);
  });

  it('deactivate sends correct POST with body', async () => {
    mockOkFetch(MOCK_LICENSE);
    const { result } = renderHook(() => useCreemLicense(), { wrapper });

    await act(async () => {
      await result.current.deactivate({ key: 'ABCD-1234', instanceId: 'inst_1' });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/license/deactivate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'ABCD-1234', instanceId: 'inst_1' }),
      }),
    );
    expect(result.current.license).toEqual(MOCK_LICENSE);
  });

  it('sets error on failed response', async () => {
    mockFailFetch(403);
    const { result } = renderHook(() => useCreemLicense(), { wrapper });

    await act(async () => {
      await result.current.activate({ key: 'ABCD-1234', instanceName: 'my-laptop' });
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error!.message).toContain('Failed to activate license');
    expect(result.current.license).toBeNull();
  });

  it('wraps non-Error throws', async () => {
    mockFetch.mockRejectedValueOnce('network down');
    const { result } = renderHook(() => useCreemLicense(), { wrapper });

    await act(async () => {
      await result.current.activate({ key: 'ABCD-1234', instanceName: 'my-laptop' });
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('network down');
  });

  it('includes auth header when authToken set', async () => {
    mockOkFetch(MOCK_LICENSE);
    const { result } = renderHook(() => useCreemLicense(), { wrapper });

    await act(async () => {
      await result.current.activate({ key: 'ABCD-1234', instanceName: 'my-laptop' });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer tok_test' }),
      }),
    );
  });
});
