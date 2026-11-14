import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Divider, Field, Heading, Label, Muted, Row, Screen } from '@/components/cosmo-ui';
import { C, LOGS, type LogModule } from '@/constants/cosmo';

const moodChoices = [
  { title: 'Great', face: '☻', color: C.green }, { title: 'Good', face: '☺', color: C.teal }, { title: 'Okay', face: '◉', color: C.gold }, { title: 'Tired', face: '☹', color: '#FF9E57' }, { title: 'Stressed', face: '☹', color: C.pink },
];

const measurements = [
  ['Blood pressure', 'Daily', 'Not logged today', C.gold], ['Bone density', 'Weekly', 'Logged Mon · −1.1%', C.green], ['Muscle mass', 'Weekly', 'Logged Mon · −2%', C.green], ['Strength test', 'Weekly', 'Logged Wed · −6%', C.green], ['Aerobic test', 'Weekly', 'Due today · −9%', C.gold],
];

export default function LogScreen() {
  const params = useLocalSearchParams<{ module: string }>();
  const module = (LOGS.find((item) => item.key === params.module)?.key ?? 'mood') as LogModule;
  const config = LOGS.find((item) => item.key === module)!;
  const [selected, setSelected] = useState(module === 'mood' ? 'Okay' : module === 'sleep' ? '3' : module === 'body' ? 'Blood pressure' : module === 'radiation' ? 'Personal dosimeter' : module === 'exercise' ? 'Resistive' : '');
  const [secondary, setSecondary] = useState('1–2 times');
  const [number, setNumber] = useState(module === 'radiation' ? '38' : module === 'body' ? '118' : module === 'exercise' ? '30' : module === 'meals' ? '420' : '');
  const [detail, setDetail] = useState(module === 'body' ? '76' : module === 'sleep' ? '00:40' : '');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const save = () => setSaved(true);
  const setOption = (option: string) => { setSelected(option); setSaved(false); };

  return <Screen>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text><Text style={styles.backLabel}>Back</Text></Pressable>
    <Heading eyebrow="Mission log" title={config.title.replace(' check-in', '')} subtitle={config.detail} />
    {module === 'mood' ? <MoodLog selected={selected} onSelect={setOption} secondary={secondary} onSecondary={setSecondary} note={note} onNote={setNote} /> : null}
    {module === 'sleep' ? <SleepLog selected={selected} onSelect={setOption} secondary={secondary} onSecondary={setSecondary} note={note} onNote={setNote} detail={detail} setDetail={setDetail} /> : null}
    {module === 'radiation' ? <RadiationLog selected={selected} onSelect={setOption} number={number} setNumber={setNumber} detail={detail} setDetail={setDetail} /> : null}
    {module === 'body' ? <BodyLog selected={selected} onSelect={setOption} number={number} setNumber={setNumber} detail={detail} setDetail={setDetail} note={note} onNote={setNote} /> : null}
    {module === 'meals' ? <MealsLog selected={selected} onSelect={setOption} number={number} setNumber={setNumber} detail={detail} setDetail={setDetail} note={note} onNote={setNote} /> : null}
    {module === 'exercise' ? <ExerciseLog selected={selected} onSelect={setOption} number={number} setNumber={setNumber} secondary={secondary} onSecondary={setSecondary} /> : null}
    {module === 'relax' ? <RelaxLog selected={selected} onSelect={setOption} saved={saved} onSave={save} /> : null}
    {module !== 'relax' ? <Button title={saved ? '✓  Logged today' : `Save ${module === 'mood' ? `“${selected || 'mood'}”` : module === 'sleep' ? 'sleep log' : module === 'radiation' ? 'reading' : module === 'body' ? (selected === 'Injury' ? 'injury report' : 'measurement') : module === 'meals' ? 'meal' : 'session'}    +10  ◉`} onPress={save} /> : null}
    {saved && module !== 'relax' ? <Text style={styles.savedMessage}>✓  Log saved to your mission record · +10 mission coins</Text> : null}
    <Muted style={{ textAlign: 'center' }}>Entries are demo data for the hackathon. For urgent symptoms, follow your mission medical protocol.</Muted>
  </Screen>;
}

