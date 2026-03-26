import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useCreemConfig } from './context';

// Lazy-load react-native-webview to avoid TurboModule errors in Expo Go
// when this component is imported but not rendered
let WebView: any = null;
function getWebView() {
  if (!WebView) {
    WebView = require('react-native-webview').WebView;
  }
  return WebView;
}

type WebViewNavigation = { url: string };

interface CreemCheckoutSheetProps {
  visible: boolean;
  productId: string;
  successUrl?: string;
  cancelUrl?: string;
  onSuccess?: (session: { sessionId: string }) => void;
  onCancel?: () => void;
  onError?: (error: { code: string; message: string }) => void;
  onLoading?: (loading: boolean) => void;
  timeout?: number; // ms, default 60000
}

export function CreemCheckoutSheet({
  visible, productId, successUrl, cancelUrl,
  onSuccess, onCancel, onError, onLoading, timeout = 60000,
}: CreemCheckoutSheetProps) {
  const config = useCreemConfig();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveSuccessUrl = successUrl ?? `${config.scheme ?? 'creemexpo'}://checkout/success`;
  const effectiveCancelUrl = cancelUrl ?? `${config.scheme ?? 'creemexpo'}://checkout/cancel`;

  useEffect(() => {
    if (!visible || !productId) return;
    let cancelled = false;
    setLoading(true);
    onLoading?.(true);

    (async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;

        const res = await fetch(`${config.apiUrl}/checkout`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ productId, successUrl: effectiveSuccessUrl }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        if (!data.checkoutUrl) {
          onError?.({ code: 'NO_URL', message: 'No checkout URL returned' });
          return;
        }
        setSessionId(data.sessionId);
        setCheckoutUrl(data.checkoutUrl);
      } catch (err) {
        if (!cancelled) onError?.({ code: 'NETWORK', message: String(err) });
      } finally {
        if (!cancelled) { setLoading(false); onLoading?.(false); }
      }
    })();

    timeoutRef.current = setTimeout(() => {
      if (!cancelled) onError?.({ code: 'TIMEOUT', message: `Checkout timed out after ${timeout}ms` });
    }, timeout);

    return () => { cancelled = true; if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [visible, productId]);

  const handleNavigationChange = (navState: WebViewNavigation) => {
    const { url } = navState;
    if (url.startsWith(effectiveSuccessUrl)) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onSuccess?.({ sessionId: sessionId ?? '' });
    } else if (url.startsWith(effectiveCancelUrl)) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onCancel?.();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        {loading && <ActivityIndicator size="large" style={styles.loader} />}
        {checkoutUrl && (() => {
          const WV = getWebView();
          return WV ? (
            <WV
              source={{ uri: checkoutUrl }}
              onNavigationStateChange={handleNavigationChange}
              onError={() => onError?.({ code: 'WEBVIEW_ERROR', message: 'WebView failed to load' })}
              style={styles.webview}
              startInLoadingState
              renderLoading={() => <ActivityIndicator size="large" style={styles.loader} />}
            />
          ) : (
            <Text style={styles.closeText}>WebView not available. Install react-native-webview.</Text>
          );
        })()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  closeButton: { padding: 8 },
  closeText: { fontSize: 16, color: '#007AFF' },
  webview: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
