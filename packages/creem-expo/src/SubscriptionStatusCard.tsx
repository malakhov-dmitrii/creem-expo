import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SubscriptionData } from './types';

export interface SubscriptionStatusCardProps {
  subscription: SubscriptionData | null;
  loading?: boolean;
  error?: Error | null;
  renderActive?: (sub: SubscriptionData) => React.ReactNode;
  renderInactive?: (sub: SubscriptionData) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: Error) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
}

export function SubscriptionStatusCard({
  subscription,
  loading,
  error,
  renderActive,
  renderInactive,
  renderLoading,
  renderError,
  renderEmpty,
}: SubscriptionStatusCardProps) {
  if (loading) {
    return renderLoading ? (
      <>{renderLoading()}</>
    ) : (
      <View style={styles.container}>
        <Text style={styles.text}>Loading subscription...</Text>
      </View>
    );
  }

  if (error) {
    return renderError ? (
      <>{renderError(error)}</>
    ) : (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    );
  }

  if (!subscription) {
    return renderEmpty ? (
      <>{renderEmpty()}</>
    ) : (
      <View style={styles.container}>
        <Text style={styles.text}>No subscription</Text>
      </View>
    );
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  if (isActive) {
    return renderActive ? (
      <>{renderActive(subscription)}</>
    ) : (
      <View style={styles.container}>
        <Text style={styles.activeText}>
          {subscription.status === 'trialing' ? 'Trial' : 'Active'}
        </Text>
        {subscription.currentPeriodEndDate && (
          <Text style={styles.text}>
            Renews {new Date(subscription.currentPeriodEndDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  }

  return renderInactive ? (
    <>{renderInactive(subscription)}</>
  ) : (
    <View style={styles.container}>
      <Text style={styles.inactiveText}>{subscription.status}</Text>
      {subscription.canceledAt && (
        <Text style={styles.text}>
          Canceled {new Date(subscription.canceledAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5' },
  text: { fontSize: 14, color: '#666' },
  activeText: { fontSize: 16, fontWeight: '600', color: '#22c55e' },
  inactiveText: { fontSize: 16, fontWeight: '600', color: '#ef4444' },
  errorText: { fontSize: 14, color: '#ef4444' },
});
