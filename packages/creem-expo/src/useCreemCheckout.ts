import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useCreemConfig } from './context';
import { buildSuccessUrl, extractSessionId } from './deep-link';
import type { CheckoutRequest, CheckoutResult } from './types';

export function useCreemCheckout() {
  const config = useCreemConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkout = useCallback(async (request: CheckoutRequest): Promise<CheckoutResult | null> => {
    setLoading(true);
    setError(null);
    try {
      // Deep link URL for openAuthSessionAsync to intercept
      const deepLinkUrl = buildSuccessUrl(config.scheme);

      // Creem requires http(s):// successUrl.
      // If apiUrl is available, use server redirect endpoint that bounces to deep link.
      // Otherwise fall back to deep link directly (works in some environments).
      const baseUrl = config.apiUrl.replace(/\/api\/creem$/, '').replace(/\/api$/, '');
      const serverSuccessUrl = request.successUrl ??
        `${baseUrl}/checkout-redirect?scheme=${config.scheme ?? 'creemexpo'}`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;

      const res = await fetch(`${config.apiUrl}/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...request, successUrl: serverSuccessUrl }),
      });
      if (!res.ok) throw new Error(`Checkout failed: ${res.status}`);
      const data = await res.json();

      if (!data.checkoutUrl) {
        throw new Error('No checkout URL returned');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.checkoutUrl, deepLinkUrl);

      if (result.type === 'success' && result.url) {
        const sessionId = extractSessionId(result.url) ?? data.sessionId;
        const verifyRes = await fetch(`${config.apiUrl}/checkout/${sessionId}/verify`, {
          headers: config.authToken ? { 'Authorization': `Bearer ${config.authToken}` } : {},
        });
        const verifyData = await verifyRes.json();
        return { sessionId, status: verifyData.status === 'completed' ? 'completed' : 'unknown' };
      }

      return { sessionId: data.sessionId, status: 'canceled' };
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [config]);

  return { checkout, loading, error };
}
