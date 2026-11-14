import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Heading, Label, Muted, Row, Screen } from '@/components/cosmo-ui';
import { C } from '@/constants/cosmo';

const steps = ['Welcome', 'Body baseline', 'Vitals & habits', 'Devices', 'Your companion'];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const name = 'Ana Souza';
  const [language, setLanguage] = useState('English');
  const [food, setFood] = useState('No restrictions');
  const [devices, setDevices] = useState<string[]>(['ARCHer wrist band', 'Personal dosimeter']);
  const [companion, setCompanion] = useState('Bolt');
  const back = () => step ? setStep(step - 1) : router.back();
  const next = () => step < steps.length - 1 ? setStep(step + 1) : router.replace('/');
  const toggleDevice = (item: string) => setDevices((current) => current.includes(item) ? current.filter((v) => v !== item) : [...current, item]);
  return <Screen>
    <Pressable accessibilityRole="button" onPress={back} style={styles.back}><Text style={styles.backText}>‹  Back</Text></Pressable>
    <View style={styles.progressRow}><Text style={styles.progressText}>Step {step + 1} of {steps.length} · {steps[step]}</Text></View><View style={styles.progress}>{steps.map((_, i) => <View key={i} style={[styles.progressPart, i <= step && styles.progressDone]} />)}</View>
    {step === 0 ? <><Heading title={`Welcome aboard, ${name.split(' ')[0]}`} subtitle="CosmoMedic tracks your health during the mission and compares it with how you were before launch." /><Card><Label>{name}</Label><Muted>Crew ID ORB3-ANA</Muted><Field label="Mission" value="Orbit-3 · low Earth orbit" onChangeText={() => undefined} /><Row><Field label="Mission start" value="Nov 3, 2026" onChangeText={() => undefined} /><Field label="Length" value="30 days" onChangeText={() => undefined} /></Row><Field label="App language" value={language} onChangeText={setLanguage} /></Card><Info>Pre-flight details are supplied by your medical team. Confirm them or send a message if something looks wrong.</Info></> : null}
    {step === 1 ? <><Heading title="Your body before launch" subtitle="Baseline values give the crew medical team a point of comparison during flight." /><Card><Row><Field label="Height" value="168" onChangeText={() => undefined} keyboardType="numeric" /><Field label="Weight" value="60" onChangeText={() => undefined} keyboardType="numeric" /></Row><Row><Field label="Age" value="38" onChangeText={() => undefined} keyboardType="numeric" /><Field label="Bone density" value="1.20 g/cm²" onChangeText={() => undefined} keyboardType="numeric" /></Row><Row><Field label="Muscle mass" value="28 kg" onChangeText={() => undefined} keyboardType="numeric" /><Field label="Strength score" value="100" onChangeText={() => undefined} keyboardType="numeric" /></Row><Row><Field label="Aerobic score" value="100" onChangeText={() => undefined} keyboardType="numeric" /><Field label="Body fat" value="22%" onChangeText={() => undefined} keyboardType="numeric" /></Row></Card><Info>These baseline values are entered by the medical team from your pre-flight exam.</Info></> : null}
    {step === 2 ? <><Heading title="Vitals and habits" subtitle="Personal targets support your daily routine in orbit." /><Card><Row><Field label="Resting heart rate" value="62 bpm" onChangeText={() => undefined} /><Field label="Resting blood pressure" value="118/76 mmHg" onChangeText={() => undefined} /></Row><Row><Field label="Usual sleep" value="7.5 h" onChangeText={() => undefined} /><Field label="Usual bedtime" value="23:00" onChangeText={() => undefined} /></Row><Row><Field label="Calorie goal" value="2,500 kcal" onChangeText={() => undefined} /><Field label="Exercise goal" value="90 min/day" onChangeText={() => undefined} /></Row><Label style={{ fontSize: 14 }}>Food preferences</Label><View style={styles.wrap}>{['No restrictions', 'Vegetarian', 'No pork', 'Low sodium'].map((v) => <Chip key={v} title={v} active={food === v} onPress={() => setFood(v)} />)}</View></Card><Info>Your exercise plan follows the mission routine. Goals can be adjusted by your medical team.</Info></> : null}
    {step === 3 ? <><Heading title="Connect your devices" subtitle="Some signals arrive automatically. Add manual readings at any time." /><Card>{['ARCHer wrist band · sleep, movement, light exposure', 'Personal dosimeter · badge ID CPD-0412', 'Blood pressure cuff · optional'].map((item) => <Pressable key={item} onPress={() => toggleDevice(item.split(' · ')[0])} style={styles.device}><View><Text style={styles.deviceTitle}>{item.split(' · ')[0]}</Text><Text style={styles.deviceSub}>{item.split(' · ')[1]}</Text></View><Text style={{ color: devices.includes(item.split(' · ')[0]) ? C.green : C.purple, fontWeight: '800' }}>{devices.includes(item.split(' · ')[0]) ? '✓ Connected' : 'Pair'}</Text></Pressable>)}</Card><Info>Device readings shown in this hackathon demo are simulated.</Info></> : null}
    {step === 4 ? <><Heading title="Meet your companion" subtitle="Everyone starts with the same astronaut. Keep logging to earn coins and customize your mission space." /><Card style={{ alignItems: 'center' }}><Text style={{ fontSize: 92 }}>👩‍🚀</Text><Field label="Companion name" value={companion} onChangeText={setCompanion} /></Card><Info>Orbi can help you reflect in Journal mode, or stay Private when you just need space.</Info></> : null}
    <Button title={step === steps.length - 1 ? 'Start mission' : step === 3 ? 'Continue' : 'Confirm & continue'} onPress={next} />
  </Screen>;
}

function Info({ children }: { children: string }) { return <Card style={styles.info}><Text style={{ color: C.teal }}>▣</Text><Muted style={{ flex: 1 }}>{children}</Muted></Card>; }

const styles = StyleSheet.create({ back: { minHeight: 40, alignSelf: 'flex-start', justifyContent: 'center' }, backText: { color: C.muted, fontWeight: '700' }, progressRow: { marginTop: 6 }, progressText: { color: C.muted, fontSize: 12 }, progress: { flexDirection: 'row', gap: 5 }, progressPart: { height: 5, flex: 1, borderRadius: 4, backgroundColor: C.track }, progressDone: { backgroundColor: C.teal }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, info: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 }, device: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: C.border }, deviceTitle: { color: C.text, fontWeight: '700', fontSize: 13 }, deviceSub: { color: C.muted, fontSize: 11, marginTop: 4 },
});
