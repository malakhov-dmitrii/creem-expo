import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useCreemCheckout } from '../../../packages/creem-expo/src/index';

export default function CheckoutScreen() {
  const { productId, name } = useLocalSearchParams<{ productId?: string; name?: string }>();
  const { checkout, loading, error } = useCreemCheckout();

  const handleCheckout = async () => {
    if (!productId) return;
    const result = await checkout({ productId });
    if (result?.status === 'completed') {
      alert('Payment successful!');
    } else if (result?.status === 'canceled') {
      alert('Payment canceled');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      {productId ? (
        <>
          <Text style={styles.product}>Product: {name ?? productId}</Text>
          <Pressable style={styles.button} onPress={handleCheckout} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Buy Now</Text>}
          </Pressable>
          {error && <Text style={styles.error}>{error.message}</Text>}
        </>
      ) : (
        <Text style={styles.hint}>Select a product from the Products tab</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#111827' },
  product: { fontSize: 16, color: '#374151', marginBottom: 16 },
  button: { backgroundColor: '#6366f1', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10, minWidth: 160, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  error: { color: '#ef4444', marginTop: 12, textAlign: 'center' },
});
