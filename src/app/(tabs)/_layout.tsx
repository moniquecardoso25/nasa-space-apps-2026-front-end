import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { C } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="status" />
      <Tabs.Screen name="orbi" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="avatar" />
    </Tabs>
  );
}
