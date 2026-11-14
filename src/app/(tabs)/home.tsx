import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Astronaut, BoltShadow, OrbiDrone } from '@/components/Astronaut';
import { ProgressBar, Ring } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { LogMenu, type LogMenuItem } from '@/components/LogMenu';
import { CoinsPill, levelColor } from '@/components/Pills';
import { PetArt } from '@/components/ShopArt';
import { StationProps, StationWall, StationWindow, WINDOW } from '@/components/StationScene';
import { Txt } from '@/components/Txt';
import { firstName, getAstronaut, getDailySummary, getMission, isLoggedToday, overallLabel } from '@/data/api';
import { orbiNudge } from '@/data/derived';
import { boltColors } from '@/data/shopArt';
import { useData } from '@/data/store';
import type { Level, LogType } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';

const MENU: { key: string; type: LogType | null; label: string; icon: LogMenuItem['icon']; href: string }[] = [
  { key: 'mood', type: 'mood', label: 'Mood check-in', icon: 'smile', href: '/logs/mood' },
  { key: 'sleep', type: 'sleep', label: 'Sleep', icon: 'moon', href: '/logs/sleep' },
  { key: 'radiation', type: 'radiation', label: 'Radiation', icon: 'radiation', href: '/logs/radiation' },
  { key: 'meals', type: 'meal', label: 'Meals', icon: 'utensils', href: '/logs/meals' },
  { key: 'exercise', type: 'exercise', label: 'Exercise', icon: 'activity', href: '/logs/exercise' },
  { key: 'body', type: 'measurement', label: 'Body', icon: 'gauge', href: '/logs/body' },
  { key: 'relax', type: null, label: 'Relax', icon: 'leaf', href: '/logs/relax' },
];

const BOLT_W = 100;
const WALK_MS = 18000;

