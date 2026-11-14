import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Astronaut, OrbiDrone } from '@/components/Astronaut';
import { LogStateButton, PrimaryButton, RewardChip, SecondaryButton } from '@/components/Buttons';
import { Card, CardTitle, InfoNote, StatTile } from '@/components/Card';
import { Gauge, ProgressBar, Ring, TrendLine, WeekBars } from '@/components/Charts';
import { ChatBubble } from '@/components/ChatBubble';
import { Header } from '@/components/Header';
import { Callout, CalloutLines, DayScrubber, HologramBody, type CalloutSpec } from '@/components/Hologram';
import { Icon, iconNames } from '@/components/Icon';
import { Chip, Field, Rating, Segmented, Toggle } from '@/components/Inputs';
import { LogMenu } from '@/components/LogMenu';
import { MoodFace, MoodSlider } from '@/components/Mood';
import { Badge, CoinsPill, Legend, StatusDot, TodayChip } from '@/components/Pills';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import type { Areas } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card gap={12}>
      <CardTitle title={title} />
      {children}
    </Card>
  );
}

const AREAS: Areas = { head: 'ok', torso: 'ok', armL: 'alert', armR: 'warn', legL: 'warn', legR: 'ok' };
const CALLOUTS: CalloutSpec[] = [
  { side: 'left', slot: 0, point: 'headL', icon: 'smile', label: 'Mood', value: 'Good', level: 'ok' },
  { side: 'left', slot: 3, point: 'legL', icon: 'activity', label: 'Exercise', value: '60 / 90 min', level: 'warn' },
  { side: 'right', slot: 2, point: 'wristR', icon: 'moon', label: 'Sleep · wrist', value: '5h 20m', level: 'warn' },
];

