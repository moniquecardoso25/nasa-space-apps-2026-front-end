import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { AstronautHologram } from '@/components/astronaut-hologram';
import { Card, Heading, Muted, Screen } from '@/components/cosmo-ui';
import { useDesktopLayout } from '@/components/responsive-layout';
import { useCrewProfile } from '@/components/crew-profile-context';
import { C } from '@/constants/cosmo';

const days = [
  { label: 'D6', score: '68', logs: 5, amount: 0.72 }, { label: 'D7', score: '70', logs: 4, amount: 0.55 },
  { label: 'D8', score: '74', logs: 6, amount: 0.82 }, { label: 'D9', score: '71', logs: 4, amount: 0.55 },
  { label: 'D10', score: '69', logs: 4, amount: 0.55 }, { label: 'D11', score: '76', logs: 6, amount: 0.82 },
  { label: 'Today', score: '72', logs: 3, amount: 0.38 },
];

const signals = [
  { title: 'Mood', value: 'Good', icon: '☺', color: C.green, link: '/log/mood' },
  { title: 'Blood pressure', value: '118 / 76', icon: '♡', color: C.teal, link: '/log/body' },
  { title: 'Radiation · today', value: '38 μSv', icon: '☼', color: C.gold, link: '/log/radiation' },
  { title: 'Sleep · last night', value: '5 h 20 min', icon: '☾', color: C.gold, link: '/log/sleep' },
  { title: 'Bone density', value: '−1.1% vs baseline', icon: '⌁', color: C.green, link: '/log/body' },
  { title: 'Exercise', value: '60 / 90 min', icon: '⌁', color: C.gold, link: '/log/exercise' },
];

const bodyAreas = [
  { icon: '☺', title: 'Mood', label: 'Head', value: 'Good', color: C.green, route: '/log/mood' },
  { icon: '♧', title: 'Stress', label: 'Head', value: 'Low', color: C.green, route: '/orbi' },
  { icon: '♡', title: 'BP · not logged', label: 'Chest', value: '+ Log today', color: C.green, route: '/log/body' },
  { icon: '☼', title: 'Radiation*', label: 'Right arm', value: '0.48 mSv', color: C.gold, route: '/log/radiation' },
  { icon: '∿', title: 'Muscle', label: 'Left arm', value: '−2%', color: C.green, route: '/log/body' },
  { icon: '☾', title: 'Sleep · wrist band', label: 'Wrist', value: '5h 20m', color: C.gold, route: '/log/sleep' },
  { icon: '⌁', title: 'Exercise', label: 'Legs', value: '60 / 90 min', color: C.gold, route: '/log/exercise' },
  { icon: '⌁', title: 'Bone density', label: 'Legs', value: '−1.1%', color: C.green, route: '/log/body' },
];

