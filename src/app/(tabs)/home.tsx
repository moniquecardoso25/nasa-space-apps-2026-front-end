import { router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrbiDrone } from '@/components/Astronaut';
import { ProgressBar, Ring } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { LogMenu, type LogMenuItem } from '@/components/LogMenu';
import { CoinIcon } from '@/components/Buttons';
import { CoinsPill, levelColor } from '@/components/Pills';
import { PetArt } from '@/components/ShopArt';
import { StationProps, StationWall, StationWindow, WINDOW } from '@/components/StationScene';
import { Txt } from '@/components/Txt';
import { BoltActor } from '@/avatar/BoltActor';
import { deriveStatuses } from '@/avatar/status';
import { firstName, getAstronaut, getDailySummary, getLastSaved, getMission, isLoggedToday, overallLabel } from '@/data/api';
import { orbiNudge } from '@/data/derived';
import { boltColors } from '@/data/shopArt';
import { session } from '@/data/session';
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

export default function Home() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const focused = useIsFocused();
  const [dismissedAt, setDismissedAt] = useState(0);
  const [size, setSize] = useState({ w: 390, h: 764 });
  const data = useData(() => {
    const me = getAstronaut();
    const summary = getDailySummary();
    return {
      me,
      summary,
      mission: getMission(),
      nudge: orbiNudge(),
      fill: session.orbiFill,
      statuses: deriveStatuses(),
      lastSavedAt: getLastSaved()?.at,
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

  const open6 = MENU.filter((m) => m.type && !data.done[m.key]).length;
  const items: LogMenuItem[] = [
    {
      key: 'orbi-fill',
      label: 'Fill with Orbi',
      icon: 'mic',
      href: '/logs/orbi-fill',
      state: 'special',
      hint: open6 ? `${open6} to go` : 'All done',
    },
    ...MENU.map((m) => ({
      key: m.key,
      label: m.label,
      icon: m.icon,
      href: m.href,
      state: (m.type === null ? 'soon' : data.done[m.key] ? 'done' : 'todo') as LogMenuItem['state'],
    })),
  ];
  const fill = data.fill && data.fill.at !== dismissedAt ? data.fill : null;

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

        <BoltActor
          width={size.w}
          spots={{ window: WINDOW.left + winW / 2 - 50, console: 70, plant: size.w - 184, pet: size.w - 230 }}
          statuses={data.statuses}
          colors={boltColors(me.avatar.equipped)}
          hasPet={!!me.avatar.equipped.pet}
          celebrateKey={focused ? (data.lastSavedAt ?? 0) : 0}
        />

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

        {fill && !open ? (
          <View style={styles.fillCard} accessibilityLiveRegion="polite">
            <Icon name="check" size={18} color={C.holoOk} strokeWidth={3} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt weight="700" size={tokens.font.size.small} color={C.holoOk}>
                Orbi saved {fill.saved.length} log{fill.saved.length === 1 ? '' : 's'}
              </Txt>
              <Txt size={tokens.font.size.caption} color={C.muted} numberOfLines={2}>
                {fill.saved.join(' · ')}
              </Txt>
            </View>
            <View style={styles.coinsRow}>
              <Txt weight="700" size={tokens.font.size.small}>
                +{fill.coins}
              </Txt>
              <CoinIcon size={16} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8} onPress={() => setDismissedAt(fill.at)}>
              <Txt weight="700" size={tokens.font.size.body} color={C.muted}>
                ×
              </Txt>
            </Pressable>
          </View>
        ) : null}

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
  fillCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 74,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: tokens.radius.item,
    backgroundColor: X.menu,
    borderWidth: 1,
    borderColor: C.holoOk,
    boxShadow: tokens.ext.shadow.menu,
  },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
