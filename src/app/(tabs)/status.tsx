import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, Line, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';

import { Gauge } from '@/components/Charts';
import {
  Callout,
  CalloutLines,
  DayScrubber,
  HologramBody,
  STAGE_H,
  STAGE_W,
  type CalloutSpec,
} from '@/components/Hologram';
import { Icon } from '@/components/Icon';
import { CoinsPill, Legend, levelColor } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { firstName, getAstronaut, getCheckinStreak, getDailySummary, getToday, isLoggedToday, overallLabel } from '@/data/api';
import { dayVitals, lastSyncIso } from '@/data/derived';
import { hhmm } from '@/data/format';
import { useData } from '@/data/store';
import type { Level } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';

/** Grid + beam + scanlines + platform behind the hologram. */
function HoloBackdrop() {
  const lines = Array.from({ length: 85 }, (_, i) => i * 4);
  return (
    <>
      <Svg width={STAGE_W} height={STAGE_H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="grid" width={22} height={22} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0} x2={22} y2={0} stroke={X.holoGrid} strokeWidth={1} />
            <Line x1={0} y1={0} x2={0} y2={22} stroke={X.holoGrid} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width={STAGE_W} height={STAGE_H} fill="url(#grid)" />
      </Svg>
      <View pointerEvents="none" style={styles.platform}>
        <Svg width={174} height={32}>
          <Ellipse cx={87} cy={16} rx={85} ry={14} fill={X.holoFill} stroke={C.holoOk} strokeWidth={2} />
        </Svg>
      </View>
      <Svg width={130} height={330} style={styles.beam} pointerEvents="none">
        <Defs>
          <LinearGradient id="beam" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={C.holoOk} stopOpacity={0.16} />
            <Stop offset="1" stopColor={C.holoOk} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={130} height={330} fill="url(#beam)" />
      </Svg>
    </>
  );
}

function Scanlines() {
  return (
    <Svg width={150} height={340} style={styles.scan} pointerEvents="none">
      {Array.from({ length: 85 }, (_, i) => (
        <Rect key={i} x={0} y={i * 4} width={150} height={1} fill={X.scanline} />
      ))}
    </Svg>
  );
}

/** Hologram floats and flickers a little (static with reduced motion). */
function FloatingHolo({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    const ease = Easing.inOut(Easing.ease);
    y.value = withRepeat(withSequence(withTiming(-5, { duration: 2000, easing: ease }), withTiming(0, { duration: 2000, easing: ease })), -1);
    o.value = withRepeat(withSequence(withTiming(1, { duration: 3700 }), withTiming(0.75, { duration: 80 }), withTiming(1, { duration: 80 })), -1);
    return () => {
      cancelAnimation(y);
      cancelAnimation(o);
    };
  }, [reduced, y, o]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: o.value }));
  return <Animated.View style={[styles.holo, style]}>{children}</Animated.View>;
}

