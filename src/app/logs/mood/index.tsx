import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { LogStateButton } from '@/components/Buttons';
import { Card, CardTitle, InfoNote, StatTile } from '@/components/Card';
import { Segmented } from '@/components/Inputs';
import { LogScreen, SavedBanner } from '@/components/LogKit';
import { MoodFace } from '@/components/Mood';
import { Txt } from '@/components/Txt';
import { dayOfDate, getAlerts, getJournal, getLogs, getToday, isLoggedToday } from '@/data/api';
import { capitalize, relativeDay, weekdayOfDay } from '@/data/format';
import { useData } from '@/data/store';
import { fontFamily } from '@/theme/fonts';
import { C, tokens } from '@/theme/tokens';

type Period = 'Week' | 'Month' | 'Mission';
const H = 124;
const ROW = (lv: number) => 12 + (5 - lv) * 22; // y of each level line (5 → 12 … 1 → 100)

/** Mood line chart with face icons on the y axis. */
function MoodChart({ points }: { points: { label: string; level: number | null }[] }) {
  const [w, setW] = useState(282);
  const n = points.length;
  const x = (i: number) => (n < 2 ? w / 2 : 22 + (i * (w - 30)) / (n - 1));
  const valid = points.map((p, i) => ({ ...p, i })).filter((p) => p.level !== null) as { label: string; level: number; i: number }[];
  const every = Math.ceil(n / 7);
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel="Mood over time">
      <View style={{ width: 36, height: H }}>
        {[5, 4, 3, 2, 1].map((lv) => (
          <View key={lv} style={{ position: 'absolute', left: 8, top: ROW(lv) - 10 }}>
            <MoodFace level={lv} size={20} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <Svg width={w} height={H}>
          {[5, 4, 3, 2, 1].map((lv) => (
            <Line key={lv} x1={8} y1={ROW(lv)} x2={w} y2={ROW(lv)} stroke={C.track} strokeWidth={1} />
          ))}
          {valid.length > 1 ? (
            <Polyline
              points={valid.map((p) => `${x(p.i)},${ROW(p.level)}`).join(' ')}
              fill="none"
              stroke={C.primary}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          ) : null}
          {valid.map((p) => (
            <Circle key={p.i} cx={x(p.i)} cy={ROW(p.level)} r={n > 14 ? 3 : 4} fill={C.primary} stroke={C.bg} strokeWidth={2} />
          ))}
          {points.map((p, i) =>
            i % every === 0 || i === n - 1 ? (
              <SvgText key={i} x={x(i)} y={118} textAnchor="middle" fontSize={11} fill={C.muted} fontFamily={fontFamily('body', '400')}>
                {p.label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      </View>
    </View>
  );
}

export default function MoodOverview() {
  const [period, setPeriod] = useState<Period>('Week');
  const d = useData(() => {
    const today = getToday();
    const from = period === 'Week' ? today - 6 : period === 'Month' ? today - 29 : 1;
    const days = Array.from({ length: today - Math.max(1, from) + 1 }, (_, i) => Math.max(1, from) + i);
    const logs = getLogs({ type: 'mood', fromDay: Math.max(1, from) });
    const byDay = new Map(logs.map((l) => [l.missionDay, l]));
    const points = days.map((day) => ({
      label: period === 'Week' ? weekdayOfDay(day) : `D${day}`,
      level: byDay.get(day)?.data.level ?? null,
    }));
    const levels = logs.map((l) => l.data.level);
    const avg = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
    const best = logs.reduce<(typeof logs)[number] | undefined>((b, l) => (!b || l.data.level >= b.data.level ? l : b), undefined);
    const half = Math.max(1, Math.floor(levels.length / 2));
    const first = levels.slice(0, half);
    const last = levels.slice(-half);
    const diff = (last.reduce((a, b) => a + b, 0) / last.length || 0) - (first.reduce((a, b) => a + b, 0) / first.length || 0);
    const trend = diff > 0.4 ? 'improving' : diff < -0.4 ? 'dipping' : 'stable';
    const moodByDay = new Map(getLogs({ type: 'mood' }).map((l) => [l.missionDay, l]));
    const journal = getJournal()
      .slice(0, 4)
      .map((j) => {
        const day = dayOfDate(j.timestamp);
        const tags = moodByDay.get(day)?.data.tags ?? [];
        return { ...j, day, tags };
      });
    return {
      points,
      avg,
      best,
      checkins: logs.length,
      total: days.length,
      trend,
      logged: isLoggedToday('mood'),
      sleepAlert: getAlerts().some((a) => a.type === 'poor_sleep'),
      journal,
    };
  }, [period]);

  const periodLabel = period === 'Week' ? 'this week' : period === 'Month' ? 'this month' : 'this mission';
  const trendColor = d.trend === 'improving' ? C.success : d.trend === 'dipping' ? C.warning : C.success;

  return (
    <LogScreen
      title="Mood"
      footer={
        <LogStateButton
          logged={d.logged}
          logLabel="Daily check-in"
          onLog={() => router.push('/logs/mood/add')}
          onEdit={() => router.push('/logs/mood/add')}
        />
      }>
      <SavedBanner types={['mood']} />
      <Segmented items={['Week', 'Month', 'Mission'] as const} selected={period} onChange={setPeriod} />
      <Card padding={14} shadow={false}>
        <CardTitle
          title={`Your mood ${periodLabel}`}
          right={
            <Txt weight="700" size={tokens.font.size.caption} color={trendColor}>
              Trend: {d.trend}
            </Txt>
          }
        />
        <MoodChart points={d.points} />
      </Card>
      <View style={styles.stats}>
        <StatTile value={d.checkins ? `${d.avg.toFixed(1)} / 5` : '—'} label="Average" />
        <StatTile value={d.best ? weekdayOfDay(d.best.missionDay) : '—'} label="Best day" />
        <StatTile value={`${d.checkins} / ${d.total}`} label="Check-ins" />
      </View>
      <InfoNote onPress={() => router.push('/orbi')}>
        <Txt weight="700" size={13}>
          Orbi:{' '}
        </Txt>
        {d.sleepAlert
          ? 'your mood dips after nights with low light exposure. Try the 21:00 wind-down.'
          : 'your mood has been steady. Keep sharing how your day went.'}
      </InfoNote>
      <Card padding={14} gap={0} shadow={false}>
        <CardTitle
          title="Shared with Orbi"
          right={
            <Pressable accessibilityRole="link" onPress={() => router.push('/orbi')}>
              <Txt weight="700" size={tokens.font.size.caption} color={C.primary}>
                Open Orbi
              </Txt>
            </Pressable>
          }
        />
        {d.journal.length === 0 ? (
          <Txt size={tokens.font.size.small} color={C.muted} style={{ paddingTop: 10 }}>
            Nothing shared yet. Talk to Orbi in Journal mode.
          </Txt>
        ) : null}
        {d.journal.map((j, i) => (
          <View key={j.id} style={[styles.entry, i > 0 && styles.sep]}>
            <MoodFace level={j.moodLevel ?? 3} size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.entryHead}>
                <Txt size={tokens.font.size.caption} color={C.muted}>
                  {relativeDay(j.day)}
                </Txt>
                <Txt size={tokens.font.size.caption} color={C.muted}>
                  {j.tags.map(capitalize).join(' · ')}
                </Txt>
              </View>
              <Txt size={tokens.font.size.small} lh={1.4}>
                {j.summary}
              </Txt>
            </View>
          </View>
        ))}
      </Card>
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  entry: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sep: { borderTopWidth: 1, borderTopColor: C.track },
});