/** Dev catalogue of every shared component (COMPONENTS.md). */
export default function ComponentsScreen() {
  const [logged, setLogged] = useState(false);
  const [chip, setChip] = useState(true);
  const [seg, setSeg] = useState('Week');
  const [rate, setRate] = useState<number | null>(3);
  const [mood, setMood] = useState(3);
  const [day, setDay] = useState(12);
  const [menu, setMenu] = useState(true);
  const [sw, setSw] = useState(true);
  const [walk, setWalk] = useState(true);

  return (
    <Screen header={<Header title="Components" />} padded gap={14}>
      <Section title="Buttons">
        <PrimaryButton label="Primary action" reward={10} onPress={() => {}} />
        <PrimaryButton label="Daily check-in" tone="gold" icon="check" onPress={() => {}} />
        <SecondaryButton label="Secondary" icon="calendar" onPress={() => {}} />
        <View style={styles.row}>
          <RewardChip />
          <CoinsPill amount={1250} />
        </View>
        <LogStateButton logged={logged} onLog={() => setLogged(true)} onEdit={() => setLogged(false)} />
      </Section>

      <Section title="Chips · Segmented · Toggle">
        <View style={styles.wrap}>
          <Chip label="Selected" selected={chip} onPress={() => setChip(!chip)} />
          <Chip label="Chip" />
          <Chip label="Mood tag" tone="primary" selected />
          <Chip label="Logged" disabled />
          <Toggle value={sw} onChange={setSw} label="Reminders" />
        </View>
        <Segmented items={['Week', 'Month', 'Mission'] as const} selected={seg as 'Week'} onChange={setSeg} />
      </Section>

      <Section title="Fields · Rating">
        <Field label="Input" value="Value" unit="unit" onChangeText={() => {}} />
        <Field label="Read-only" value="Orbit-3 · low Earth orbit" readOnly />
        <Rating value={rate} onChange={setRate} minLabel="Exhausted" maxLabel="Fully rested" />
      </Section>

      <Section title="Cards">
        <View style={styles.row}>
          <StatTile value="3.6 / 5" label="Average" />
          <StatTile value="Wed" label="Best day" />
        </View>
        <InfoNote>
          <Txt weight="700" size={13}>
            Orbi:{' '}
          </Txt>
          your mood dips after nights with low light exposure.
        </InfoNote>
      </Section>

      <Section title="Charts">
        <WeekBars
          values={[7.1, 6.5, 5.9, 6.6, 6.2, 5.7, 5.3]}
          labels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
          max={9}
          target={7}
          targetLabel="target 7h"
          todayIndex={6}
          colorFor={(v) => (v >= 7 ? C.primary : C.warning)}
        />
        <TrendLine points={[100, 99, 97, 95, 91]} threshold={90} min={88} max={101} color={C.warning} />
        <View style={styles.row}>
          <Ring value={3} max={7} label="3/7" />
          <Ring value={60} max={90} size={64} stroke={7} label="60" labelSize={16} />
          <Gauge score={72} />
          <ProgressBar value={0.4} width={60} />
        </View>
      </Section>

      <Section title="Mood">
        <View style={styles.row}>
          {[5, 4, 3, 2, 1].map((l) => (
            <MoodFace key={l} level={l} size={36} />
          ))}
        </View>
        <MoodSlider value={mood} onChange={setMood} />
      </Section>

      <Section title="Status">
        <View style={styles.row}>
          <StatusDot state="ok" />
          <StatusDot state="warn" />
          <StatusDot state="alert" />
          <TodayChip state="warn" label="Healing" />
          <TodayChip state="muted" label="Resolved" />
          <Badge label="Coming soon" />
        </View>
        <Legend note="· vs. baseline" />
      </Section>

      <Section title="Hologram · Callout · DayScrubber">
        <DayScrubber
          days={[6, 7, 8, 9, 10, 11, 12].map((d, i) => ({ day: d, label: d === 12 ? 'Today' : `D${d}`, done: [6, 5, 6, 4, 3, 6, 3][i], total: 7 }))}
          selected={day}
          onSelect={setDay}
        />
        <View style={styles.stageWrap}>
          <View style={styles.stage}>
            <View style={{ position: 'absolute', left: 130, top: 22 }}>
              <HologramBody areas={AREAS} />
            </View>
            <CalloutLines callouts={CALLOUTS} />
            {CALLOUTS.map((c, i) => (
              <Callout key={i} {...c} />
            ))}
          </View>
        </View>
      </Section>

      <Section title="LogMenu">
        <SecondaryButton label={menu ? 'Close menu' : 'Open menu'} compact onPress={() => setMenu(!menu)} />
        <LogMenu
          open={menu}
          items={[
            { key: 'mood', label: 'Mood check-in', icon: 'smile', href: '/logs/mood', state: 'done' },
            { key: 'meals', label: 'Meals', icon: 'utensils', href: '/logs/meals', state: 'todo' },
            { key: 'relax', label: 'Relax', icon: 'leaf', href: '/logs/relax', state: 'soon' },
          ]}
        />
      </Section>

      <Section title="Astronaut · OrbiDrone">
        <View style={[styles.row, { alignItems: 'flex-end' }]}>
          <Astronaut state={walk ? 'walking' : 'idle'} />
          <OrbiDrone />
        </View>
        <Chip label={walk ? 'Walking' : 'Idle'} selected onPress={() => setWalk(!walk)} />
      </Section>

      <Section title="ChatBubble">
        <ChatBubble author="other" text="Maintenance will check that fan tomorrow." meta="Mission Control · arrived 07:40" />
        <ChatBubble author="me" text="Thanks!" meta="Delivered 20:02" metaColor={C.holoOk} metaIcon="check" />
        <ChatBubble author="me" text="Can I book a call?" progress={0.55} meta="In transit · arrives ~10:34" metaColor={C.gold} metaIcon="clock" />
      </Section>

      <Section title={`Icons (${iconNames.length})`}>
        <View style={styles.wrap}>
          {iconNames.map((n) => (
            <View key={n} style={styles.icon}>
              <Icon name={n} size={22} color={C.primary} />
              <Txt size={tokens.font.size.tiny} color={C.muted} numberOfLines={1}>
                {n}
              </Txt>
            </View>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  stageWrap: { marginHorizontal: -14, alignItems: 'center', overflow: 'hidden' },
  stage: { width: 390, height: 372 },
  icon: { width: 70, alignItems: 'center', gap: 4 },
});
