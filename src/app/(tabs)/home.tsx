import { router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrbiDrone } from '@/components/Astronaut';
import { ProgressBar, Ring } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { LogMenu, type LogMenuItem } from '@/components/LogMenu';
import { CoinIcon } from '@/components/Buttons';
import { CoinsPill, StatusDot, levelColor } from '@/components/Pills';
import { PetArt } from '@/components/ShopArt';
import { StationProps, StationWall, StationWindow, WINDOW } from '@/components/StationScene';
import { Txt } from '@/components/Txt';
import { BoltActor } from '@/avatar/BoltActor';
import { deriveStatuses } from '@/avatar/status';
import { firstName, getAstronaut, getDailySummary, getLastSaved, getMission, healthTag, isLoggedToday } from '@/data/api';
import { orbiNudge } from '@/data/derived';
import { boltColors } from '@/data/shopArt';
import { session } from '@/data/session';
import { useData } from '@/data/store';
import type { LogType } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';

const ORBI_TOP = 74;

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
  const [orbiH, setOrbiH] = useState(112);
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
  const tag = healthTag(summary.overallScore);

  // Orbi's note sits on top (highlighted); the window starts below it and shrinks
  // on short screens so the floor never overlaps it.
  const winTop = ORBI_TOP + orbiH + 12;
  const winH = Math.max(150, Math.min(WINDOW.height - 40, size.h - 210 - winTop - 20));
  const winW = Math.min(WINDOW.width, size.w - WINDOW.left * 2 + 2);
  const winBottom = winTop + winH;

  const open6 = MENU.filter((m) => m.type && !data.done[m.key]).length;
  const items: LogMenuItem[] = [
    {
      key: 'orbi-fill',
      label: 'Daily check-in',
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
  // before the check-in, Orbi only invites you to fill it (no health remarks yet); after it, its note
  const orbiLine = open6 ? `ready for today's check-in? I read your devices first, you just confirm.` : data.nudge;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.scene} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <StationWall wall={me.avatar.equipped.room.wall} width={size.w} height={size.h} />
        <StationWindow height={winH} width={winW} top={winTop} view={me.avatar.equipped.room.window} />
        <StationProps floor={me.avatar.equipped.room.floor} width={size.w} />
        {me.avatar.equipped.pet ? (
          <View pointerEvents="none" style={styles.pet}>
            <PetArt id={me.avatar.equipped.pet} size={44} />
          </View>
        ) : null}

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
          <Pressable accessibilityRole="link" accessibilityLabel={`My health: ${tag.label}`} onPress={() => router.push('/status')} style={styles.stable}>
            <StatusDot state={tag.level} size={8} />
            <Txt weight="600" size={tokens.font.size.small} color={levelColor(tag.level)}>
              {tag.label}
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

        <View style={styles.orbiWrap} onLayout={(e) => setOrbiH(e.nativeEvent.layout.height)}>
          {fill ? (
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
          ) : (
            <View style={styles.orbiCard}>
              <Pressable accessibilityRole="link" accessibilityLabel={`Orbi: ${orbiLine}. Open Orbi`} onPress={() => router.push('/orbi')} style={styles.orbiRow}>
                <Icon name="orbi" size={20} color={C.teal} />
                <Txt size={tokens.font.size.small} lh={1.4} style={{ flex: 1 }} numberOfLines={3}>
                  <Txt weight="700" size={tokens.font.size.small} color={C.teal}>
                    Orbi:{' '}
                  </Txt>
                  {orbiLine}
                </Txt>
              </Pressable>
              {open6 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Start daily check-in, under 2 minutes, ${open6} to go`}
                  onPress={() => router.push('/logs/orbi-fill')}
                  style={styles.checkinBtn}>
                  <Icon name="mic" size={16} color={C.onPrimary} />
                  <Txt weight="700" size={tokens.font.size.small} color={C.onPrimary}>
                    Daily check-in · under 2 min
                  </Txt>
                  <Txt size={tokens.font.size.caption} color={C.onPrimary}>
                    {open6} to go
                  </Txt>
                </Pressable>
              ) : (
                <View style={styles.orbiRow}>
                  <Icon name="check" size={16} color={C.holoOk} strokeWidth={2.5} />
                  <Txt weight="600" size={tokens.font.size.caption} color={C.holoOk}>
                    Today&apos;s check-in is done
                  </Txt>
                </View>
              )}
            </View>
          )}
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
  orbiWrap: { position: 'absolute', left: 16, right: 16, top: ORBI_TOP, zIndex: 3 },
  orbiCard: {
    gap: 10,
    padding: 12,
    borderRadius: tokens.radius.card,
    backgroundColor: C.surfaceSolid,
    borderWidth: 1,
    borderColor: C.teal,
    boxShadow: tokens.ext.shadow.menu,
  },
  orbiRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.item,
    backgroundColor: C.primary,
  },
  fillCard: {
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