/** Bolt walking left ↔ right across the floor (AppHome keyframes). Static when reduced motion is on. */
function WalkingBolt({ sceneW, colors }: { sceneW: number; colors: ReturnType<typeof boltColors> }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  const max = Math.max(40, sceneW - 120);
  useEffect(() => {
    cancelAnimation(p);
    if (reduced) {
      p.value = 0;
      return;
    }
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration: WALK_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [reduced, p]);
  const style = useAnimatedStyle(() => {
    const v = p.value;
    let x = 10;
    let flip = 1;
    if (v < 0.45) x = 10 + (max - 10) * (v / 0.45);
    else if (v < 0.5) x = max;
    else if (v < 0.95) {
      x = max - (max - 10) * ((v - 0.5) / 0.45);
      flip = -1;
    } else flip = -1;
    return { transform: [{ translateX: x }, { scaleX: flip }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.walker, style]}>
      <Astronaut state={reduced ? 'idle' : 'walking'} colors={colors} />
      <BoltShadow />
    </Animated.View>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ w: 390, h: 764 });
  const data = useData(() => {
    const me = getAstronaut();
    const summary = getDailySummary();
    return {
      me,
      summary,
      mission: getMission(),
      nudge: orbiNudge(),
      done: Object.fromEntries(MENU.map((m) => [m.key, m.type ? isLoggedToday(m.type) : false])),
    };
  });
  const { me, summary, mission } = data;
  const label = overallLabel(summary.overallScore);
  const lvl: Level = label === 'Stable' ? 'ok' : label === 'Attention' ? 'warn' : 'alert';

  // Window shrinks on short screens so the floor never overlaps it.
  const winH = Math.max(180, Math.min(WINDOW.height, size.h - 210 - WINDOW.top - 20));
  const winW = Math.min(WINDOW.width, size.w - WINDOW.left * 2 + 2);
  const winBottom = WINDOW.top + winH;

  const items: LogMenuItem[] = MENU.map((m) => ({
    key: m.key,
    label: m.label,
    icon: m.icon,
    href: m.href,
    state: m.type === null ? 'soon' : data.done[m.key] ? 'done' : 'todo',
  }));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.scene} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <StationWall wall={me.avatar.equipped.room.wall} width={size.w} height={size.h} />
        <StationWindow height={winH} width={winW} view={me.avatar.equipped.room.window} />
        <StationProps floor={me.avatar.equipped.room.floor} width={size.w} />
        {me.avatar.equipped.pet ? (
          <View pointerEvents="none" style={styles.pet}>
            <PetArt id={me.avatar.equipped.pet} size={44} />
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Orbi: ${data.nudge}`}
          onPress={() => router.push('/orbi')}
          style={[styles.bubble, { top: winBottom - 34 }]}>
          <Txt size={tokens.font.size.caption} lh={1.4}>
            <Txt weight="700" size={tokens.font.size.caption} color={C.teal}>
              Orbi:{' '}
            </Txt>
            {data.nudge}
          </Txt>
        </Pressable>
        <View style={[styles.drone, { top: winBottom + 26 }]}>
          <OrbiDrone />
        </View>

        <WalkingBolt sceneW={size.w} colors={boltColors(me.avatar.equipped)} />

        <View style={styles.bottom}>
          <View style={{ gap: 4, flex: 1 }}>
            <Txt heading weight="700" size={tokens.ext.fontSize.stat} numberOfLines={1}>
              Hi, Commander{' '}
              <Txt heading weight="700" size={tokens.ext.fontSize.stat} color={C.primary}>
                {firstName(me)}
              </Txt>
            </Txt>
            <View style={styles.missionRow}>
              <Txt size={tokens.font.size.caption} color={C.muted}>
                {mission.name} · Day {mission.today} of {mission.lengthDays}
              </Txt>
              <ProgressBar value={mission.today / mission.lengthDays} width={60} />
            </View>
          </View>
          <Pressable accessibilityRole="link" onPress={() => router.push('/status')} style={styles.stable}>
            <Icon name="status" size={16} color={levelColor(lvl)} />
            <Txt weight="600" size={tokens.font.size.small}>
              {label} {summary.overallScore}
            </Txt>
          </Pressable>
        </View>

        {open ? <Pressable accessibilityLabel="Close log menu" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} /> : null}

        <View style={styles.top}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Log today, ${summary.logsDoneCount} of ${summary.logsTotal} done`}
              accessibilityState={{ expanded: open }}
              onPress={() => setOpen(!open)}
              style={styles.logBtn}>
              <Ring value={summary.logsDoneCount} max={summary.logsTotal} label={`${summary.logsDoneCount}/${summary.logsTotal}`} />
              <Txt weight="700" size={tokens.font.size.small}>
                Log
              </Txt>
              <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
                <Icon name="chevronDown" size={16} color={C.muted} />
              </View>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="Calendar" onPress={() => router.push('/calendar')} style={styles.calBtn}>
              <Icon name="calendar" size={20} />
            </Pressable>
          </View>
          <CoinsPill amount={me.avatar.coins} />
        </View>

        <View style={styles.menu} pointerEvents="box-none">
          <LogMenu open={open} items={items} onNavigate={() => setOpen(false)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgScene },
  scene: { flex: 1, overflow: 'hidden', backgroundColor: C.bgScene },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingLeft: 7,
    paddingRight: 8,
    borderRadius: tokens.ext.radius.button,
    backgroundColor: X.chrome,
    borderWidth: 1,
    borderColor: C.border,
  },
  calBtn: {
    width: 48,
    height: 48,
    borderRadius: tokens.ext.radius.button,
    backgroundColor: X.chrome,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: { position: 'absolute', left: 16, top: 70, zIndex: 6 },
  bubble: {
    position: 'absolute',
    right: 16,
    width: 196, // 170 + padding + border (content-box in the source)
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.item,
    borderBottomRightRadius: 4,
    backgroundColor: C.surfaceSolid,
    borderWidth: 1,
    borderColor: C.teal,
  },
  drone: { position: 'absolute', left: 282 },
  pet: { position: 'absolute', right: 96, bottom: 132 },
  walker: { position: 'absolute', left: 0, bottom: 110, alignItems: 'center', width: BOLT_W },
  bottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  missionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.item,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
});
