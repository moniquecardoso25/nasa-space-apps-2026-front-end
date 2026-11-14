import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { BoltMascot } from '@/components/bolt-mascot';
import { Button, Card, Field, Muted } from '@/components/cosmo-ui';
import { useCrewProfile } from '@/components/crew-profile-context';
import { useAuth } from '@/components/auth-context';
import { C } from '@/constants/cosmo';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setProfile } = useCrewProfile();
  const { signIn: authenticate, enterDemo: authenticateDemo } = useAuth();
  const [busy, setBusy] = useState(false);
  const bob = useSharedValue(0);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value * 8 }] }));
  const orbit = useSharedValue(0);
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value}deg` }] }));
  useEffect(() => {
    // Start visual loops on the client so the full-screen sign-in page renders immediately on web.
    bob.value = withRepeat(withSequence(withTiming(-1, { duration: 1250 }), withTiming(1, { duration: 1250 })), -1, true);
    orbit.value = withRepeat(withTiming(360, { duration: 50000 }), -1, false);
    return () => { cancelAnimation(bob); cancelAnimation(orbit); };
  }, [bob, orbit]);

  const signIn = async () => {
    if (!username.trim()) { setError('Enter your crew username.'); return; }
    if (!password.trim()) { setError('Enter your password to continue.'); return; }
    setBusy(true);
    setError('');
    try {
      const session = await authenticate(username, password);
      setProfile(null);
      router.replace(session.user.role === 'astronaut' ? '/onboarding' : '/care');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed. Check your credentials and API connection.');
    } finally { setBusy(false); }
  };
  const enterDemo = async () => {
    setBusy(true);
    setError('');
    try {
      await authenticateDemo();
      setProfile(null);
      router.replace('/home');
    } finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.spaceBackground} pointerEvents="none">
      <View style={[styles.star, { top: '13%', left: '12%' }]} /><View style={[styles.star, { top: '23%', right: '16%' }]} /><View style={[styles.star, { top: '48%', left: '8%' }]} /><View style={[styles.star, { top: '55%', right: '10%' }]} /><View style={[styles.star, { top: '73%', left: '21%' }]} />
      <View style={styles.planetGlow} /><View style={styles.planet}><View style={styles.planetLandOne} /><View style={styles.planetLandTwo} /></View><Animated.View style={[styles.orbitLine, orbitStyle]} />
      <View style={styles.horizon} />
    </View>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <View style={styles.mascotStage}><View style={styles.mascotScale}><Animated.View style={floatStyle}><BoltMascot /></Animated.View></View><View style={styles.mascotGlow} /></View>
          <View style={styles.brandCopy}><View style={styles.logoLine}><Text style={styles.logo}>COSMO<Text style={{ color: C.teal }}>MEDIC</Text></Text><Text style={styles.missionTag}>CREW HEALTH SYSTEM</Text></View><Text style={styles.subtitle}>Health monitoring for space missions</Text></View>
        </View>
        <Card style={styles.formCard}>
          <View style={styles.formHeading}><Text style={styles.welcome}>Welcome aboard</Text><Muted>Sign in to continue your mission.</Muted></View>
          <Field label="Username" value={username} onChangeText={(value) => { setUsername(value); setError(''); }} placeholder="astronaut4" autoCapitalize="none" />
          <Field label="Password" value={password} onChangeText={(value) => { setPassword(value); setError(''); }} placeholder="Enter your password" secureTextEntry autoCapitalize="none" />
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <Button title={busy ? 'Connecting…' : 'Sign in'} onPress={signIn} disabled={busy} style={styles.signInButton} />
          <View style={styles.separator}><View style={styles.separatorLine} /><Text style={styles.separatorText}>OR</Text><View style={styles.separatorLine} /></View>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} onPress={enterDemo} style={({ pressed }) => [styles.demoButton, pressed && { opacity: 0.75 }, busy && { opacity: 0.55 }]}><Text style={styles.demoGlyph}>▷</Text><Text style={styles.demoText}>Enter demo</Text></Pressable>
          <Text style={styles.demoHint}>Demo account: astronaut4 / spaceapps2026. If the API is offline, the app opens with local sample data.</Text>
        </Card>
        <Text style={styles.footer}>NASA SPACE APPS CHALLENGE · 2026</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background }, scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 20 }, content: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 20 },
  spaceBackground: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: C.background }, star: { position: 'absolute', width: 4, height: 4, borderRadius: 4, backgroundColor: C.text, opacity: 0.7, shadowColor: C.teal, shadowOpacity: 0.8, shadowRadius: 7 },
  planetGlow: { position: 'absolute', bottom: -220, right: -180, width: 650, height: 420, borderRadius: 360, backgroundColor: 'rgba(57,255,159,0.08)', shadowColor: C.teal, shadowOpacity: 0.8, shadowRadius: 80 }, planet: { position: 'absolute', bottom: -285, right: -145, width: 600, height: 400, borderRadius: 330, backgroundColor: '#205BC2', borderTopWidth: 8, borderColor: '#57AEEB', overflow: 'hidden' }, planetLandOne: { position: 'absolute', top: 56, left: 90, width: 220, height: 95, borderRadius: 120, backgroundColor: '#31A984', transform: [{ rotate: '-18deg' }] }, planetLandTwo: { position: 'absolute', top: 127, right: 48, width: 195, height: 74, borderRadius: 100, backgroundColor: '#45B38B', transform: [{ rotate: '16deg' }] }, orbitLine: { position: 'absolute', right: '4%', bottom: '5%', width: 630, height: 630, borderRadius: 330, borderWidth: 1, borderColor: 'rgba(139,124,255,0.28)' }, horizon: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: C.teal, opacity: 0.72 },
  brandBlock: { alignItems: 'center', gap: 0 }, mascotStage: { width: 130, height: 154, alignItems: 'center', justifyContent: 'center' }, mascotScale: { transform: [{ scale: 0.82 }] }, mascotGlow: { position: 'absolute', bottom: 2, width: 110, height: 18, borderRadius: 50, backgroundColor: 'rgba(139,124,255,0.24)', shadowColor: C.purple, shadowOpacity: 0.8, shadowRadius: 16 }, brandCopy: { alignItems: 'center', gap: 6 }, logoLine: { alignItems: 'center', gap: 4 }, logo: { color: C.text, fontSize: 31, fontWeight: '900', letterSpacing: 2 }, missionTag: { color: C.teal, fontSize: 8, letterSpacing: 2.4, fontWeight: '800' }, subtitle: { color: C.muted, textAlign: 'center', fontSize: 14 },
  formCard: { padding: 24, borderRadius: 24, backgroundColor: 'rgba(27,25,72,0.95)', gap: 15 }, formHeading: { gap: 4, marginBottom: 2 }, welcome: { color: C.text, fontSize: 22, fontWeight: '900' }, error: { color: C.pink, fontSize: 12, fontWeight: '700' }, signInButton: { marginTop: 3, minHeight: 54 }, separator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 1 }, separatorLine: { height: 1, flex: 1, backgroundColor: C.border }, separatorText: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, demoButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 16, borderWidth: 1, borderColor: C.teal, backgroundColor: '#102E3A' }, demoGlyph: { color: C.teal, fontSize: 18 }, demoText: { color: C.text, fontSize: 15, fontWeight: '800' }, demoHint: { color: C.muted, textAlign: 'center', fontSize: 11, lineHeight: 16 }, footer: { color: C.muted, textAlign: 'center', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
});
