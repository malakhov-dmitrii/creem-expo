import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useCreemConfig } from './context';

export function useCreemCustomerPortal() {
  const config = useCreemConfig();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.authToken) h['Authorization'] = `Bearer ${config.authToken}`;
    return h;
  }, [config.authToken]);

  const generatePortalLink = useCallback(
    async (customerId: string): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${config.apiUrl}/customer/portal`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ customerId }),
        });
        if (!res.ok) throw new Error(`Failed to generate portal link: ${res.status}`);
        const data = await res.json();
        const url = data.portalUrl ?? data.customerPortalLink;
        setPortalUrl(url);
        return url;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [config.apiUrl, getHeaders],
  );

  const openPortal = useCallback(
    async (customerId: string) => {
      const url = await generatePortalLink(customerId);
      if (url) {
        await WebBrowser.openBrowserAsync(url);
      }
    },
    [generatePortalLink],
  );

  return { portalUrl, loading, error, generatePortalLink, openPortal };
}
