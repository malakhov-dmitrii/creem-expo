import * as Linking from 'expo-linking';

export function buildSuccessUrl(scheme?: string): string {
  return Linking.createURL('checkout/success');
}

export function extractSessionId(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('session_id');
  } catch {
    return null;
  }
}