function MoodLog({ selected, onSelect, secondary, onSecondary, note, onNote }: { selected: string; onSelect: (v: string) => void; secondary: string; onSecondary: (v: string) => void; note: string; onNote: (v: string) => void }) {
  const selectedIndex = Math.max(0, moodChoices.findIndex((mood) => mood.title === selected));
  const selectedMood = moodChoices[selectedIndex];
  const responder = useMemo(() => {
    const chooseAtY = (y: number) => {
      const index = Math.max(0, Math.min(moodChoices.length - 1, Math.round(y / 52)));
      onSelect(moodChoices[index].title);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => chooseAtY(event.nativeEvent.locationY),
      onPanResponderMove: (event) => chooseAtY(event.nativeEvent.locationY),
    });
  }, [onSelect]);
  return <>
    <Label style={{ textAlign: 'center', fontSize: 20 }}>How are you feeling today, Ana?</Label>
    <Card style={styles.moodCard}>
      <View style={styles.moodScale}>
        <View style={styles.moodLabels}>{moodChoices.map((mood) => <Pressable key={mood.title} accessibilityRole="button" accessibilityState={{ selected: selected === mood.title }} onPress={() => onSelect(mood.title)} style={styles.moodChoice}><Text style={[styles.moodName, selected === mood.title && { color: mood.color, fontWeight: '800' }]}>{mood.title}</Text></Pressable>)}</View>
        <View {...responder.panHandlers} accessibilityRole="adjustable" accessibilityLabel="Mood scale. Drag vertically to choose your mood" accessibilityValue={{ min: 1, max: 5, now: selectedIndex + 1, text: selectedMood.title }} style={styles.moodTrackArea}>
          <View style={styles.moodTrackLine} /><View style={[styles.moodActiveLine, { top: 26 + selectedIndex * 52, height: Math.max(0, 208 - selectedIndex * 52), backgroundColor: selectedMood.color }]} /><View style={[styles.moodThumb, { top: selectedIndex * 52 + 16, borderColor: selectedMood.color }]} />
        </View>
        <View style={styles.moodFaces}>{moodChoices.map((mood) => <Pressable key={mood.title} accessibilityRole="button" accessibilityLabel={mood.title} onPress={() => onSelect(mood.title)} style={styles.faceChoice}><Text style={[styles.face, { color: selected === mood.title ? mood.color : C.muted }]}>{mood.face}</Text></Pressable>)}</View>
      </View>
      <Text style={[styles.selectedMood, { color: selectedMood.color }]}>{selectedMood.face}  {selectedMood.title}</Text>
      <Muted style={{ textAlign: 'center' }}>Arraste o marcador para cima ou para baixo, ou toque em uma opção.</Muted>
    </Card>
    <Label>What is behind it?</Label><View style={styles.wrap}>{['Calm', 'Focused', 'Homesick', 'Lonely', 'Anxious', 'Overloaded'].map((v) => <Chip key={v} title={v} active={secondary === v} onPress={() => onSecondary(v)} />)}</View>
    <Field label="Anything you want to note?" value={note} onChangeText={onNote} placeholder="Optional · only share what feels right" />
  </>;
}

