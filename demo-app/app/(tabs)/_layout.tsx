import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6366f1' }}>
      <Tabs.Screen name="products" options={{
        title: 'Products',
        tabBarIcon: ({ color, size }) => <Ionicons name="pricetags" size={size} color={color} />,
      }} />
      <Tabs.Screen name="checkout" options={{
        title: 'Checkout',
        tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
      }} />
      <Tabs.Screen name="account" options={{
        title: 'Account',
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
