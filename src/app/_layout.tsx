import { useFonts } from 'expo-font';
import { DarkTheme, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { fontAssets } from '@/theme/fonts';
import { C } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, primary: C.primary, border: C.border },
};

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const pathname = usePathname();
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
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
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
