import { Stack } from 'expo-router';
import { CreemProvider } from '../../packages/creem-expo/src/index';

// Use your Mac's local IP so the phone can reach the server
const API_URL = 'http://192.168.1.95:3001/api/creem';

export default function RootLayout() {
  return (
    <CreemProvider config={{ apiUrl: API_URL, scheme: 'creemexpo' }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="checkout-success" options={{ title: 'Purchase Complete' }} />
      </Stack>
    </CreemProvider>
  );
}
