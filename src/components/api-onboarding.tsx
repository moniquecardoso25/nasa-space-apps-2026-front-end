import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BoltMascot } from '@/components/bolt-mascot';
import { Button, Card, Chip, Heading, Label, Muted, Screen } from '@/components/cosmo-ui';
import { useAuth } from '@/components/auth-context';
import { C } from '@/constants/cosmo';
import { crewHealthApi, type CheckinOptions, type JsonRecord } from '@/services/crew-health-api';

const steps = ['Crew account', 'Health baseline', 'Daily check-in', 'Preferences', 'Your companion'];

export function ApiOnboarding() {
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [today, setToday] = useState<JsonRecord | null>(null);
  const [baseline, setBaseline] = useState<JsonRecord | null>(null);
  const [options, setOptions] = useState<CheckinOptions | null>(null);
  const [proactiveMessages, setProactiveMessages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const me = session?.me;

  useEffect(() => {
    if (!me) return;
    Promise.allSettled([
      crewHealthApi.mission.today(me.missionId, me.astronautId, me.missionDay),
      crewHealthApi.mission.baseline(me.missionId, me.astronautId),
      crewHealthApi.checkinOptions(),
      crewHealthApi.preferences(),
    ]).then(([todayResult, baselineResult, optionsResult, preferencesResult]) => {
      if (todayResult.status === 'fulfilled') setToday(todayResult.value);
      if (baselineResult.status === 'fulfilled') setBaseline(baselineResult.value);
      if (optionsResult.status === 'fulfilled') setOptions(optionsResult.value);
      if (preferencesResult.status === 'fulfilled') setProactiveMessages(preferencesResult.value.proactiveMessages);
      const failure = [todayResult, baselineResult, optionsResult, preferencesResult].find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') setError(failure.reason instanceof Error ? failure.reason.message : 'Some profile data could not be loaded.');
    });
  }, [me]);

  const continueStep = async () => {
    setError('');
    if (step === 3) {
      setBusy(true);
      try { await crewHealthApi.updatePreferences(proactiveMessages); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save preferences.'); setBusy(false); return; }
      setBusy(false);
    }
    if (step < steps.length - 1) setStep((current) => current + 1);
    else router.replace('/home');
  };

  return <Screen>
    <Pressable accessibilityRole="button" onPress={() => step > 0 ? setStep((current) => current - 1) : router.back()} style={styles.back}><Text style={styles.backText}>‹  Back</Text></Pressable>
    <View style={styles.progressRow}><Text style={styles.progressText}>Step {step + 1} of {steps.length} · {steps[step]}</Text><Text style={styles.progressPercent}>{(step + 1) * 20}%</Text></View>
    <View accessibilityLabel={`Onboarding step ${step + 1} of 5`} style={styles.progress}>{steps.map((_, index) => <View key={index} style={[styles.progressPart, index <= step && styles.progressDone]} />)}</View>

    {step === 0 ? <>
      <Heading title={`Welcome aboard, ${me?.displayName || session?.user.displayName || 'Crew member'}`} subtitle="Your crew profile and mission assignment are provided by the Crew Health API." />
      <Card><ApiField label="Username" value={me?.username || session?.user.username} /><ApiField label="Astronaut ID" value={me?.astronautId || session?.user.astronautId} /><ApiField label="Mission" value={me?.missionId} /><ApiField label="Mission day" value={me?.missionDay} /></Card>
    </> : null}

    {step === 1 ? <>
      <Heading title="Your health baseline" subtitle="These values come from the mission API and are read-only in the astronaut app." />
      <ApiDataCard title="Today against baseline" value={today} loading={!today && !error} />
      <ApiDataCard title="Pre-mission baseline" value={baseline} loading={!baseline && !error} />
    </> : null}

    {step === 2 ? <>
      <Heading title="Daily health check-in" subtitle="The API accepts stress, fatigue, symptoms, and an optional note. A symptom marked urgent creates a request to the medical team." />
      <Card><Label>Rating scale</Label>{options ? Object.entries(options.scale).map(([score, label]) => <ApiField key={score} label={`Level ${score}`} value={label} />) : <Muted>{error || 'Loading check-in options…'}</Muted>}</Card>
      <Card><Label>Available symptoms</Label><View style={styles.wrap}>{(options?.symptoms ?? []).slice(0, 12).map((symptom) => <Chip key={symptom.code} title={`${symptom.label}${symptom.urgent ? ' · urgent' : ''}`} />)}</View>{options && options.symptoms.length > 12 ? <Muted>{options.symptoms.length - 12} more symptoms are available in the check-in form.</Muted> : null}</Card>
    </> : null}

    {step === 3 ? <>
      <Heading title="Message preferences" subtitle="Choose whether the health monitor can send proactive wellbeing messages. You can change this later." />
      <Card style={styles.reminders}><View style={{ flex: 1, gap: 4 }}><Label>Proactive messages</Label><Muted>Messages can summarize health patterns and offer a way to request support.</Muted></View><Switch value={proactiveMessages} onValueChange={setProactiveMessages} trackColor={{ false: C.track, true: C.teal }} thumbColor={C.text} accessibilityLabel="Proactive health messages" /></Card>
      <Card><Muted>Changing this preference updates the API account attached to your astronaut username.</Muted></Card>
    </> : null}

    {step === 4 ? <>
      <Heading title="Your companion" subtitle="Bolt is the CosmoMedic interface companion. Your NASA health records remain attached to your crew account." />
      <Card style={styles.companionCard}><View style={styles.companionStage}><View style={styles.companionScale}><BoltMascot /></View><View style={styles.companionGlow} /><View style={styles.companionOrbit} /></View><Label style={{ textAlign: 'center' }}>Ready for mission day {me?.missionDay ?? '—'}</Label></Card>
    </> : null}
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    <Button title={busy ? 'Saving…' : step === steps.length - 1 ? 'Start mission' : 'Confirm & continue'} onPress={continueStep} disabled={busy} />
  </Screen>;
}

function ApiField({ label, value }: { label: string; value: unknown }) {
  return <View style={styles.apiField}><Muted>{label}</Muted><Text style={styles.apiValue}>{value === null || value === undefined ? 'Not provided' : String(value)}</Text></View>;
}

function ApiDataCard({ title, value, loading }: { title: string; value: JsonRecord | null; loading: boolean }) {
  const entries = value ? Object.entries(value).filter(([, item]) => item === null || typeof item !== 'object').slice(0, 10) : [];
  return <Card><Label>{title}</Label>{loading ? <Muted>Loading API data…</Muted> : entries.length ? entries.map(([key, item]) => <ApiField key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')} value={item} />) : <Muted>No summary fields were returned. View the full results on Crew status.</Muted>}</Card>;
}

const styles = StyleSheet.create({
  back: { minHeight: 40, alignSelf: 'flex-start', justifyContent: 'center' }, backText: { color: C.muted, fontWeight: '700' }, progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }, progressText: { color: C.muted, fontSize: 12 }, progressPercent: { color: C.teal, fontSize: 11, fontWeight: '800' }, progress: { flexDirection: 'row', gap: 5 }, progressPart: { height: 5, flex: 1, borderRadius: 4, backgroundColor: C.track }, progressDone: { backgroundColor: C.teal }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, apiField: { minHeight: 39, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 8 }, apiValue: { color: C.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' }, reminders: { flexDirection: 'row', alignItems: 'center', gap: 8 }, error: { color: C.gold, fontSize: 12 }, companionCard: { alignItems: 'stretch' }, companionStage: { height: 210, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: 17, overflow: 'hidden' }, companionScale: { transform: [{ scale: 0.95 }], zIndex: 2 }, companionGlow: { position: 'absolute', bottom: 19, width: 185, height: 25, borderRadius: 100, backgroundColor: 'rgba(139,124,255,0.2)', shadowColor: C.purple, shadowOpacity: 0.8, shadowRadius: 16 }, companionOrbit: { position: 'absolute', width: 225, height: 85, bottom: 5, borderRadius: 120, borderWidth: 1, borderColor: C.purple, opacity: 0.8 },
});
