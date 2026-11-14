import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavigation } from '@/components/app-navigation';
import { AuthProvider } from '@/components/auth-context';
import { CrewProfileProvider } from '@/components/crew-profile-context';
import { ResponsiveLayoutContext, useHydrated } from '@/components/responsive-layout';
import { VoiceNavigator } from '@/components/voice-navigator';
import { C } from '@/constants/cosmo';

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const hydrated = useHydrated();
  const desktop = hydrated && width >= 900;
  const hideNavigation = pathname === '/' || pathname === '/login' || pathname === '/onboarding';
  const showSideNavigation = desktop && !hideNavigation;

  return <ResponsiveLayoutContext.Provider value={desktop}><AuthProvider><CrewProfileProvider><View style={{ flex: 1, flexDirection: showSideNavigation ? 'row' : 'column', backgroundColor: C.background }}>
    <StatusBar style="light" />
    {!hideNavigation ? <AppNavigation desktop={desktop} /> : null}
    <View style={{ flex: 1, minWidth: 0, backgroundColor: C.background }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }} />
    </View>
    {!hideNavigation ? <VoiceNavigator bottomOffset={desktop ? 24 : 86 + insets.bottom} /> : null}
  </View></CrewProfileProvider></AuthProvider></ResponsiveLayoutContext.Provider>;
}
