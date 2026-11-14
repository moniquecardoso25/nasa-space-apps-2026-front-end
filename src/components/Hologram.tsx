import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Polyline, Rect } from 'react-native-svg';

import type { Areas, BodyArea, Level } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { levelColor } from './Pills';
import { Txt } from './Txt';

/** Size of the hologram stage in the design (AppStatus). */
export const STAGE_W = 390;
export const STAGE_H = 372;

/**
 * Outline astronaut. Each body part is stroked by its level color.
 * Viewer's right = armR / legR (matches AppStatus + mock areas).
 */
export function HologramBody({ areas }: { areas: Areas }) {
  const g = (a: BodyArea) => {
    const c = levelColor(areas[a]);
    return { stroke: c, fill: c, fillOpacity: 0.07, strokeWidth: 2 };
  };
  return (
    <Svg width={130} height={330} viewBox="0 0 130 330" accessibilityLabel="Hologram of your body, colored by condition">
      <G {...g('torso')}>
        <Rect x={25} y={86} width={80} height={80} rx={14} strokeDasharray="4 4" />
        <Rect x={33} y={82} width={64} height={96} rx={18} />
        <Rect x={47} y={100} width={36} height={24} rx={4} />
        <Rect x={80} y={134} width={10} height={13} rx={2} />
        <Rect x={33} y={168} width={64} height={14} rx={4} />
        <Path d="M50 140h30M50 150h30" strokeOpacity={0.5} />
      </G>
      <G {...g('armL')}>
        <Rect x={13} y={88} width={20} height={86} rx={10} />
        <Circle cx={23} cy={184} r={10} />
        <Path d="M13 112h20" strokeOpacity={0.6} />
      </G>
      <G {...g('armR')}>
        <Rect x={97} y={88} width={20} height={86} rx={10} />
        <Circle cx={107} cy={184} r={10} />
        <Rect x={95} y={160} width={24} height={9} rx={3} fillOpacity={0.5} />
      </G>
      <G {...g('legL')}>
        <Rect x={37} y={180} width={26} height={112} rx={12} />
        <Rect x={40} y={230} width={20} height={12} rx={4} />
        <Rect x={33} y={286} width={32} height={22} rx={8} />
      </G>
      <G {...g('legR')}>
        <Rect x={67} y={180} width={26} height={112} rx={12} />
        <Rect x={70} y={230} width={20} height={12} rx={4} />
        <Rect x={65} y={286} width={32} height={22} rx={8} />
      </G>
      <G {...g('head')}>
        <Circle cx={65} cy={48} r={34} />
        <Rect x={41} y={34} width={48} height={30} rx={14} />
        <Path d="M48 42q8-6 18-5" fill="none" />
      </G>
    </Svg>
  );
}

/** Body points (stage coordinates) that callouts link to. */
export const BODY_POINTS = {
  headL: { x: 163, y: 88 },
  headR: { x: 228, y: 88 },
  chestL: { x: 176, y: 168 },
  chestR: { x: 215, y: 178 },
  armL: { x: 150, y: 200 },
  wristR: { x: 248, y: 205 },
  legL: { x: 180, y: 300 },
  legR: { x: 220, y: 300 },
  // injury anchor points (hologram coordinates + stage offset 130, 22)
  injHead: { x: 195, y: 62 },
  injTorso: { x: 195, y: 160 },
  injArmL: { x: 153, y: 206 },
  injArmR: { x: 237, y: 206 },
  injLegL: { x: 180, y: 262 },
  injLegR: { x: 210, y: 262 },
} as const;
export type BodyPoint = keyof typeof BODY_POINTS;

/** The 4 callout slots per side in AppStatus, plus extra rows below for injuries. */
export const CALLOUT_SLOTS = [26, 118, 210, 302, 394, 486];

export type CalloutSpec = {
  side: 'left' | 'right';
  slot: number; // 0..3
  point: BodyPoint;
  icon: IconName;
  label: string;
  value: string;
  level: Level;
  onPress?: () => void;
};

