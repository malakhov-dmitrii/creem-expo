import { useState, useCallback } from 'react';
import { useCreemConfig } from './context';
import type { ProductData, PaginationData } from './types';

export function useCreemProducts() {
  const config = useCreemConfig();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (config.authToken) h['Authorization'] = `Bearer ${config.authToken}`;
    return h;
  }, [config.authToken]);

  const search = useCallback(
    async (pageNumber?: number, pageSize?: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (pageNumber != null) params.set('pageNumber', String(pageNumber));
        if (pageSize != null) params.set('pageSize', String(pageSize));
        const qs = params.toString();
        const url = `${config.apiUrl}/products${qs ? `?${qs}` : ''}`;
        const res = await fetch(url, { headers: getHeaders() });
        if (!res.ok) throw new Error(`Failed to search products: ${res.status}`);
        const data = await res.json();
        setProducts(data.items ?? []);
        setPagination(data.pagination ?? null);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [config.apiUrl, getHeaders],
  );

  const getProduct = useCallback(
    async (productId: string): Promise<ProductData | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${config.apiUrl}/products/${productId}`, {
          headers: getHeaders(),
        });
        if (!res.ok) throw new Error(`Failed to get product: ${res.status}`);
        return (await res.json()) as ProductData;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [config.apiUrl, getHeaders],
  );

  const loadMore = useCallback(async () => {
    if (!pagination?.nextPage) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${config.apiUrl}/products?pageNumber=${pagination.nextPage}`,
        { headers: getHeaders() },
      );
      if (!res.ok) throw new Error(`Failed to load more products: ${res.status}`);
      const data = await res.json();
      setProducts((prev) => [...prev, ...(data.items ?? [])]);
      setPagination(data.pagination ?? null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [config.apiUrl, getHeaders, pagination]);

  return { products, pagination, loading, error, search, getProduct, loadMore };
}
