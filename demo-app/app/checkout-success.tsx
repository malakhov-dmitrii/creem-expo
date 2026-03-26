import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function CheckoutSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>Payment Successful!</Text>
      {session_id && <Text style={styles.session}>Session: {session_id}</Text>}
      <Pressable style={styles.button} onPress={() => router.replace('/(tabs)/account')}>
        <Text style={styles.buttonText}>View Subscription</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#f9fafb' },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  session: { fontSize: 12, color: '#9ca3af', marginBottom: 24 },
  button: { backgroundColor: '#6366f1', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
