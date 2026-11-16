import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { Field } from '@/components/Inputs';
import { LOGIN_STARS, LoginEarth, LogoMark, Stars } from '@/components/Space';
import { Txt } from '@/components/Txt';
import { getSessionRole, signIn } from '@/data/api';
import { C, X, tokens } from '@/theme/tokens';

/** Authenticate with the backend username/password contract. */
export default function Login() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const a = await signIn(username, password);
    if (getSessionRole() === 'ground') { router.replace('/ground'); return; }
    if (!a) { setError('Invalid username or password.'); return; }
    router.replace(a.onboardingDone ? '/home' : '/onboarding/1');
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
              Orbi
            </Txt>
            <Txt size={tokens.ext.fontSize.label} color={C.muted}>
              Health monitoring for space missions
            </Txt>
          </View>
          <View style={styles.card}>
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Username"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••"
              accessibilityLabel="Password"
            />
            {error ? (
              <Txt size={tokens.font.size.caption} color={C.danger} accessibilityLiveRegion="polite">
                {error}
              </Txt>
            ) : null}
            <PrimaryButton label="Sign in" onPress={submit} disabled={!username.trim() || !password} />
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