function SleepLog({ selected, onSelect, secondary, onSecondary, note, onNote, detail, setDetail }: { selected: string; onSelect: (v: string) => void; secondary: string; onSecondary: (v: string) => void; note: string; onNote: (v: string) => void; detail: string; setDetail: (v: string) => void }) {
  return <>
    <Card><View style={styles.spaceRow}><Label>Last night</Label><Chip title="ARCHer wrist band" /></View><Text style={styles.bigNumber}>5h 20m <Text style={styles.warning}>Below 7h target</Text></Text><View style={styles.spaceRow}><Muted>Bed 00:40</Muted><Muted>Quality {selected}/5</Muted><Muted>Woke 06:00</Muted></View><View style={styles.bars}>{[30, 62, 82, 55, 22, 68, 58, 44, 29].map((height, i) => <View key={i} style={[styles.bar, { height, backgroundColor: i === 4 ? '#FF9E57' : i % 2 ? C.purple : C.muted }]} />)}</View></Card>
    <Card><Label>Log sleep</Label><Row><Field label="Went to bed" value={detail} onChangeText={setDetail} placeholder="23:00" /><Field label="Woke up" value="06:00" onChangeText={() => undefined} placeholder="06:00" /></Row><Label style={{ fontSize: 14 }}>How rested do you feel?</Label><View style={styles.wrap}>{['1', '2', '3', '4', '5'].map((v) => <Chip key={v} title={v} active={selected === v} onPress={() => onSelect(v)} />)}</View><Muted>1 = exhausted     5 = fully rested</Muted><Label style={{ fontSize: 14 }}>Woke up during the night?</Label><View style={styles.wrap}>{['No', '1–2 times', '3+ times'].map((v) => <Chip key={v} title={v} active={secondary === v} onPress={() => onSecondary(v)} />)}</View><Field label="Anything that affected your sleep?" value={note} onChangeText={onNote} placeholder="Noise, light, discomfort…" /></Card>
    <Muted>Band signals: low light exposure · 2 wake-ups · average heart rate 58 bpm · cabin noise 52 dB.</Muted>
  </>;
}

function RadiationLog({ selected, onSelect, number, setNumber, detail, setDetail }: { selected: string; onSelect: (v: string) => void; number: string; setNumber: (v: string) => void; detail: string; setDetail: (v: string) => void }) {
  return <>
    <Card><View style={styles.spaceRow}><Label>Mission total</Label><Chip title="Illustrative" /></View><Text style={styles.bigNumber}>0.48 <Text style={styles.smallUnit}>mSv · 12 days</Text></Text><Label style={{ fontSize: 13 }}>Daily dose this week (μSv)</Label><View style={styles.weekBars}>{[55, 70, 65, 84, 61, 68, 66].map((height, i) => <View key={i} style={[styles.weekBar, { height, borderColor: i === 6 ? C.text : 'transparent' }]} />)}</View><Muted>NASA does not set a fixed long-duration limit. This illustrative demo reading is not a health threshold.</Muted></Card>
    <Card><Label>Dosimeter reading</Label><View style={styles.wrap}>{['Personal dosimeter', 'Area monitor'].map((v) => <Chip key={v} title={v} active={selected === v} onPress={() => onSelect(v)} />)}</View><Row><Field label="Value" value={number} onChangeText={setNumber} keyboardType="numeric" /><Field label="Read at" value={detail} onChangeText={setDetail} placeholder="08:00" /></Row><View style={styles.wrap}><Chip title="μSv" active /><Chip title="mSv" onPress={() => setNumber(`${Number(number) / 1000}`)} /></View><Muted>Copy the value shown on your badge (ID CPD-0412).</Muted></Card>
    <Card><Label>Recent readings</Label>{[['Today 08:00', '38 μSv'], ['Yesterday 08:05', '40 μSv'], ['Thu 08:00', '37 μSv']].map(([day, value]) => <View key={day} style={styles.spaceRow}><Muted>{day} · Personal</Muted><Text style={styles.readingValue}>{value}</Text></View>)}</Card>
  </>;
}

