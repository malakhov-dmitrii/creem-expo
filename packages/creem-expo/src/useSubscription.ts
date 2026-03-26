import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useCreemConfig } from './context';
import type { SubscriptionData, CancelOptions, UpgradeOptions } from './types';

export function useSubscription(subscriptionId: string | null | undefined) {
  const config = useCreemConfig();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (config.authToken) h['Authorization'] = `Bearer ${config.authToken}`;
    return h;
  }, [config.authToken]);

  const fetchSubscription = useCallback(async () => {
    if (!subscriptionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${config.apiUrl}/subscription/${subscriptionId}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch subscription: ${res.status}`);
      const data = await res.json();
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [subscriptionId, config.apiUrl, getHeaders]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchSubscription();
    });
    return () => sub.remove();
  }, [fetchSubscription]);

  const postAction = useCallback(
    async (action: string, body?: object) => {
      if (!subscriptionId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${config.apiUrl}/subscription/${subscriptionId}/${action}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getHeaders() },
            body: body ? JSON.stringify(body) : undefined,
          },
        );
        if (!res.ok) throw new Error(`Failed to ${action} subscription: ${res.status}`);
        const data = await res.json();
        setSubscription(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    },
    [subscriptionId, config.apiUrl, getHeaders],
  );

  const cancel = useCallback(
    (opts?: CancelOptions) => postAction('cancel', opts),
    [postAction],
  );
  const upgrade = useCallback(
    (opts: UpgradeOptions) => postAction('upgrade', opts),
    [postAction],
  );
  const pause = useCallback(() => postAction('pause'), [postAction]);
  const resume = useCallback(() => postAction('resume'), [postAction]);

  return { subscription, loading, error, cancel, upgrade, pause, resume, refetch: fetchSubscription };
}