export default function StatusScreen() {
  const desktop = useDesktopLayout();
  const { width } = useWindowDimensions();
  const compactDesktop = desktop && width < 1100;
  const { profile } = useCrewProfile();
  const [selectedDay, setSelectedDay] = useState('Today');
  const day = days.find((item) => item.label === selectedDay) ?? days[6];
  return <Screen>
    <Heading eyebrow={`${profile?.name || 'Ana'} · ${selectedDay === 'Today' ? 'Today, Day 12' : selectedDay} · synced 08:30`} title="Crew status" subtitle="A view of your health signals against your pre-mission baseline." action={<View style={styles.coins}><Text style={styles.coinIcon}>⊕</Text><Text style={styles.coinText}>1,250</Text></View>} />
    <View style={styles.summaryRow}>
      <Card style={[styles.overallCard, styles.summaryCard]}><View style={styles.gauge}><Text style={styles.scoreNumber}>{day.score}</Text><Text style={styles.scoreOf}>/ 100</Text></View><View style={styles.summaryText}><Text style={styles.summaryLabel}>Overall</Text><Text style={styles.stable}>● Stable</Text><Text style={styles.summarySub}>{day.logs} of 7 logs done</Text></View></Card>
      <Pressable accessibilityRole="button" onPress={() => router.push('/log/mood')} style={({ pressed }) => [styles.streakCard, styles.summaryCard, pressed && { opacity: 0.82 }]}>
        <View style={styles.streakTitleRow}><Text style={styles.streakCheck}>✓</Text><Text style={styles.streakTitle}>Daily check-in</Text></View>
        <Text style={styles.streakDetail}>+50 coins · 5-day streak</Text><View style={styles.streakDots}>{[0, 1, 2, 3, 4, 5, 6].map((dot) => <View key={dot} style={[styles.streakDot, dot < 5 && styles.streakDotDone]} />)}</View>
      </Pressable>
    </View>

    <View style={styles.dayHeading}><Text style={styles.sectionTitle}>Last 7 days · logs done</Text><Text style={styles.dayPrompt}>Tap a day</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
      {days.map((item) => <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: selectedDay === item.label }} onPress={() => setSelectedDay(item.label)} style={[styles.dayCard, selectedDay === item.label && styles.dayCardActive]}>
        <View style={styles.dayTrack}><View style={[styles.dayFill, { height: `${item.amount * 100}%`, backgroundColor: item.logs >= 5 ? C.green : C.gold }]} /></View><Text style={[styles.dayName, selectedDay === item.label && styles.dayNameActive]}>{item.label}</Text>
      </Pressable>)}
    </ScrollView>

    <Card style={styles.hologramCard}><View style={styles.bodyHeader}><View><Text style={styles.sectionTitle}>Body systems</Text><Text style={styles.bodySubtitle}>Tap a signal to open its log</Text></View><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>HOLOGRAM</Text></View></View>
      <View style={[styles.hologramStage, desktop && styles.hologramStageDesktop, compactDesktop && styles.hologramStageCompact]}>
        {desktop ? <>
          <View style={[styles.calloutColumn, compactDesktop && styles.calloutColumnCompact]}>{bodyAreas.slice(0, 4).map((item) => <BodyCallout key={item.title} item={item} side="left" />)}</View>
          <AstronautHologram desktop compact={compactDesktop} />
          <View style={[styles.calloutColumn, compactDesktop && styles.calloutColumnCompact]}>{bodyAreas.slice(4).map((item) => <BodyCallout key={item.title} item={item} side="right" />)}</View>
        </> : <>
          <View style={styles.mobileAstronaut}><AstronautHologram /></View>
          <View style={styles.mobileCallouts}>{bodyAreas.map((item) => <BodyCallout key={item.title} item={item} />)}</View>
        </>}
      </View>
      <View style={styles.legend}><Legend color={C.green} title="OK" /><Legend color={C.gold} title="Attention" /><Legend color={C.pink} title="Alert" /><Text style={styles.legendBaseline}>· vs. pre-mission baseline</Text></View>
      <Muted>*Illustrative demo reading. Crew health data is not a medical diagnosis.</Muted>
    </Card>

    <Card><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Health signals</Text><Muted>Mission day 12</Muted></View>
      {signals.map((item) => { const value = item.title === 'Blood pressure' ? profile?.bloodPressure || item.value : item.value; return <Pressable key={item.title} onPress={() => router.push(item.link as never)} style={styles.reading}><View style={[styles.icon, { backgroundColor: `${item.color}20` }]}><Text style={{ color: item.color, fontSize: 18 }}>{item.icon}</Text></View><Text style={styles.readingName}>{item.title}</Text><Text style={[styles.readingValue, { color: item.color }]}>{value}</Text></Pressable>; })}
    </Card>
    <Card><Text style={styles.sectionTitle}>Compared with pre-flight</Text><Muted>These trends help your medical team spot changes over time.</Muted><Trend label="Bone density" value="−1.1%" amount={0.35} color={C.green} /><Trend label="Aerobic fitness" value="−9%" amount={0.78} color={C.gold} /><Trend label="Muscle mass" value="−2%" amount={0.45} color={C.teal} /></Card>
    <Card style={{ borderColor: C.gold }}><Text style={styles.noticeTitle}>⚠ Keep an eye on sleep</Text><Muted>You logged less than 7 hours. Orbi can suggest a wind-down routine or you can message Mission Control.</Muted></Card>
  </Screen>;
}

function BodyCallout({ item, side }: { item: (typeof bodyAreas)[number]; side?: 'left' | 'right' }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.value}, ${item.label}`} onPress={() => router.push(item.route as never)} style={({ pressed }) => [styles.callout, side === 'left' && styles.calloutLeft, side === 'right' && styles.calloutRight, { borderColor: `${item.color}98` }, pressed && { opacity: 0.78 }]}>
    {side ? <View pointerEvents="none" style={[styles.connector, side === 'left' ? styles.connectorOut : styles.connectorIn, { backgroundColor: item.color }]} /> : null}
    <View style={styles.calloutTitleLine}><Text style={[styles.calloutIcon, { color: item.color }]}>{item.icon}</Text><Text numberOfLines={1} style={styles.calloutTitle}>{item.title}</Text></View>
    <Text style={[styles.calloutValue, { color: item.color }]}>{item.value}</Text><Text style={styles.calloutLabel}>{item.label}</Text>
  </Pressable>;
}

function Legend({ color, title }: { color: string; title: string }) { return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{title}</Text></View>; }
function Trend({ label, value, amount, color }: { label: string; value: string; amount: number; color: string }) { return <View style={styles.trend}><View style={styles.sectionHead}><Text style={styles.readingName}>{label}</Text><Text style={[styles.readingValue, { color }]}>{value}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, amount * 100)}%`, backgroundColor: color }]} /></View></View>; }