function BodyLog({ selected, onSelect, number, setNumber, detail, setDetail, note, onNote }: { selected: string; onSelect: (v: string) => void; number: string; setNumber: (v: string) => void; detail: string; setDetail: (v: string) => void; note: string; onNote: (v: string) => void }) {
  return <>
    <Card><View style={styles.spaceRow}><Label>Measurements</Label><Muted>3 of 5 current</Muted></View>{measurements.map(([name, frequency, status, color]) => <Pressable key={name} onPress={() => onSelect(name)} style={[styles.measure, selected === name && styles.measureActive]}><View style={{ flex: 1 }}><Text style={styles.measureName}>{name} <Text style={styles.frequency}>· {frequency}</Text></Text><Text style={{ color, fontSize: 12, marginTop: 4 }}>{status}</Text></View><Text style={{ color: C.teal, fontWeight: '800' }}>›</Text></Pressable>)}</Card>
    <Card><Label>Add to Body</Label><View style={styles.wrap}>{['Measurement', 'Injury'].map((v) => <Chip key={v} title={v} active={selected === v || (v === 'Measurement' && selected !== 'Injury')} onPress={() => onSelect(v === 'Injury' ? 'Injury' : 'Blood pressure')} />)}</View>
      {selected === 'Injury' ? <><Label style={{ fontSize: 14 }}>Where?</Label><View style={styles.wrap}>{['Head', 'Neck', 'Back', 'Arm', 'Hand', 'Leg', 'Knee', 'Foot'].map((v) => <Chip key={v} title={v} active={detail === v} onPress={() => setDetail(v)} />)}</View><Label style={{ fontSize: 14 }}>What happened?</Label><View style={styles.wrap}>{['Bruise', 'Cut', 'Strain', 'Burn', 'Pain, no cause'].map((v) => <Chip key={v} title={v} active={number === v} onPress={() => setNumber(v)} />)}</View><Label style={{ fontSize: 14 }}>Severity</Label><View style={styles.wrap}>{['Minor', 'Moderate', 'Severe'].map((v) => <Chip key={v} title={v} active={selected === v} onPress={() => onSelect(v)} />)}</View><Field label="What happened?" value={note} onChangeText={onNote} placeholder="Tell your medical team what you noticed" /></> : <><Row><Field label={selected === 'Blood pressure' ? 'Systolic' : selected} value={number} onChangeText={setNumber} keyboardType="numeric" /><Field label={selected === 'Blood pressure' ? 'Diastolic' : 'Value'} value={detail} onChangeText={setDetail} keyboardType="numeric" /><Field label="Pulse" value="62" onChangeText={() => undefined} keyboardType="numeric" /></Row><Field label="Measured at" value="08:20" onChangeText={() => undefined} /><Muted>Measure seated, after 5 minutes of rest. Values are compared with your pre-flight baseline.</Muted></>}
    </Card>
    <Card><Label>Injuries · 1 active</Label><Muted>Left hand · bruise · minor · day 9 during cargo transfer</Muted><Chip title="Healing" active /></Card>
  </>;
}

function MealsLog({ selected, onSelect, number, setNumber, detail, setDetail, note, onNote }: { selected: string; onSelect: (v: string) => void; number: string; setNumber: (v: string) => void; detail: string; setDetail: (v: string) => void; note: string; onNote: (v: string) => void }) {
  return <>
    <Card><View style={styles.spaceRow}><Label>Today</Label><Muted>Goal 2,500 kcal</Muted></View><Text style={styles.bigNumber}>1,840 <Text style={styles.smallUnit}>kcal</Text></Text><Meter amount={74} color={C.purple} /><Row>{[['Protein', '62 / 90 g', C.teal], ['Carbs', '210 / 300 g', C.purple], ['Fat', '48 / 80 g', C.gold]].map(([a, b, c]) => <View key={a} style={{ flex: 1, gap: 5 }}><Muted>{a}</Muted><Text style={styles.readingValue}>{b}</Text><Meter amount={68} color={c as string} /></View>)}</Row></Card>
    <Card><Label>Meals today</Label>{[['08:10', 'Oatmeal + coffee', '420'], ['12:30', 'Beef stew + tortilla', '780'], ['16:00', 'Nuts + dried fruit', '640']].map(([time, name, cal]) => <View key={time} style={styles.mealRow}><Muted>{time}</Muted><View style={{ flex: 1 }}><Text style={styles.measureName}>{name}</Text><Text style={{ color: C.gold }}>★★★★☆</Text></View><Text style={styles.readingValue}>{cal}</Text></View>)}</Card>
    <Card><Label>Log a meal</Label><Field label="What did you eat?" value={note} onChangeText={onNote} placeholder="Meal or food item" /><View style={styles.wrap}>{['Shrimp cocktail', 'Beef stew', 'Tortilla', 'Fresh lettuce', 'Coffee', 'Rehydrated soup'].map((v) => <Chip key={v} title={v} active={selected === v} onPress={() => { onSelect(v); onNote(v); }} />)}</View><Row><Field label="Calories" value={number} onChangeText={setNumber} keyboardType="numeric" /><Field label="Time" value={detail} onChangeText={setDetail} placeholder="18:00" /></Row><Label style={{ fontSize: 14 }}>How did it taste?</Label><View style={styles.wrap}>{['1', '2', '3', '4', '5'].map((v) => <Chip key={v} title={v} active={selected === v} onPress={() => onSelect(v)} />)}</View><Muted>Taste ratings help spot menu fatigue.</Muted></Card>
    <Card style={{ borderColor: '#744D52' }}><Muted>⚠ Beef stew has been served several times in a row. Try something different to avoid menu fatigue.</Muted></Card>
  </>;
}

