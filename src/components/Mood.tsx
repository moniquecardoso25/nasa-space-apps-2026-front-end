import { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { MoodLabel } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';

import { Txt } from './Txt';

export const MOOD_LEVELS: { level: 1 | 2 | 3 | 4 | 5; label: MoodLabel; title: string }[] = [
  { level: 5, label: 'great', title: 'Great' },
  { level: 4, label: 'good', title: 'Good' },
  { level: 3, label: 'okay', title: 'Okay' },
  { level: 2, label: 'tired', title: 'Tired' },
  { level: 1, label: 'stressed', title: 'Stressed' },
];

export const moodColor = (level: number) =>
  C.mood[(MOOD_LEVELS.find((m) => m.level === Math.round(level))?.label ?? 'okay') as MoodLabel];

/** SVG face from the design: great / good / okay / tired / stressed. */
export function MoodFace({ level, size = 24 }: { level: number; size?: number }) {
  const lv = Math.max(1, Math.min(5, Math.round(level)));
  const c = moodColor(lv);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9.5} fill={c} fillOpacity={0.14} />
      {lv === 5 && (
        <>
          <Circle cx={9.2} cy={10} r={1.1} fill={c} />
          <Circle cx={14.8} cy={10} r={1.1} fill={c} />
          <Path d="M8 13.5q4 5 8 0z" fill={c} />
        </>
      )}
      {lv === 4 && (
        <>
          <Circle cx={9.2} cy={10} r={1.1} fill={c} />
          <Circle cx={14.8} cy={10} r={1.1} fill={c} />
          <Path d="M8 14q4 3.5 8 0" />
        </>
      )}
      {lv === 3 && (
        <>
          <Circle cx={9.2} cy={10} r={1.1} fill={c} />
          <Circle cx={14.8} cy={10} r={1.1} fill={c} />
          <Path d="M8.5 15h7" />
        </>
      )}
      {lv === 2 && (
        <>
          <Path d="M8 10.5q1.2-1 2.4 0M13.6 10.5q1.2-1 2.4 0" />
          <Path d="M9 15.5q3-1.5 6 0" />
        </>
      )}
      {lv === 1 && (
        <>
          <Path d="M7.5 8l2.5 1.2M16.5 8L14 9.2" />
          <Circle cx={9.2} cy={11} r={0.9} fill={c} />
          <Circle cx={14.8} cy={11} r={0.9} fill={c} />
          <Path d="M8 16.5q4-3.5 8 0" />
        </>
      )}
    </Svg>
  );
}

// ------------------------------------------------------------------ MoodSlider

const H = 380; // slider area height (AppMoodAdd)
const TOP = 38; // center of first row
const STEP = 76; // distance between rows

type SliderProps = { value: number; onChange: (level: 1 | 2 | 3 | 4 | 5) => void };

/**
 * Vertical drag slider: labels left, faces right, thumb on a track.
 * Index 0 = Great (level 5) at the top … index 4 = Stressed (level 1).
 * Uses the responder system so it works with touch, mouse and pen.
 */
export function MoodSlider({ value, onChange }: SliderProps) {
  const [w, setW] = useState(362);
  const idx = MOOD_LEVELS.findIndex((m) => m.level === value);
  const sel = idx < 0 ? 2 : idx;
  const center = w / 2;
  const thumbC = TOP + sel * STEP;
  const last = useRef(sel);

  const pick = (e: GestureResponderEvent) => {
    const y = e.nativeEvent.locationY;
    const i = Math.max(0, Math.min(4, Math.round((y - TOP) / STEP)));
    if (i !== last.current) {
      last.current = i;
      onChange(MOOD_LEVELS[i].level);
    }
  };

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Mood"
      accessibilityValue={{ text: MOOD_LEVELS[sel].title }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const i = e.nativeEvent.actionName === 'increment' ? Math.max(0, sel - 1) : Math.min(4, sel + 1);
        onChange(MOOD_LEVELS[i].level);
      }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        last.current = -1;
        pick(e);
      }}
      onResponderMove={pick}
      style={[styles.slider, { userSelect: 'none', touchAction: 'none' } as object]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.track, { left: center - 5 }]} />
        <View style={[styles.fill, { left: center - 5, top: thumbC, height: TOP + 4 * STEP - thumbC }]} />
        {MOOD_LEVELS.map((m, i) => {
          const on = i === sel;
          return (
            <View key={m.label} style={[styles.row, { top: TOP + i * STEP - 28 }]}>
              <Txt
                size={tokens.font.size.screenTitle}
                weight={on ? '700' : '500'}
                color={on ? C.primary : C.muted}
                style={[styles.label, { right: w - center + 47 }]}>
                {m.title}
              </Txt>
              <View style={[styles.face, { left: center + 65, opacity: on ? 1 : 0.55, transform: [{ scale: on ? 1.12 : 1 }] }]}>
                <MoodFace level={m.level} size={52} />
              </View>
            </View>
          );
        })}
        <View style={[styles.thumb, { left: center - 16, top: thumbC - 16 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slider: { height: H, marginHorizontal: 14 },
  track: { position: 'absolute', top: TOP, width: 10, height: 4 * STEP, borderRadius: tokens.radius.pill, backgroundColor: C.track },
  fill: {
    position: 'absolute',
    width: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: C.primary,
    boxShadow: `0 0 14px ${C.primary}`,
  },
  row: { position: 'absolute', left: 0, right: 0, height: 56 },
  label: { position: 'absolute', top: 0, height: 56, lineHeight: 56 },
  face: { position: 'absolute', top: 2 },
  thumb: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: X.white,
    borderWidth: 3,
    borderColor: C.primary,
    boxShadow: `0 0 0 6px ${C.primarySoft}`,
  },
});
