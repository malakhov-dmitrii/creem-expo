import React, { useCallback, useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useCreemCheckout } from './useCreemCheckout';
import type { CheckoutResult } from './types';
import type { ViewStyle, TextStyle } from 'react-native';

export interface CreemCheckoutButtonProps {
  productId: string;
  successUrl?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  title?: string;
  loadingTitle?: string;
  onSuccess?: (result: CheckoutResult) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const VARIANT_STYLES = {
  primary: { bg: '#6366f1', text: '#ffffff', border: '#6366f1' },
  secondary: { bg: '#f1f5f9', text: '#334155', border: '#f1f5f9' },
  outline: { bg: 'transparent', text: '#6366f1', border: '#6366f1' },
};

const SIZE_STYLES = {
  small: { paddingH: 12, paddingV: 8, fontSize: 14 },
  medium: { paddingH: 16, paddingV: 12, fontSize: 16 },
  large: { paddingH: 24, paddingV: 16, fontSize: 18 },
};

export function CreemCheckoutButton({
  productId,
  successUrl,
  variant = 'primary',
  size = 'medium',
  title = 'Subscribe',
  loadingTitle = 'Opening checkout...',
  onSuccess,
  onError,
  disabled,
  style,
  textStyle,
}: CreemCheckoutButtonProps) {
  const { checkout, loading: hookLoading, error: hookError } = useCreemCheckout();
  const [busy, setBusy] = useState(false);

  const isLoading = hookLoading || busy;

  const handlePress = useCallback(async () => {
    if (isLoading || disabled) return;
    setBusy(true);
    try {
      const result = await checkout({ productId, successUrl });
      if (result && onSuccess) onSuccess(result);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (onError) onError(e);
    } finally {
      setBusy(false);
    }
  }, [productId, successUrl, checkout, isLoading, disabled, onSuccess, onError]);

  if (hookError && onError) onError(hookError);

  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading || disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isLoading || disabled }}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color={v.text} style={styles.spinner} />
          <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }, textStyle]}>
            {loadingTitle}
          </Text>
        </>
      ) : (
        <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  text: { fontWeight: '600' },
  spinner: { marginRight: 8 },
});
