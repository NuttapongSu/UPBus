// upbus-mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#5c2d91' }}>
      <Tabs.Screen name="index"
        options={{ title: 'แผนที่', headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} /> }} />
      <Tabs.Screen name="routes"
        options={{ title: 'สายรถ',
          tabBarIcon: ({ color, size }) => <Ionicons name="bus" size={size} color={color} /> }} />
      <Tabs.Screen name="alerts"
        options={{ title: 'แจ้งเตือน',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} /> }} />
    </Tabs>
  );
}