function ExerciseLog({ selected, onSelect, number, setNumber, secondary, onSecondary }: { selected: string; onSelect: (v: string) => void; number: string; setNumber: (v: string) => void; secondary: string; onSecondary: (v: string) => void }) {
  return <>
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}><View style={styles.activityRing}><Text style={styles.ringNumber}>60</Text><Muted>of 90 min</Muted></View><View style={{ flex: 1, gap: 5 }}><Label>Today · 30 min to go</Label><Muted>This week: 4 of 6 days done. ISS crews train about 1.5 h a day.</Muted></View></Card>
    <Card><Label>Today</Label><Muted>◈  Resistive · 07:10 · moderate · 30 min</Muted><Divider /><Muted>⌁  Aerobic · treadmill · 11:00 · moderate · 30 min</Muted></Card>
    <Card><Label>Log a session</Label><Label style={{ fontSize: 14 }}>Equipment</Label><View style={styles.wrap}>{['Resistive device', 'Treadmill', 'Cycle'].map((v) => <Chip key={v} title={v} active={selected === v} onPress={() => onSelect(v)} />)}</View><Row style={{ justifyContent: 'space-between' }}><Pressable accessibilityRole="button" onPress={() => setNumber(String(Math.max(0, Number(number) - 5)))} style={styles.adjust}><Text style={styles.adjustText}>−</Text></Pressable><View style={{ alignItems: 'center' }}><Text style={styles.bigNumber}>{number} min</Text><Muted>Duration</Muted></View><Pressable accessibilityRole="button" onPress={() => setNumber(String(Number(number) + 5))} style={styles.adjust}><Text style={styles.adjustText}>+</Text></Pressable></Row><Label style={{ fontSize: 14 }}>How hard was it?</Label><View style={styles.wrap}>{['1', '2', '3', '4', '5'].map((v) => <Chip key={v} title={v} active={secondary === v} onPress={() => onSecondary(v)} />)}</View><Muted>Very easy                                                   Max effort</Muted></Card>
  </>;
}

function RelaxLog({ selected, onSelect, saved, onSave }: { selected: string; onSelect: (v: string) => void; saved: boolean; onSave: () => void }) {
  const [running, setRunning] = useState(false);
  const sessions = [{ name: 'Earth-view breathing', time: '3 min', icon: '◉', desc: 'Ease stress before sleep' }, { name: 'Guided breathing', time: '3 min', icon: '◌', desc: 'Find a calm rhythm' }, { name: 'Meditation', time: '5 min', icon: '☼', desc: 'Reset between tasks' }, { name: 'Muscle relaxation', time: '7 min', icon: '⌁', desc: 'Release tension after exercise' }, { name: 'Mindful pause', time: '2 min', icon: '✦', desc: 'Take a quiet moment' }];
  return <><Card><Label>Recommended for you</Label><Muted>Short guided sessions for the rhythm of life in orbit.</Muted>{sessions.map((session) => <Pressable key={session.name} onPress={() => { onSelect(session.name); setRunning(false); }} style={[styles.session, selected === session.name && styles.measureActive]}><Text style={styles.sessionIcon}>{session.icon}</Text><View style={{ flex: 1 }}><Text style={styles.measureName}>{session.name}</Text><Muted>{session.time} · {session.desc}</Muted></View><Text style={{ color: C.purple }}>▷</Text></Pressable>)}</Card>{selected ? <Card style={styles.relaxCard}><Text style={styles.relaxOrb}>✦</Text><Label style={{ textAlign: 'center' }}>{selected}</Label><Muted style={{ textAlign: 'center' }}>{running ? 'Breathe in slowly… hold… and exhale.' : 'Settle in, let your shoulders drop, and focus on your breathing.'}</Muted><Button title={running ? 'End session' : 'Start session'} onPress={() => { if (running) { setRunning(false); onSave(); } else setRunning(true); }} /></Card> : null}{saved ? <Muted style={{ color: C.green }}>✓ Session complete · +10 mission coins</Muted> : null}</>;
}

