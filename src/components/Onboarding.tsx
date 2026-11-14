import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { C, tokens } from '@/theme/tokens';

import { PrimaryButton } from './Buttons';
import { InfoNote } from './Card';
import { BackButton } from './Header';
import { Screen } from './Screen';
import { Txt } from './Txt';

type Props = {
  step: number;
  stepLabel: string;
  title: string;
  intro: string;
  cta: string;
  onCta: () => void;
  children: ReactNode;
};

/** Onboarding layout: back + "Step n of 5", 5-step progress bar, heading, sticky CTA. */
export function OnboardingShell({ step, stepLabel, title, intro, cta, onCta, children }: Props) {
  const back = () => router.replace(step === 1 ? '/login' : (`/onboarding/${step - 1}` as never));
  return (
    <Screen
      header={
        <View style={styles.top}>
          <View style={styles.row}>
            <BackButton onPress={back} />
            <Txt size={tokens.font.size.small} color={C.muted} style={{ flex: 1 }}>
              Step {step} of 5 · {stepLabel}
            </Txt>
          </View>
          <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 5, now: step }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.seg, { backgroundColor: i <= step ? C.teal : C.track }]} />
            ))}
          </View>
        </View>
      }
      footer={<PrimaryButton label={cta} onPress={onCta} />}
      padded
      gap={14}>
      <View style={{ gap: 6 }}>
        <Txt heading weight="700" size={tokens.ext.fontSize.h1} lh={1.25} accessibilityRole="header">
          {title}
        </Txt>
        <Txt size={tokens.ext.fontSize.label} color={C.muted} lh={1.5}>
          {intro}
        </Txt>
      </View>
      {children}
    </Screen>
  );
}

/** Two fields per row. */
export function Grid2({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function ReadOnlyNote() {
  return (
    <InfoNote icon="lock" iconColor={C.teal} size={tokens.font.size.caption}>
      Filled in by your medical team from the pre-flight exam. Just confirm. If something looks wrong, tell them in Messages.
    </InfoNote>
  );
}

const styles = StyleSheet.create({
  top: { gap: 10, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progress: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 5, borderRadius: tokens.radius.pill },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 14 },
});
