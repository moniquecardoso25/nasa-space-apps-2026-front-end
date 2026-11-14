import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavigation } from '@/components/app-navigation';
import { ResponsiveLayoutContext, useHydrated } from '@/components/responsive-layout';
import { VoiceNavigator } from '@/components/voice-navigator';
import { C } from '@/constants/cosmo';

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const hydrated = useHydrated();
  const desktop = hydrated && width >= 900;

  return <ResponsiveLayoutContext.Provider value={desktop}><View style={{ flex: 1, flexDirection: desktop ? 'row' : 'column', backgroundColor: C.background }}>
    <StatusBar style="light" />
    <AppNavigation desktop={desktop} />
    <View style={{ flex: 1, minWidth: 0, backgroundColor: C.background }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }} />
    </View>
    <VoiceNavigator bottomOffset={desktop ? 24 : 86 + insets.bottom} />
  </View></ResponsiveLayoutContext.Provider>;
}
