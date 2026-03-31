import { useState, useCallback } from 'react';
import { useCreemConfig } from './context';
import type {
  LicenseData,
  ActivateLicenseRequest,
  ValidateLicenseRequest,
  DeactivateLicenseRequest,
} from './types';

export function useCreemLicense() {
  const config = useCreemConfig();
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.authToken) h['Authorization'] = `Bearer ${config.authToken}`;
    return h;
  }, [config.authToken]);

  const postAction = useCallback(
    async (action: string, body: object) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${config.apiUrl}/license/${action}`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Failed to ${action} license: ${res.status}`);
        const data = await res.json();
        setLicense(data);
        return data as LicenseData;
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

  const activate = useCallback(
    (req: ActivateLicenseRequest) => postAction('activate', req),
    [postAction],
  );
  const validate = useCallback(
    (req: ValidateLicenseRequest) => postAction('validate', req),
    [postAction],
  );
  const deactivate = useCallback(
    (req: DeactivateLicenseRequest) => postAction('deactivate', req),
    [postAction],
  );

  return { license, loading, error, activate, validate, deactivate };
}
