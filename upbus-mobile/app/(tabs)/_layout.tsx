import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0a0a14', borderTopColor: '#1e1e3a' },
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 13 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'แผนที่', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text> }}
      />
      <Tabs.Screen
        name="routes"
        options={{ title: 'เส้นทาง', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🚏</Text> }}
      />
      <Tabs.Screen
        name="sustainability"
        options={{ title: 'สิ่งแวดล้อม', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🌱</Text> }}
      />
      <Tabs.Screen
        name="complaints"
        options={{ title: 'ร้องเรียน', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📝</Text> }}
      />
    </Tabs>
  );
}
