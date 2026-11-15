import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { Field } from '@/components/Inputs';
import { LOGIN_STARS, LoginEarth, LogoMark, Stars } from '@/components/Space';
import { Txt } from '@/components/Txt';
import { getAstronaut, signIn } from '@/data/api';
import { session } from '@/data/session';
import { signInLive } from '@/data/sync';
import { C, X, tokens } from '@/theme/tokens';

/** Login · Crew ID + PIN, checked by the backend (demo PIN 2026). Mock mode: any 4-digit PIN for a known Crew ID. */
export default function Login() {
  const insets = useSafeAreaInsets();
  const [crewId, setCrewId] = useState('ORB3-ANA');
  const [pin, setPin] = useState('2026');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Backend first. With no server (or EXPO_PUBLIC_API_URL=mock) the app runs on the demo data.
      const live = await signInLive(crewId, pin);
      if (live.ok && live.role === 'ground') {
        router.replace('/ground');
        return;
      }
      if (!live.ok && live.reason === 'credentials') {
        setError('Unknown Crew ID or PIN. Use your Crew ID (e.g. ORB3-ANA) and your 4-digit PIN.');
        return;
      }
      const a = live.ok ? getAstronaut() : signIn(crewId, pin);
      if (!a) {
        setError('Unknown Crew ID or PIN. Use your Crew ID (e.g. ORB3-ANA) and a 4-digit PIN.');
        return;
      }
      // First sign-in of the session (or onboarding not done) → onboarding; otherwise Home.
      router.replace(session.onboardedThisSession && a.onboardingDone ? '/home' : '/onboarding/1');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LoginEarth />
      <Stars stars={LOGIN_STARS} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <LogoMark alive />
            </View>
            <Txt heading weight="700" size={tokens.ext.fontSize.brand}>
              CosmoMedic
            </Txt>
            <Txt size={tokens.ext.fontSize.label} color={C.muted}>
              Health monitoring for space missions
            </Txt>
          </View>
          <View style={styles.card}>
            <Field
              label="Crew ID"
              value={crewId}
              onChangeText={setCrewId}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Crew ID"
            />
            <Field
              label="PIN"
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
              secureTextEntry
              keyboardType="number-pad"
              placeholder="••••"
              accessibilityLabel="PIN"
              onSubmitEditing={submit}
            />
            {error ? (
              <Txt size={tokens.font.size.caption} color={C.danger} accessibilityLiveRegion="polite">
                {error}
              </Txt>
            ) : null}
            <PrimaryButton label={busy ? 'Signing in…' : 'Sign in'} onPress={submit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
  brand: { alignItems: 'center', gap: 10, marginTop: 110 },
  logo: {
    width: 84,
    height: 84,
    borderRadius: tokens.radius.sheet,
    backgroundColor: C.surfaceSolid,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 30px ${X.logoGlow}`,
  },
  card: {
    gap: 12,
    marginTop: 36,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: tokens.ext.radius.panel,
    backgroundColor: X.loginCard,
    borderWidth: 1,
    borderColor: C.border,
  },
});