function Meter({ amount, color }: { amount: number; color: string }) { return <View style={styles.meter}><View style={[styles.meterFill, { width: `${amount}%`, backgroundColor: color }]} /></View>; }

const styles = StyleSheet.create({ back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5 }, backText: { color: C.text, fontSize: 30, lineHeight: 30 }, backLabel: { color: C.muted, fontSize: 13, fontWeight: '600' },
  moodCard: { alignItems: 'center' }, moodScale: { height: 260, width: '100%', maxWidth: 500, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center' }, moodLabels: { flex: 1, alignItems: 'flex-end' }, moodChoice: { height: 52, justifyContent: 'center', paddingRight: 14 }, moodName: { color: C.muted, fontSize: 14 }, moodTrackArea: { width: 56, height: 260, alignItems: 'center', position: 'relative' }, moodTrackLine: { position: 'absolute', top: 26, bottom: 26, width: 5, borderRadius: 4, backgroundColor: C.track }, moodActiveLine: { position: 'absolute', width: 5, borderRadius: 4 }, moodThumb: { position: 'absolute', left: 13, width: 30, height: 30, borderRadius: 16, backgroundColor: C.text, borderWidth: 4, shadowColor: C.purple, shadowOpacity: 0.45, shadowRadius: 8, elevation: 5 }, moodFaces: { flex: 1, alignItems: 'flex-start' }, faceChoice: { height: 52, width: 56, justifyContent: 'center', paddingLeft: 10 }, face: { textAlign: 'center', fontSize: 25 }, selectedMood: { fontSize: 18, fontWeight: '900' },
  spaceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 7 }, bigNumber: { color: C.text, fontWeight: '900', fontSize: 34 }, smallUnit: { color: C.muted, fontSize: 15, fontWeight: '500' }, warning: { color: C.gold, fontSize: 12, fontWeight: '700' }, bars: { height: 82, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 5 }, bar: { flex: 1, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  weekBars: { height: 85, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' }, weekBar: { flex: 1, maxWidth: 35, backgroundColor: C.gold, borderRadius: 7, borderWidth: 2 }, readingValue: { color: C.text, fontWeight: '800', fontSize: 13 },
  measure: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 6 }, measureActive: { backgroundColor: '#123A45', borderColor: C.teal, borderRadius: 12 }, measureName: { color: C.text, fontWeight: '700', fontSize: 13 }, frequency: { color: C.muted, fontWeight: '400' }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  mealRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: C.border }, meter: { height: 8, backgroundColor: C.track, borderRadius: 8, overflow: 'hidden' }, meterFill: { height: '100%', borderRadius: 8 }, activityRing: { width: 85, height: 85, borderRadius: 44, borderWidth: 7, borderColor: C.teal, alignItems: 'center', justifyContent: 'center' }, ringNumber: { color: C.text, fontWeight: '900', fontSize: 23 }, adjust: { backgroundColor: C.elevated, width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, adjustText: { color: C.text, fontWeight: '700', fontSize: 24 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 14, backgroundColor: C.background }, sessionIcon: { color: C.teal, fontSize: 21 }, relaxCard: { alignItems: 'center' }, relaxOrb: { color: C.teal, fontSize: 44 },
  savedMessage: { color: C.green, textAlign: 'center', fontSize: 13, fontWeight: '700' },
});