const styles = StyleSheet.create({
  coins: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 28, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, coinIcon: { color: C.gold, fontSize: 20 }, coinText: { color: C.text, fontSize: 15, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, summaryCard: { flexGrow: 1, flexBasis: 250, minHeight: 125, borderRadius: 22 }, overallCard: { flexDirection: 'row', alignItems: 'center', gap: 17, backgroundColor: '#1B1948' }, gauge: { width: 82, height: 76, borderTopWidth: 7, borderTopColor: C.green, borderLeftWidth: 5, borderLeftColor: C.green, borderRightWidth: 5, borderRightColor: C.purple, borderBottomWidth: 0, borderRadius: 48, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }, scoreNumber: { color: C.text, fontSize: 25, fontWeight: '900', transform: [{ rotate: '8deg' }] }, scoreOf: { color: C.muted, fontSize: 10, transform: [{ rotate: '8deg' }] }, summaryText: { gap: 4 }, summaryLabel: { color: C.muted, fontSize: 13 }, stable: { color: C.green, fontSize: 16, fontWeight: '900' }, summarySub: { color: C.muted, fontSize: 12 },
  streakCard: { justifyContent: 'center', backgroundColor: C.gold, borderColor: C.gold, gap: 7 }, streakTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, streakCheck: { color: '#382807', fontSize: 24, fontWeight: '900' }, streakTitle: { color: '#211A08', fontSize: 17, fontWeight: '900' }, streakDetail: { color: '#34280C', fontSize: 13, fontWeight: '700' }, streakDots: { flexDirection: 'row', gap: 7, marginTop: 1 }, streakDot: { width: 16, height: 16, borderRadius: 9, borderWidth: 2, borderColor: '#8A6B1B' }, streakDotDone: { backgroundColor: '#332707', borderColor: '#332707' },
  dayHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }, sectionTitle: { color: C.text, fontSize: 16, fontWeight: '800' }, dayPrompt: { color: C.muted, fontSize: 12 }, dayStrip: { flexDirection: 'row', gap: 8, paddingBottom: 2 }, dayCard: { width: 74, height: 95, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, dayCardActive: { borderColor: C.purple, borderWidth: 3, backgroundColor: '#211E53' }, dayTrack: { width: 11, height: 38, borderRadius: 7, backgroundColor: '#28265B', justifyContent: 'flex-end', overflow: 'hidden' }, dayFill: { width: '100%', borderRadius: 7 }, dayName: { color: C.text, fontSize: 11, fontWeight: '700' }, dayNameActive: { fontWeight: '900' },
  hologramCard: { padding: 0, overflow: 'hidden', gap: 0 }, bodyHeader: { padding: 17, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, bodySubtitle: { color: C.muted, fontSize: 11, marginTop: 4 }, livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: '#267963', borderRadius: 20, backgroundColor: '#0D282A' }, liveDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: C.green }, liveText: { color: C.green, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  hologramStage: { width: '100%', minHeight: 484, justifyContent: 'flex-start', alignItems: 'center', overflow: 'hidden', backgroundColor: '#080D22', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#17263C', paddingVertical: 12 }, hologramStageDesktop: { minHeight: 390, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#080D22' }, hologramStageCompact: { paddingHorizontal: 4 }, mobileAstronaut: { height: 452, alignItems: 'center', justifyContent: 'center' }, mobileCallouts: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 }, calloutColumn: { flex: 1, minWidth: 175, maxWidth: 280, height: 360, justifyContent: 'space-around', gap: 6 }, calloutColumnCompact: { minWidth: 130 },
  callout: { flexGrow: 1, flexBasis: '46%', minHeight: 69, backgroundColor: 'rgba(6,15,29,0.94)', borderWidth: 1, borderRadius: 13, padding: 9, justifyContent: 'center', gap: 3 }, calloutLeft: { borderTopRightRadius: 3, borderBottomRightRadius: 3, marginRight: 5 }, calloutRight: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3, marginLeft: 5 }, connector: { position: 'absolute', top: '50%', width: 48, height: 2, zIndex: 2 }, connectorOut: { right: -49 }, connectorIn: { left: -49 }, calloutTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, calloutIcon: { fontSize: 15 }, calloutTitle: { flex: 1, color: C.muted, fontSize: 11 }, calloutValue: { fontSize: 15, fontWeight: '900' }, calloutLabel: { color: C.muted, fontSize: 9 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 13, padding: 15 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 }, legendDot: { width: 11, height: 11, borderRadius: 6 }, legendText: { color: C.muted, fontSize: 11 }, legendBaseline: { color: C.muted, fontSize: 10 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, reading: { flexDirection: 'row', alignItems: 'center', minHeight: 54, gap: 10, borderTopWidth: 1, borderTopColor: C.border }, icon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, readingName: { color: C.text, fontWeight: '600', fontSize: 13, flex: 1 }, readingValue: { fontWeight: '800', fontSize: 12 }, trend: { gap: 8 }, track: { height: 8, borderRadius: 5, backgroundColor: C.track, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 5 }, noticeTitle: { color: C.gold, fontWeight: '800', fontSize: 15 },
});
