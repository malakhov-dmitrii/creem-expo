import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSubscription } from './useSubscription';
import type { SubscriptionStatus, SubscriptionData } from './types';

export interface SubscriptionGateProps {
  subscriptionId: string | null | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  renderPaywall?: (subscription: SubscriptionData | null) => React.ReactNode;
  loading?: React.ReactNode;
  /** Statuses that grant access. Default: ['active', 'trialing'] */
  allowedStatuses?: SubscriptionStatus[];
}

const DEFAULT_ALLOWED: SubscriptionStatus[] = ['active', 'trialing'];

export function SubscriptionGate({
  subscriptionId,
  children,
  fallback,
  renderPaywall,
  loading: loadingProp,
  allowedStatuses = DEFAULT_ALLOWED,
}: SubscriptionGateProps) {
  const { subscription, loading, error } = useSubscription(subscriptionId);

  if (loading) {
    return loadingProp ? (
      <>{loadingProp}</>
    ) : (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const hasAccess =
    subscription != null && allowedStatuses.includes(subscription.status);

  if (hasAccess) return <>{children}</>;

  if (renderPaywall) return <>{renderPaywall(subscription)}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <View style={styles.paywall}>
      <Text style={styles.title}>Subscribe to access</Text>
      <Text style={styles.subtitle}>
        {error ? error.message : 'A subscription is required to view this content.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  paywall: { padding: 24, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
});
