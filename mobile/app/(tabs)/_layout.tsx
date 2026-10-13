import { Tabs } from 'expo-router';
import { Map, UserRound } from 'lucide-react-native';
import { THEME } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: THEME.light.primary }}>
      <Tabs.Screen name="index" options={{ title: 'Explore', tabBarIcon: ({ color, size }) => <Map color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
    </Tabs>
  );
}