export default function Status() {
  const insets = useSafeAreaInsets();
  const today = useData(() => getToday());
  const [sel, setSel] = useState(today);

  const d = useData(() => {
    const days = Array.from({ length: 7 }, (_, i) => today - 6 + i).filter((x) => x >= 1);
    return {
      me: getAstronaut(),
      summary: getDailySummary(sel),
      days: days.map((day) => {
        const s = getDailySummary(day);
        return { day, label: day === today ? 'Today' : `D${day}`, done: s.logsDoneCount, total: s.logsTotal };
      }),
      vitals: dayVitals(sel),
      streak: getCheckinStreak(),
      checkedIn: isLoggedToday('mood'),
      sync: lastSyncIso(sel),
    };
  }, [sel, today]);

  const { me, summary, vitals } = d;
  const label = overallLabel(summary.overallScore);
  const lvl: Level = label === 'Stable' ? 'ok' : label === 'Attention' ? 'warn' : 'alert';
  const isToday = sel === today;
  const dayLabel = isToday ? `Today, Day ${sel}${d.sync ? ` · synced ${hhmm(d.sync)}` : ''}` : `Day ${sel} · past day`;
  const go = (href: string) => () => router.push(href as never);
  const dots = d.streak % 7 === 0 && d.streak > 0 ? 7 : d.streak % 7;

  const callouts: CalloutSpec[] = [
    { side: 'left', slot: 0, point: 'headL', icon: 'smile', ...pick(vitals.mood, 'Mood'), onPress: go(vitals.mood.pending ? '/logs/mood/add' : '/logs/mood') },
    { side: 'left', slot: 1, point: 'chestL', icon: 'heart', ...pick(vitals.bp, 'BP'), onPress: go(vitals.bp.pending ? '/logs/body/add' : '/logs/body') },
    { side: 'left', slot: 2, point: 'armL', icon: 'muscle', ...pick(vitals.muscle, 'Muscle'), onPress: go('/logs/body') },
    { side: 'left', slot: 3, point: 'legL', icon: 'activity', ...pick(vitals.exercise, 'Exercise'), onPress: go(vitals.exercise.pending ? '/logs/exercise/add' : '/logs/exercise') },
    { side: 'right', slot: 0, point: 'headR', icon: 'brain', ...pick(vitals.stress, 'Stress'), onPress: go('/logs/mood') },
    { side: 'right', slot: 1, point: 'chestR', icon: 'radiation', ...pick(vitals.radiation, 'Radiation*'), onPress: go(vitals.radiation.pending ? '/logs/radiation/add' : '/logs/radiation') },
    { side: 'right', slot: 2, point: 'wristR', icon: 'moon', ...pick(vitals.sleep, 'Sleep · wrist'), onPress: go(vitals.sleep.pending ? '/logs/sleep/add' : '/logs/sleep') },
    { side: 'right', slot: 3, point: 'legR', icon: 'bone', ...pick(vitals.bone, 'Bone density'), onPress: go('/logs/body') },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.header}>
          <View style={{ gap: 2, flex: 1 }}>
            <Txt heading weight="700" size={tokens.font.size.title} accessibilityRole="header">
              Crew status
            </Txt>
            <Txt size={tokens.font.size.small} color={C.muted}>
              {firstName(me)} · {dayLabel}
            </Txt>
          </View>
          <CoinsPill amount={me.avatar.coins} />
        </View>

        <View style={styles.cards}>
          <View style={styles.overall}>
            <Gauge score={summary.overallScore} color={levelColor(lvl)} />
            <View style={{ gap: 2, flex: 1 }}>
              <Txt size={tokens.font.size.caption} color={C.muted}>
                Overall
              </Txt>
              <Txt weight="700" size={tokens.font.size.body} color={levelColor(lvl)}>
                {label}
              </Txt>
              <Txt size={tokens.font.size.tiny} color={C.muted}>
                {summary.logsDoneCount} of {summary.logsTotal} logs done
              </Txt>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Daily check-in ${d.checkedIn ? 'done' : 'open'}, ${d.streak}-day streak`}
            onPress={go(d.checkedIn ? '/logs/mood' : '/logs/mood/add')}
            style={styles.checkin}>
            <View style={styles.row6}>
              {d.checkedIn ? <Icon name="check" size={18} color={C.onGold} strokeWidth={2.5} /> : null}
              <Txt weight="700" size={tokens.font.size.body} color={C.onGold}>
                Daily check-in
              </Txt>
            </View>
            <View style={[styles.row6, { gap: 4, flexWrap: 'wrap' }]}>
              <Txt weight="600" size={tokens.font.size.caption} color={C.onGold}>
                +50 coins ·
              </Txt>
              <Icon name="flame" size={12} color={X.streakFlame} />
              <Txt weight="600" size={tokens.font.size.caption} color={C.onGold}>
                {d.streak}-day streak
              </Txt>
            </View>
            <View style={[styles.row6, { gap: 4 }]} accessibilityLabel={`${dots} of 7 days to the +50 bonus`}>
              {Array.from({ length: 7 }, (_, i) => (
                <View key={i} style={[styles.dot, i < dots ? styles.dotOn : null]} />
              ))}
            </View>
          </Pressable>
        </View>

        <View style={styles.scrubber}>
          <View style={styles.scrubHead}>
            <Txt size={tokens.font.size.caption} color={C.muted}>
              Last 7 days · logs done
            </Txt>
            <Txt size={tokens.font.size.caption} color={C.muted}>
              Tap a day
            </Txt>
          </View>
          <DayScrubber days={d.days} selected={sel} onSelect={setSel} />
        </View>

        <View style={styles.stageWrap}>
          <View style={styles.stage}>
            <HoloBackdrop />
            <FloatingHolo>
              <HologramBody areas={summary.areas} />
            </FloatingHolo>
            <Scanlines />
            <CalloutLines callouts={callouts} />
            {callouts.map((c, i) => (
              <Callout key={i} {...c} />
            ))}
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <Legend note="· vs. pre-mission baseline" />
        </View>
      </ScrollView>
    </View>
  );
}

function pick(v: { value: string; level: Level; pending: boolean; label?: string }, base?: string) {
  return { value: v.value, level: v.level, label: v.label ?? base ?? '' };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8 },
  cards: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 6, marginBottom: 18 },
  overall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.card,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: tokens.shadow.card,
  },
  checkin: {
    flex: 1,
    minHeight: 76,
    borderRadius: tokens.radius.card,
    backgroundColor: C.gold,
    boxShadow: tokens.shadow.goldGlow,
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: X.streakEmpty },
  dotOn: { backgroundColor: C.onGold, borderColor: C.onGold },
  scrubber: { gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  scrubHead: { flexDirection: 'row', justifyContent: 'space-between' },
  stageWrap: { alignItems: 'center', overflow: 'hidden' },
  stage: { width: STAGE_W, height: STAGE_H },
  platform: { position: 'absolute', left: 108, top: 342, filter: `drop-shadow(0 0 12px ${X.holoGlow})` } as object,
  beam: { position: 'absolute', left: 130, top: 30 },
  holo: { position: 'absolute', left: 130, top: 22, filter: `drop-shadow(0 0 6px ${X.holoGlow})` } as object,
  scan: { position: 'absolute', left: 120, top: 20 },
});
