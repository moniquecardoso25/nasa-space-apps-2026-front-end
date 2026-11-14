import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Field } from '@/components/Inputs';
import { Grid2, OnboardingShell, ReadOnlyNote } from '@/components/Onboarding';
import { getAstronaut } from '@/data/api';
import { useData } from '@/data/store';

/** Onboarding 2 · Body baseline (read-only). */
export default function Onb2() {
  const me = useData(() => getAstronaut());
  const { profile: p, baseline: b } = me;
  const fields: [string, string, string?][] = [
    ['Height', String(p.heightCm), 'cm'],
    ['Weight', String(p.weightKg), 'kg'],
    ['Age', String(p.age), 'yrs'],
    ['Bone density', b.boneDensity.toFixed(2), 'g/cm²'],
    ['Muscle mass', String(b.muscleMassKg), 'kg'],
    ['Strength score', String(b.strengthScore)],
    ['Aerobic score', String(b.aerobicScore)],
    ['Body fat', String(b.bodyFatPct), '%'],
  ];
  return (
    <OnboardingShell
      step={2}
      stepLabel="Body baseline"
      title="Your body before launch"
      intro="In orbit, bone density can drop 1–1.5% a month and fitness 10–12% overall. These values are what we compare against."
      cta="Confirm"
      onCta={() => router.push('/onboarding/3')}>
      <Grid2>
        {fields.map(([label, value, unit]) => (
          <Field key={label} label={label} value={value} unit={unit} readOnly style={styles.half} />
        ))}
      </Grid2>
      <ReadOnlyNote />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({ half: { flexBasis: '45%', flexGrow: 1 } });
