import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SubscriptionStatus } from './types';
import type { ViewStyle, TextStyle } from 'react-native';

export interface SubscriptionBadgeProps {
  status: SubscriptionStatus | null;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  trialing: '#3b82f6',
  paused: '#eab308',
  canceled: '#ef4444',
  scheduled_cancel: '#f97316',
  unpaid: '#ef4444',
  past_due: '#ef4444',
  expired: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  paused: 'Paused',
  canceled: 'Canceled',
  scheduled_cancel: 'Canceling',
  unpaid: 'Unpaid',
  past_due: 'Past Due',
  expired: 'Expired',
};

const SIZE_STYLES = {
  small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 },
  medium: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 },
  large: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 },
};

export function SubscriptionBadge({
  status,
  size = 'medium',
  style,
  textStyle,
}: SubscriptionBadgeProps) {
  if (!status) return null;

  const color = STATUS_COLORS[status] ?? '#6b7280';
  const label = STATUS_LABELS[status] ?? status;
  const sizeStyle = SIZE_STYLES[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + '20',
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color, fontSize: sizeStyle.fontSize },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontWeight: '600' },
});
