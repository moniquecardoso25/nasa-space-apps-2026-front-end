import { useFonts } from 'expo-font';
import { DarkTheme, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConnectionStatus } from '@/components/ConnectionStatus';
import { getSessionRole, isDemoSession, subscribeSession, USE_MOCK_DATA } from '@/data/api';

import { fontAssets } from '@/theme/fonts';
import { C } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, primary: C.primary, border: C.border },
};

const ASTRONAUT_ROUTES = [
  '(tabs)',
  'calendar',
  'leaderboard',
  'dev/components',
  'logs/body/add',
  'logs/body/index',
  'logs/body/injury',
  'logs/exercise/add',
  'logs/exercise/index',
  'logs/meals/add',
  'logs/meals/index',
  'logs/mood/add',
  'logs/mood/index',
  'logs/orbi-fill',
  'logs/radiation/add',
  'logs/radiation/index',
  'logs/relax',
  'logs/sleep/add',
  'logs/sleep/index',
  'onboarding/1',
  'onboarding/2',
  'onboarding/3',
  'onboarding/4',
  'onboarding/5',
] as const;

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const pathname = usePathname();
  const role = useSyncExternalStore(subscribeSession, getSessionRole, () => null);
  // demo Crew IDs fall back to the bundled demo data (see signIn)
  const demo = useSyncExternalStore(subscribeSession, isDemoSession, () => false);
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={styles.root} />;

  // Web: phone-like frame. `?frame=390` (dev) pins the design base width for screenshots.
  const frameW =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? Number(new URLSearchParams(window.location.search).get('frame')) || 430
      : undefined;
  // The ground dashboard is a fluid web page (1440 wide), not a phone screen.
  const fluid = pathname.startsWith('/ground');

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          {/* On web the app keeps a phone-like width (design base 390). */}
          <View style={[styles.frame, fluid ? { maxWidth: '100%' } : frameW ? { maxWidth: frameW } : null]}>
            {role && pathname !== '/login' ? <ConnectionStatus /> : null}
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Protected guard={USE_MOCK_DATA || demo || role === 'astronaut'} redirectTo={role === 'ground' ? '/ground' : '/login'}>
                {ASTRONAUT_ROUTES.map((name) => <Stack.Screen key={name} name={name} />)}
              </Stack.Protected>
              <Stack.Protected guard={USE_MOCK_DATA || demo || role === 'ground'} redirectTo={role === 'astronaut' ? '/home' : '/login'}>
                <Stack.Screen name="ground" />
              </Stack.Protected>
            </Stack>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  frame: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: C.bg,
    ...(Platform.OS === 'web' ? { maxWidth: 430, overflow: 'hidden' as const } : null),
  },
});
