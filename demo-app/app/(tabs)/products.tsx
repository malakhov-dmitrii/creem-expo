import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const PRODUCTS = [
  { id: 'prod_2U8uqiBvIw7tRkwwG2flRw', name: 'Starter', price: '$9/mo', description: 'Perfect for side projects and MVPs' },
  { id: 'prod_1CqUBve5mBwFXcE9i02GJw', name: 'Pro', price: '$29/mo', description: 'For growing teams and businesses' },
  { id: 'prod_4GCQZSu3BSZMaXSkzE8hD4', name: 'Enterprise', price: '$99/mo', description: 'For scaling teams with advanced needs' },
];

export default function ProductsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Plan</Text>
      <FlatList
        data={PRODUCTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: '/checkout', params: { productId: item.id, name: item.name } })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>{item.price}</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  name: { fontSize: 18, fontWeight: '600', color: '#111827' },
  price: { fontSize: 20, fontWeight: 'bold', color: '#6366f1', marginTop: 4 },
  desc: { fontSize: 14, color: '#6b7280', marginTop: 4 },
});
