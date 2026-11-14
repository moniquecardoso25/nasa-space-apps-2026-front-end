import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/components/Card';
import { Chip, Field } from '@/components/Inputs';
import { Grid2, OnboardingShell } from '@/components/Onboarding';
import { getAstronaut, getMission } from '@/data/api';
import { capitalize, formatCoins } from '@/data/format';
import { useData } from '@/data/store';

const FOOD_OPTIONS = ['no restrictions', 'vegetarian', 'no pork', 'low sodium'];

/** Onboarding 3 · Vitals and habits (read-only). */
export default function Onb3() {
  const { me, mission } = useData(() => ({ me: getAstronaut(), mission: getMission() }));
  const b = me.baseline;
  const prefs = me.profile.foodPreferences.map((f) => f.toLowerCase());
  const options = [...FOOD_OPTIONS, ...prefs.filter((p) => !FOOD_OPTIONS.includes(p))];
  const fields: [string, string, string?][] = [
    ['Resting heart rate', String(b.restingHr), 'bpm'],
    ['Resting BP', b.restingBp, 'mmHg'],
    ['Usual sleep', String(b.usualSleepH), 'h'],
    ['Usual bedtime', b.usualBedtime],
    ['Calorie goal', formatCoins(mission.goals.kcalPerDay), 'kcal'],
    ['Exercise goal', String(mission.goals.exerciseMinPerDay), 'min/day'],
  ];
  return (
    <OnboardingShell
      step={3}
      stepLabel="Vitals and habits"
      title="Vitals and habits"
      intro="Your daily targets. Exercise follows the ISS routine of about 1.5 h a day."
      cta="Confirm"
      onCta={() => router.push('/onboarding/4')}>
      <Grid2>
        {fields.map(([label, value, unit]) => (
          <Field key={label} label={label} value={value} unit={unit} readOnly style={styles.half} />
        ))}
      </Grid2>
      <View style={{ gap: 8 }}>
        <SectionLabel>Food preferences</SectionLabel>
        <View style={styles.chips}>
          {options.map((o) => (
            <Chip key={o} label={capitalize(o)} selected={prefs.includes(o)} readOnly />
          ))}
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  half: { flexBasis: '45%', flexGrow: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
