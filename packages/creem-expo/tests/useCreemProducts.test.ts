import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { CreemProvider } from '../src/CreemProvider';
import { useCreemProducts } from '../src/useCreemProducts';
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

const MOCK_PRODUCT = {
  id: 'prod_1', name: 'Pro Plan', description: 'Pro subscription',
  price: 2900, currency: 'USD', billingType: 'recurring', billingPeriod: 'every-month',
  status: 'active', createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
};
const MOCK_PRODUCT_2 = { ...MOCK_PRODUCT, id: 'prod_2', name: 'Enterprise' };

const MOCK_PAGINATION = { totalRecords: 2, totalPages: 2, currentPage: 1, nextPage: 2, prevPage: null };
const MOCK_PAGINATION_LAST = { totalRecords: 2, totalPages: 2, currentPage: 2, nextPage: null, prevPage: 1 };

describe('useCreemProducts', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('search fetches products with query params', async () => {
    mockOkFetch({ items: [MOCK_PRODUCT], pagination: MOCK_PAGINATION });
    const { result } = renderHook(() => useCreemProducts(), { wrapper });

    await act(async () => { await result.current.search(1, 10); });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/products?pageNumber=1&pageSize=10',
      expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': 'Bearer tok_test' }) }),
    );
  });

  it('search with no params does not add query string', async () => {
    mockOkFetch({ items: [MOCK_PRODUCT], pagination: MOCK_PAGINATION });
    const { result } = renderHook(() => useCreemProducts(), { wrapper });

    await act(async () => { await result.current.search(); });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/products',
      expect.anything(),
    );
  });

  it('sets products and pagination from response', async () => {
    mockOkFetch({ items: [MOCK_PRODUCT], pagination: MOCK_PAGINATION });
    const { result } = renderHook(() => useCreemProducts(), { wrapper });

    await act(async () => { await result.current.search(); });

    expect(result.current.products).toEqual([MOCK_PRODUCT]);
    expect(result.current.pagination).toEqual(MOCK_PAGINATION);
    expect(result.current.loading).toBe(false);
  });

  it('getProduct fetches single product', async () => {
    mockOkFetch(MOCK_PRODUCT);
    const { result } = renderHook(() => useCreemProducts(), { wrapper });

    let product: any;
    await act(async () => { product = await result.current.getProduct('prod_1'); });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/products/prod_1',
      expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': 'Bearer tok_test' }) }),
    );
    expect(product).toEqual(MOCK_PRODUCT);
  });

  it('loadMore appends products', async () => {
    // First page
    mockOkFetch({ items: [MOCK_PRODUCT], pagination: MOCK_PAGINATION });
    const { result } = renderHook(() => useCreemProducts(), { wrapper });
    await act(async () => { await result.current.search(); });
    expect(result.current.products).toHaveLength(1);

    // Second page
    mockOkFetch({ items: [MOCK_PRODUCT_2], pagination: MOCK_PAGINATION_LAST });
    await act(async () => { await result.current.loadMore(); });

    expect(result.current.products).toHaveLength(2);
    expect(result.current.products[1]).toEqual(MOCK_PRODUCT_2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      'http://localhost:3001/api/products?pageNumber=2',
      expect.anything(),
    );
  });

  it('loadMore does nothing if no nextPage', async () => {
    mockOkFetch({ items: [MOCK_PRODUCT], pagination: MOCK_PAGINATION_LAST });
    const { result } = renderHook(() => useCreemProducts(), { wrapper });
    await act(async () => { await result.current.search(); });

    const fetchCountBefore = mockFetch.mock.calls.length;
    await act(async () => { await result.current.loadMore(); });
    expect(mockFetch.mock.calls.length).toBe(fetchCountBefore);
  });

  it('sets error on failure', async () => {
    mockFailFetch(500);
    const { result } = renderHook(() => useCreemProducts(), { wrapper });

    await act(async () => { await result.current.search(); });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error!.message).toContain('Failed to search products');
    expect(result.current.products).toEqual([]);
  });

  it('wraps non-Error throws', async () => {
    mockFetch.mockRejectedValueOnce('network down');
    const { result } = renderHook(() => useCreemProducts(), { wrapper });

    await act(async () => { await result.current.search(); });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('network down');
  });
});
