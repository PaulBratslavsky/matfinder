import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { THEME } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: THEME.light.primary, tabBarInactiveTintColor: THEME.light.mutedForeground }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Explore', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'map' : 'map-outline'} color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
