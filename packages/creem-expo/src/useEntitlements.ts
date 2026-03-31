import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useCreemConfig } from './context';
import type { EntitlementData, EntitlementOptions, SubscriptionData } from './types';

// Lazy-load AsyncStorage (optional peer dep) — same pattern as CreemCheckoutSheet's WebView
let _AsyncStorage: any = null;
function getAsyncStorage(): any | null {
  if (_AsyncStorage) return _AsyncStorage;
  try {
    _AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return _AsyncStorage;
  } catch {
    return null;
  }
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_PREFIX = '@creem_entitlement_';

function toEntitlement(sub: SubscriptionData): EntitlementData {
  return {
    subscriptionId: sub.id,
    status: sub.status,
    productId: sub.productId,
    expiresAt: sub.currentPeriodEndDate ?? null,
    cachedAt: Date.now(),
  };
}

export function useEntitlements(
  subscriptionId: string | null | undefined,
  options?: EntitlementOptions,
) {
  const config = useCreemConfig();
  const [entitlement, setEntitlement] = useState<EntitlementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const ttl = options?.ttl ?? DEFAULT_TTL;
  const prefix = options?.storageKeyPrefix ?? DEFAULT_PREFIX;
  const cacheKey = subscriptionId ? `${prefix}${subscriptionId}` : null;

  const getHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (config.authToken) h['Authorization'] = `Bearer ${config.authToken}`;
    return h;
  }, [config.authToken]);

  const loadFromCache = useCallback(async (): Promise<EntitlementData | null> => {
    if (!cacheKey) return null;
    const storage = getAsyncStorage();
    if (!storage) return null;
    try {
      const raw = await storage.getItem(cacheKey);
      if (!raw) return null;
      const data: EntitlementData = JSON.parse(raw);
      if (Date.now() - data.cachedAt < ttl) return data;
      return null; // stale
    } catch {
      return null;
    }
  }, [cacheKey, ttl]);

  const saveToCache = useCallback(
    async (data: EntitlementData) => {
      if (!cacheKey) return;
      const storage = getAsyncStorage();
      if (!storage) return;
      try {
        await storage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        // non-critical
      }
    },
    [cacheKey],
  );

  const fetchFromServer = useCallback(async (): Promise<EntitlementData | null> => {
    if (!subscriptionId) return null;
    try {
      const res = await fetch(`${config.apiUrl}/subscription/${subscriptionId}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch subscription: ${res.status}`);
      const sub: SubscriptionData = await res.json();
      const ent = toEntitlement(sub);
      await saveToCache(ent);
      return ent;
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }, [subscriptionId, config.apiUrl, getHeaders, saveToCache]);

  const refresh = useCallback(async () => {
    if (!subscriptionId) return;
    setLoading(true);
    setError(null);
    try {
      const ent = await fetchFromServer();
      if (mountedRef.current && ent) setEntitlement(ent);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [subscriptionId, fetchFromServer]);

  // Initial load: cache first, then server
  useEffect(() => {
    if (!subscriptionId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cached = await loadFromCache();
        if (cached && !cancelled) {
          setEntitlement(cached);
          setLoading(false);
          return;
        }
        const fresh = await fetchFromServer();
        if (!cancelled && fresh) setEntitlement(fresh);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [subscriptionId, loadFromCache, fetchFromServer]);

  // Revalidate on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const isActive = entitlement?.status === 'active' || entitlement?.status === 'trialing';

  return { entitlement, isActive, loading, error, refresh };
}
