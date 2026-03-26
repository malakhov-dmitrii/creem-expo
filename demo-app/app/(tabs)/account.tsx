import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useSubscription } from '../../../packages/creem-expo/src/index';

// Start with null — no subscription until a checkout completes.
// In a real app, you'd get the subscription ID from your backend after checkout.
const DEMO_SUB_ID: string | null = null;

export default function AccountScreen() {
  const { subscription, loading, error, cancel, pause, resume, refetch } = useSubscription(DEMO_SUB_ID);

  if (loading && !subscription) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Subscription</Text>

      {error && <Text style={styles.error}>{error.message}</Text>}

      {subscription ? (
        <View style={styles.card}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.status, { color: subscription.status === 'active' ? '#10b981' : '#f59e0b' }]}>
            {subscription.status}
          </Text>

          <Text style={styles.label}>Product</Text>
          <Text style={styles.value}>{subscription.productId}</Text>

          {subscription.currentPeriodEndDate && (
            <>
              <Text style={styles.label}>Renews</Text>
              <Text style={styles.value}>{new Date(subscription.currentPeriodEndDate).toLocaleDateString()}</Text>
            </>
          )}

          <View style={styles.actions}>
            {subscription.status === 'active' && (
              <>
                <Pressable style={[styles.btn, styles.btnWarn]} onPress={() => cancel({ mode: 'scheduled' })}>
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => pause()}>
                  <Text style={styles.btnText}>Pause</Text>
                </Pressable>
              </>
            )}
            {subscription.status === 'paused' && (
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => resume()}>
                <Text style={styles.btnText}>Resume</Text>
              </Pressable>
            )}
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => refetch()}>
              <Text style={[styles.btnText, { color: '#6b7280' }]}>Refresh</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.hint}>No active subscription. Purchase a plan first.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  label: { fontSize: 12, color: '#9ca3af', marginTop: 12, textTransform: 'uppercase' },
  status: { fontSize: 18, fontWeight: '600' },
  value: { fontSize: 16, color: '#374151' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#6366f1' },
  btnWarn: { backgroundColor: '#ef4444' },
  btnSecondary: { backgroundColor: '#f59e0b' },
  btnGhost: { backgroundColor: '#f3f4f6' },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#ef4444', marginBottom: 12 },
  hint: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 },
});
