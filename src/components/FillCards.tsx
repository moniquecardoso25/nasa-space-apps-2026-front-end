import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { draftSleepMinutes, type DraftMap, type FillCategory } from '@/data/orbiParser';
import { MOOD_TAGS } from '@/data/derived';
import { formatDuration, maskTime } from '@/data/format';
import { FILL_LABEL } from '@/data/fill';
import { C, X, tokens } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Chip, Field, Rating } from './Inputs';
import { ChipRow, Stars, Stepper } from './LogKit';
import { MOOD_LEVELS, MoodFace, MoodSlider } from './Mood';
import { Txt } from './Txt';

const ICON: Record<FillCategory, IconName> = {
  mood: 'smile',
  sleep: 'moon',
  radiation: 'radiation',
  body: 'heart',
  meal: 'utensils',
  exercise: 'activity',
};

type CardProps<C extends FillCategory> = {
  category: C;
  draft: DraftMap[C];
  assumed: string[];
  onChange: (d: DraftMap[C]) => void;
  onRemove: () => void;
  /** Mood only: start with the vertical slider open. */
  initialSlider?: boolean;
  /** Where the values came from ("Wrist band · demo"), shown under the title. */
  source?: string;
  /** Custom body (plan cards: meals / training to confirm). */
  children?: React.ReactNode;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const num = (t: string, max = 999) => Math.min(max, Number(t.replace(/[^\d.]/g, '')) || 0);

/** Editable confirmation card for one parsed answer. */
export function DraftCard<C extends FillCategory>({ category, draft, assumed, onChange, onRemove, initialSlider, source, children }: CardProps<C>) {
  const [slider, setSlider] = useState(!!initialSlider);
  const set = (patch: object) => onChange({ ...draft, ...patch } as DraftMap[C]);

  let body: React.ReactNode = null;
  if (children) {
    body = children;
  } else if (category === 'mood') {
    const d = draft as DraftMap['mood'];
    body = (
      <>
        <View style={styles.faces}>
          {MOOD_LEVELS.map((m) => (
            <Pressable
              key={m.level}
              accessibilityRole="button"
              accessibilityLabel={m.title}
              accessibilityState={{ selected: d.level === m.level }}
              onPress={() => set({ level: m.level })}
              style={[styles.face, d.level === m.level && styles.faceOn]}>
              <MoodFace level={m.level} size={30} />
            </Pressable>
          ))}
        </View>
        <Txt size={tokens.font.size.caption} color={C.muted} align="center">
          {MOOD_LEVELS.find((m) => m.level === d.level)?.title}
        </Txt>
        <ChipRow>
          {MOOD_TAGS.map((t) => (
            <Chip
              key={t}
              tone="primary"
              label={cap(t)}
              selected={d.tags.includes(t)}
              onPress={() => set({ tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] })}
            />
          ))}
        </ChipRow>
        <Pressable accessibilityRole="button" onPress={() => setSlider(!slider)} style={styles.link}>
          <Txt weight="700" size={tokens.font.size.caption} color={C.primary}>
            {slider ? 'Hide the slider' : 'Use the slider instead'}
          </Txt>
        </Pressable>
        {slider ? (
          <View style={{ marginHorizontal: -14 }}>
            <MoodSlider value={d.level} onChange={(level) => set({ level })} />
          </View>
        ) : null}
      </>
    );
  } else if (category === 'sleep') {
    const d = draft as DraftMap['sleep'];
    body = (
      <>
        <View style={styles.row}>
          <Field label="Went to bed" value={d.bed} onChangeText={(t) => set({ bed: maskTime(t) })} style={styles.flex} />
          <Field label="Woke up" value={d.wake} onChangeText={(t) => set({ wake: maskTime(t) })} style={styles.flex} />
        </View>
        <Txt size={tokens.font.size.small} color={C.muted}>
          Total{' '}
          <Txt weight="700" size={tokens.font.size.small}>
            {formatDuration(draftSleepMinutes(d))}
          </Txt>
        </Txt>
        <Rating value={d.quality} onChange={(q) => set({ quality: q })} minLabel="Exhausted" maxLabel="Fully rested" />
        <ChipRow>
          {(['none', '1-2', '3+'] as const).map((w) => (
            <Chip key={w} label={w === 'none' ? 'No wake-ups' : w === '1-2' ? 'Woke 1–2×' : 'Woke 3+×'} selected={d.wakeUps === w} onPress={() => set({ wakeUps: w })} />
          ))}
        </ChipRow>
      </>
    );
  } else if (category === 'radiation') {
    const d = draft as DraftMap['radiation'];
    body = (
      <>
        <View style={styles.row}>
          <Field label="Value" value={String(d.value)} onChangeText={(t) => set({ value: num(t, 99999) })} keyboardType="decimal-pad" style={styles.flex} />
          <Field label="Read at" value={d.readAt} onChangeText={(t) => set({ readAt: maskTime(t) })} style={styles.flex} />
        </View>
        <ChipRow>
          <Chip label="µSv" selected={d.unit === 'uSv'} onPress={() => set({ unit: 'uSv' })} />
          <Chip label="mSv" selected={d.unit === 'mSv'} onPress={() => set({ unit: 'mSv' })} />
          <Chip label="Personal" selected={d.source === 'personal'} onPress={() => set({ source: 'personal' })} />
          <Chip label="Area" selected={d.source === 'area'} onPress={() => set({ source: 'area' })} />
        </ChipRow>
      </>
    );
  } else if (category === 'body') {
    const d = draft as DraftMap['body'];
    body = (
      <View style={styles.row}>
        <Field label="Systolic" value={String(d.systolic)} onChangeText={(t) => set({ systolic: num(t, 300) })} keyboardType="number-pad" style={styles.flex} />
        <Field label="Diastolic" value={String(d.diastolic)} onChangeText={(t) => set({ diastolic: num(t, 200) })} keyboardType="number-pad" style={styles.flex} />
        <Field label="Pulse" value={String(d.pulse)} onChangeText={(t) => set({ pulse: num(t, 250) })} keyboardType="number-pad" style={styles.flex} />
      </View>
    );
  } else if (category === 'meal') {
    const d = draft as DraftMap['meal'];
    body = (
      <>
        <Field label="What you ate" value={d.name} onChangeText={(t) => set({ name: t })} />
        <View style={styles.row}>
          <Field label="Calories" value={String(d.kcal)} unit="kcal" onChangeText={(t) => set({ kcal: num(t, 5000) })} keyboardType="number-pad" style={styles.flex} />
          <Field label="Time" value={d.time} onChangeText={(t) => set({ time: maskTime(t) })} style={styles.flex} />
        </View>
        <Stars value={d.taste} onChange={(v) => set({ taste: v })} size={26} gap={0} />
      </>
    );
  } else {
    const d = draft as DraftMap['exercise'];
    body = (
      <>
        <ChipRow>
          {(
            [
              ['resistive_device', 'Resistive device', 'resistive'],
              ['treadmill', 'Treadmill', 'aerobic'],
              ['cycle', 'Cycle', 'aerobic'],
            ] as const
          ).map(([eq, label, modality]) => (
            <Chip key={eq} label={label} selected={d.equipment === eq} onPress={() => set({ equipment: eq, modality })} />
          ))}
        </ChipRow>
        <Stepper value={d.minutes} onChange={(m) => set({ minutes: m })} />
        <Rating value={d.effort} onChange={(e) => set({ effort: e })} minLabel="Very easy" maxLabel="Max effort" />
      </>
    );
  }

  return (
    <View style={styles.card} accessibilityLabel={`${FILL_LABEL[category]} draft, check before saving`}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon name={ICON[category]} size={16} color={C.teal} />
        </View>
        <Txt weight="700" size={tokens.ext.fontSize.label} style={{ flex: 1 }}>
          {FILL_LABEL[category]} · check
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${FILL_LABEL[category]}`} onPress={onRemove} hitSlop={8}>
          <Txt weight="600" size={tokens.font.size.caption} color={C.muted}>
            Remove
          </Txt>
        </Pressable>
      </View>
      {source ? (
        <Txt size={tokens.font.size.tiny} color={C.teal}>
          {source}
        </Txt>
      ) : null}
      {assumed.length ? (
        <Txt size={tokens.font.size.tiny} color={C.gold}>
          Orbi guessed: {assumed.join(', ')}. Please check.
        </Txt>
      ) : null}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    gap: 10,
    padding: 14,
    borderRadius: tokens.radius.card,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.teal,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 28, height: 28, borderRadius: 14, backgroundColor: X.tealSoft, alignItems: 'center', justifyContent: 'center' },
  faces: { flexDirection: 'row', justifyContent: 'space-between' },
  face: { padding: 4, borderRadius: tokens.radius.pill, borderWidth: 2, borderColor: 'transparent' },
  faceOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  link: { alignSelf: 'flex-start', minHeight: 28, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
