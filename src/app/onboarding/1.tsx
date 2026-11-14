import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Field } from '@/components/Inputs';
import { Grid2, OnboardingShell, ReadOnlyNote } from '@/components/Onboarding';
import { LogoMark } from '@/components/Space';
import { Txt } from '@/components/Txt';
import { firstName, getAstronaut, getMission } from '@/data/api';
import { monthName } from '@/data/format';
import { useData } from '@/data/store';
import { C, tokens } from '@/theme/tokens';

const DESTINATION: Record<string, string> = {
  LEO: 'low Earth orbit',
  ISS: 'International Space Station',
  Moon: 'Moon',
  Mars: 'Mars',
};

/** Onboarding 1 · Welcome (read-only). */
export default function Onb1() {
  const { me, mission } = useData(() => ({ me: getAstronaut(), mission: getMission() }));
  const start = new Date(mission.startDate + 'T00:00:00Z');
  const startText = `${monthName(start.getUTCMonth())} ${start.getUTCDate()}, ${start.getUTCFullYear()}`;
  return (
    <OnboardingShell
      step={1}
      stepLabel="Welcome"
      title={`Welcome aboard, ${firstName(me)}`}
      intro="CosmoMedic tracks your health during the mission and compares it with how you were before launch."
      cta="Confirm"
      onCta={() => router.push('/onboarding/2')}>
      <Card>
        <View style={styles.idRow}>
          <LogoMark size={52} />
          <View style={{ gap: 2 }}>
            <Txt weight="700" size={tokens.font.size.screenTitle}>
              {me.name}
            </Txt>
            <Txt size={tokens.font.size.small} color={C.muted}>
              Crew ID {me.crewId}
            </Txt>
          </View>
        </View>
      </Card>
      <Field label="Mission" value={`${mission.name} · ${DESTINATION[mission.destination]}`} readOnly />
      <Grid2>
        <Field label="Start" value={startText} readOnly style={styles.half} />
        <Field label="Length" value={String(mission.lengthDays)} unit="days" readOnly style={styles.half} />
      </Grid2>
      <Field label="App language" value="English" readOnly />
      <ReadOnlyNote />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  half: { flexBasis: '45%', flexGrow: 1 },
});