/** Lines from callouts to body points (drawn behind callouts). */
export function CalloutLines({ callouts, height = STAGE_H }: { callouts: CalloutSpec[]; height?: number }) {
  return (
    <Svg width={STAGE_W} height={height + 8} viewBox={`0 0 390 ${height + 8}`} style={{ position: 'absolute', left: 0, top: -8 }} pointerEvents="none">
      {callouts.map((c, i) => {
        const y = CALLOUT_SLOTS[c.slot] + 28 + 8 - 8; // middle of the box (svg is shifted -8)
        const ex = c.side === 'left' ? 128 : 262;
        const mx = c.side === 'left' ? 142 : 248;
        const p = BODY_POINTS[c.point];
        const col = levelColor(c.level);
        // Injury rows sit below the body: route the line up along the side, then in.
        const path = c.slot > 3 ? `${ex},${y} ${mx},${y} ${mx},${p.y} ${p.x},${p.y}` : `${ex},${y} ${mx},${y} ${p.x},${p.y}`;
        return (
          <G key={i}>
            <Polyline points={path} fill="none" stroke={col} strokeWidth={1.5} strokeOpacity={0.8} strokeDasharray={c.slot > 3 ? '4 3' : undefined} />
            <Circle cx={p.x} cy={p.y} r={4} fill={col} />
            <Circle cx={p.x} cy={p.y} r={9} fill={col} fillOpacity={0.22} />
          </G>
        );
      })}
    </Svg>
  );
}

/** 120×56 box linked by a line to a body point. */
export function Callout({ side, slot, icon, label, value, level, onPress }: CalloutSpec) {
  const hot = level !== 'ok';
  const col = levelColor(level);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={[
        styles.callout,
        { top: CALLOUT_SLOTS[slot], left: side === 'left' ? 8 : 262 },
        hot && { backgroundColor: X.calloutBgHot, borderColor: col, boxShadow: `0 0 14px ${col}55` },
      ]}>
      <View style={styles.calloutTop}>
        <Icon name={icon} size={14} color={col} />
        <Txt size={tokens.font.size.tiny} color={C.muted} numberOfLines={2} lh={1.2} style={{ flex: 1 }}>
          {label}
        </Txt>
      </View>
      <Txt weight="700" size={tokens.font.size.body} color={hot ? col : C.text} numberOfLines={1}>
        {value}
      </Txt>
    </Pressable>
  );
}

// ------------------------------------------------------------------ DayScrubber

export type ScrubDay = { day: number; label: string; done: number; total: number };

/** 7 buttons with a vertical fill bar = logs done. */
export function DayScrubber({ days, selected, onSelect }: { days: ScrubDay[]; selected: number; onSelect: (day: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {days.map((d) => {
        const on = d.day === selected;
        const full = d.done >= d.total - 1; // Relax is "coming soon": 6/7 counts as complete
        return (
          <Pressable
            key={d.day}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Day ${d.day}, ${d.done} of ${d.total} logs`}
            onPress={() => onSelect(d.day)}
            style={[styles.day, on && styles.dayOn]}>
            <View style={styles.dayTrack}>
              <View
                style={{
                  width: 6,
                  height: Math.round((d.done / d.total) * 26),
                  borderRadius: tokens.radius.pill,
                  backgroundColor: full ? C.holoOk : C.holoWarn,
                }}
              />
            </View>
            <Txt size={tokens.font.size.tiny} weight={on ? '700' : '500'}>
              {d.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export { levelColor };
export type { Level };

const styles = StyleSheet.create({
  callout: {
    position: 'absolute',
    width: 120,
    minHeight: 56,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.small,
    backgroundColor: X.calloutBg,
    borderWidth: 1,
    borderColor: X.holoBorder,
    gap: 2,
  },
  calloutTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  day: {
    flex: 1,
    minHeight: 58,
    borderRadius: tokens.radius.small,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 6,
  },
  dayOn: { backgroundColor: X.selectedDay, borderWidth: 2, borderColor: C.primary },
  dayTrack: { width: 6, height: 26, borderRadius: tokens.radius.pill, backgroundColor: C.track, justifyContent: 'flex-end' },
});
