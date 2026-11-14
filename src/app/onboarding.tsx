import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BoltMascot } from '@/components/bolt-mascot';
import { Button, Card, Chip, Field, Heading, Label, Muted, Row, Screen } from '@/components/cosmo-ui';
import { useCrewProfile } from '@/components/crew-profile-context';
import { C } from '@/constants/cosmo';
import { useAuth } from '@/components/auth-context';
import { ApiOnboarding } from '@/components/api-onboarding';

const steps = ['Welcome', 'Body baseline', 'Vitals & habits', 'Devices', 'Your companion'];
const deviceOptions = [
  { id: 'ARCHer wrist band', title: 'ARCHeR wrist band', detail: 'Sleep, movement and light exposure' },
  { id: 'Personal dosimeter', title: 'Personal dosimeter', detail: 'Badge ID CPD-0412' },
  { id: 'Blood pressure cuff', title: 'Blood pressure cuff', detail: 'Optional · pair or enter values manually' },
];

export default function OnboardingScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const { setProfile } = useCrewProfile();
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Ana Souza');
  const [email, setEmail] = useState(Array.isArray(emailParam) ? emailParam[0] : emailParam || '');
  const [crewId, setCrewId] = useState('ORB3-ANA');
  const [mission, setMission] = useState('Orbit-3 · low Earth orbit');
  const [missionStart, setMissionStart] = useState('Nov 3, 2026');
  const [missionDays, setMissionDays] = useState('30');
  const [language, setLanguage] = useState('English');
  const [heightCm, setHeightCm] = useState('168');
  const [weightKg, setWeightKg] = useState('60');
  const [age, setAge] = useState('38');
  const [boneDensity, setBoneDensity] = useState('1.20');
  const [muscleMass, setMuscleMass] = useState('28');
  const [strengthScore, setStrengthScore] = useState('100');
  const [aerobicScore, setAerobicScore] = useState('100');
  const [bodyFat, setBodyFat] = useState('22');
  const [restingHeartRate, setRestingHeartRate] = useState('62');
  const [bloodPressure, setBloodPressure] = useState('118/76');
  const [sleepHours, setSleepHours] = useState('7.5');
  const [bedtime, setBedtime] = useState('23:00');
  const [calorieGoal, setCalorieGoal] = useState('2,500');
  const [exerciseGoal, setExerciseGoal] = useState('90');
  const [foodPreference, setFoodPreference] = useState('No restrictions');
  const [devices, setDevices] = useState<string[]>(['ARCHer wrist band', 'Personal dosimeter']);
  const [reminders, setReminders] = useState(true);
  const [companion, setCompanion] = useState('Bolt');

  const toggleDevice = (id: string) => setDevices((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const finish = () => {
    setProfile({ name, email, crewId, mission, missionStart, missionDays, language, heightCm, weightKg, age, boneDensity, muscleMass, strengthScore, aerobicScore, bodyFat, restingHeartRate, bloodPressure, sleepHours, bedtime, calorieGoal, exerciseGoal, foodPreference, devices, reminders, companion });
    router.replace('/home');
  };
  const next = () => step < steps.length - 1 ? setStep((current) => current + 1) : finish();
  const back = () => step > 0 ? setStep((current) => current - 1) : router.back();

  if (session && !session.offlineDemo && session.user.role === 'astronaut') return <ApiOnboarding />;

  return <Screen>
    <Pressable accessibilityRole="button" onPress={back} style={styles.back}><Text style={styles.backText}>‹  Back</Text></Pressable>
    <View style={styles.progressRow}><Text style={styles.progressText}>Step {step + 1} of {steps.length} · {steps[step]}</Text><Text style={styles.progressPercent}>{(step + 1) * 20}%</Text></View>
    <View accessibilityLabel={`Onboarding step ${step + 1} of 5`} style={styles.progress}>{steps.map((_, i) => <View key={i} style={[styles.progressPart, i <= step && styles.progressDone]} />)}</View>

    {step === 0 ? <>
      <Heading title={`Welcome aboard, ${name.trim().split(' ')[0] || 'Commander'}`} subtitle="Tell us who you are and confirm your mission details before you enter the health prototype." />
      <Card><Row><Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" /><Field label="Crew ID" value={crewId} onChangeText={setCrewId} placeholder="ORB3-ANA" autoCapitalize="characters" /></Row><Field label="Email" value={email} onChangeText={setEmail} placeholder="name@mission.org" keyboardType="email-address" autoCapitalize="none" /><Field label="Mission" value={mission} onChangeText={setMission} placeholder="Mission name" /><Row><Field label="Mission start" value={missionStart} onChangeText={setMissionStart} placeholder="Nov 3, 2026" /><Field label="Mission length (days)" value={missionDays} onChangeText={setMissionDays} keyboardType="numeric" /></Row><Field label="App language" value={language} onChangeText={setLanguage} placeholder="English" /></Card>
      <Info>These details personalize the health prototype. You can update them as your mission changes.</Info>
    </> : null}

    {step === 1 ? <>
      <Heading title="Your body before launch" subtitle="Your pre-flight measurements create a baseline for comparing health signals during the mission." />
      <Card><Row><Field label="Height · cm" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" /><Field label="Weight · kg" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" /></Row><Row><Field label="Age · years" value={age} onChangeText={setAge} keyboardType="numeric" /><Field label="Bone density · g/cm²" value={boneDensity} onChangeText={setBoneDensity} keyboardType="numeric" /></Row><Row><Field label="Muscle mass · kg" value={muscleMass} onChangeText={setMuscleMass} keyboardType="numeric" /><Field label="Strength score" value={strengthScore} onChangeText={setStrengthScore} keyboardType="numeric" /></Row><Row><Field label="Aerobic score" value={aerobicScore} onChangeText={setAerobicScore} keyboardType="numeric" /><Field label="Body fat · %" value={bodyFat} onChangeText={setBodyFat} keyboardType="numeric" /></Row></Card>
      <Info>In orbit, bone density and fitness can change. The app compares new readings with the values you enter here.</Info>
    </> : null}

    {step === 2 ? <>
      <Heading title="Vitals and habits" subtitle="Set the normal values and daily targets you want to compare with in orbit." />
      <Card><Row><Field label="Resting heart rate · bpm" value={restingHeartRate} onChangeText={setRestingHeartRate} keyboardType="numeric" /><Field label="Resting blood pressure" value={bloodPressure} onChangeText={setBloodPressure} placeholder="118/76 mmHg" /></Row><Row><Field label="Usual sleep · hours" value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" /><Field label="Usual bedtime" value={bedtime} onChangeText={setBedtime} placeholder="23:00" /></Row><Row><Field label="Calorie goal · kcal" value={calorieGoal} onChangeText={setCalorieGoal} keyboardType="numeric" /><Field label="Exercise goal · min/day" value={exerciseGoal} onChangeText={setExerciseGoal} keyboardType="numeric" /></Row><Label style={{ fontSize: 14 }}>Food preferences</Label><View style={styles.wrap}>{['No restrictions', 'Vegetarian', 'No pork', 'Low sodium'].map((value) => <Chip key={value} title={value} active={foodPreference === value} onPress={() => setFoodPreference(value)} />)}</View></Card>
      <Info>These targets help summarize daily check-ins. Mission medical staff can adjust them.</Info>
    </> : null}

    {step === 3 ? <>
      <Heading title="Connect your devices" subtitle="Choose the devices you use. You can change these connections later." />
      <Card>{deviceOptions.map((device) => { const connected = devices.includes(device.id); return <Pressable key={device.id} accessibilityRole="button" accessibilityState={{ selected: connected }} onPress={() => toggleDevice(device.id)} style={styles.device}><View style={styles.deviceIcon}><Text style={styles.deviceGlyph}>{device.id === 'Personal dosimeter' ? '☼' : device.id === 'Blood pressure cuff' ? '♡' : '⌚'}</Text></View><View style={styles.deviceCopy}><Text style={styles.deviceTitle}>{device.title}</Text><Text style={styles.deviceSub}>{device.detail}</Text></View><Text style={[styles.deviceAction, { color: connected ? C.green : C.purple }]}>{connected ? '✓ Connected' : 'Pair'}</Text></Pressable>; })}
        <View style={styles.reminders}><View style={{ flex: 1, gap: 3 }}><Text style={styles.deviceTitle}>Daily reminders</Text><Text style={styles.deviceSub}>Check-in at 08:00 · wind-down at 21:00</Text></View><Switch value={reminders} onValueChange={setReminders} trackColor={{ false: C.track, true: C.teal }} thumbColor={C.text} accessibilityLabel="Daily reminders" /></View>
      </Card><Info>Device readings in this hackathon prototype are simulated.</Info>
    </> : null}

    {step === 4 ? <>
      <Heading title="Meet your companion" subtitle="Your astronaut companion makes the mission feel a little less far from home." />
      <Card style={styles.companionCard}><View style={styles.companionStage}><View style={styles.companionGlow} /><View style={styles.companionScale}><BoltMascot /></View><View style={styles.companionOrbit} /></View><Field label="Companion name" value={companion} onChangeText={setCompanion} placeholder="Bolt" /></Card>
      <Info>Orbi is your on-board AI. Journal mode can share summaries with the medical team; Private mode is not saved.</Info>
    </> : null}

    <Button title={step === steps.length - 1 ? 'Start mission' : 'Confirm & continue'} onPress={next} />
  </Screen>;
}

function Info({ children }: { children: string }) { return <Card style={styles.info}><Text style={styles.infoIcon}>♧</Text><Muted style={{ flex: 1 }}>{children}</Muted></Card>; }

const styles = StyleSheet.create({
  back: { minHeight: 40, alignSelf: 'flex-start', justifyContent: 'center' }, backText: { color: C.muted, fontWeight: '700' }, progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }, progressText: { color: C.muted, fontSize: 12 }, progressPercent: { color: C.teal, fontSize: 11, fontWeight: '800' }, progress: { flexDirection: 'row', gap: 5 }, progressPart: { height: 5, flex: 1, borderRadius: 4, backgroundColor: C.track }, progressDone: { backgroundColor: C.teal }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, info: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 }, infoIcon: { color: C.teal, fontSize: 17 },
  device: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderTopColor: C.border }, deviceIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center' }, deviceGlyph: { color: C.purple, fontSize: 20 }, deviceCopy: { flex: 1, gap: 3 }, deviceTitle: { color: C.text, fontWeight: '800', fontSize: 13 }, deviceSub: { color: C.muted, fontSize: 11 }, deviceAction: { fontWeight: '800', fontSize: 12 }, reminders: { minHeight: 65, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  companionCard: { alignItems: 'stretch' }, companionStage: { height: 210, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: 17, overflow: 'hidden' }, companionScale: { transform: [{ scale: 0.95 }], zIndex: 2 }, companionGlow: { position: 'absolute', bottom: 19, width: 185, height: 25, borderRadius: 100, backgroundColor: 'rgba(139,124,255,0.2)', shadowColor: C.purple, shadowOpacity: 0.8, shadowRadius: 16 }, companionOrbit: { position: 'absolute', width: 225, height: 85, bottom: 5, borderRadius: 120, borderWidth: 1, borderColor: C.purple, opacity: 0.8 },
});
