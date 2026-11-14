import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LogStateButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { WeekBars } from '@/components/Charts';
import { Grid, LogScreen, MetricTile, Note, SavedBanner } from '@/components/LogKit';
import { Badge } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { getLogs, getMission, getToday, getTodayLogs } from '@/data/api';
import { formatDuration, hhmm, weekdayOfDay } from '@/data/format';
import { useData } from '@/data/store';
import type { SleepData } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';

const WAKE_TEXT: Record<SleepData['wakeUps'], string> = { none: 'No wake-ups', '1-2': '1–2 wake-ups', '3+': '3+ wake-ups' };

/** Illustrative hypnogram (light / REM / deep / awake) built from duration and wake-ups. */
function stages(d: SleepData) {
  const pattern = [
    [10, 'light'],
    [22, 'rem'],
    [26, 'deep'],
    [16, 'rem'],
    [8, 'awake'],
    [24, 'deep'],
    [20, 'rem'],
    [12, 'rem'],
    [8, 'light'],
  ] as const;
  const awakeSlots = d.wakeUps === 'none' ? 0 : d.wakeUps === '1-2' ? 1 : 2;
  let awake = 0;
  return pattern.map(([h, k], i) => {
    let kind: string = k;
    if (k === 'awake') kind = awake++ < awakeSlots ? 'awake' : 'light';
    if (i === 7 && awakeSlots > 1) kind = 'awake';
    const color = kind === 'awake' ? C.warning : kind === 'deep' ? X.sleepDeep : kind === 'light' ? C.muted : C.primary;
    return { h: kind === 'awake' ? 8 : h, color };
  });
}

export default function SleepOverview() {
  const d = useData(() => {
    const today = getToday();
    const days = Array.from({ length: 7 }, (_, i) => today - 6 + i).filter((x) => x >= 1);
    const logs = getLogs({ type: 'sleep', fromDay: days[0] });
    const byDay = new Map(logs.map((l) => [l.missionDay, l]));
    const values = days.map((day) => (byDay.get(day)?.data.durationMin ?? 0) / 60);
    const logged = values.filter((v) => v > 0);
    return {
      today: getTodayLogs('sleep')[0],
      last: getLogs({ type: 'sleep' }).at(-1),
      days,
      values,
      avg: logged.length ? (logged.reduce((a, b) => a + b, 0) / logged.length) * 60 : 0,
      goal: getMission().goals.sleepHours,
    };
  });
  const night = d.today ?? d.last;
  const below = night && night.data.durationMin < d.goal * 60;
  const band = night?.data.band;

  return (
    <LogScreen
      title="Sleep"
      footer={<LogStateButton logged={!!d.today} onLog={() => router.push('/logs/sleep/add')} onEdit={() => router.push('/logs/sleep/add')} />}>
      <SavedBanner types={['sleep']} />
      <Card gap={8}>
        <CardTitle title={d.today ? 'Last night' : 'Last logged night'} right={<Badge label={night?.data.source === 'manual' ? 'Manual entry' : 'ARCHeR wrist band'} />} />
        {night ? (
          <>
            <View style={styles.big}>
              <Txt heading weight="700" size={tokens.ext.fontSize.hero}>
                {formatDuration(night.data.durationMin)}
              </Txt>
              <Txt weight="700" size={tokens.font.size.caption} color={below ? C.warning : C.success}>
                {below ? `Below ${d.goal}h target` : `${d.goal}h target reached`}
              </Txt>
            </View>
            <View style={styles.between}>
              <Txt size={tokens.font.size.caption} color={C.muted}>
                Bed {hhmm(night.data.bedtime)}
              </Txt>
              <Txt size={tokens.font.size.caption} color={C.muted}>
                Quality {night.data.quality}/5
              </Txt>
              <Txt size={tokens.font.size.caption} color={C.muted}>
                Woke {hhmm(night.data.wakeTime)}
              </Txt>
            </View>
            <View style={styles.hypno} accessibilityLabel="Sleep stages (illustrative)">
              {stages(night.data).map((s, i) => (
                <View key={i} style={{ flex: 1, height: s.h, borderRadius: 3, backgroundColor: s.color }} />
              ))}
            </View>
            {!d.today ? (
              <Txt size={tokens.font.size.caption} color={C.gold}>
                Today&apos;s night is not logged yet. Your band can prefill it.
              </Txt>
            ) : null}
          </>
        ) : (
          <Txt color={C.muted}>No sleep logged yet.</Txt>
        )}
      </Card>
      <Card gap={10}>
        <CardTitle
          title="This week"
          right={
            <Txt size={tokens.font.size.caption} color={C.muted}>
              avg {formatDuration(d.avg)}
            </Txt>
          }
        />
        <WeekBars
          values={d.values}
          labels={d.days.map(weekdayOfDay)}
          max={9}
          target={d.goal}
          targetLabel={`target ${d.goal}h`}
          todayIndex={d.days.length - 1}
          colorFor={(v) => (v >= d.goal ? C.primary : C.warning)}
        />
      </Card>
      {band ? (
        <View style={{ gap: 8 }}>
          <Txt weight="700" size={tokens.ext.fontSize.label}>
            From your ARCHeR wrist band
          </Txt>
          <Grid>
            <MetricTile
              icon="sun"
              label="Light exposure"
              value={band.lightExposureLux < 100 ? 'Low' : 'Good'}
              color={band.lightExposureLux < 100 ? C.warning : C.text}
            />
            <MetricTile icon="activity" label="Movement" value={WAKE_TEXT[night!.data.wakeUps]} />
            <MetricTile icon="heart" label="Avg heart rate" value={`${band.avgHr} bpm`} />
            <MetricTile icon="volume" label="Cabin noise" value={`${band.noiseDb} dB`} />
          </Grid>
        </View>
      ) : null}
      <Note>On the ISS crews see 16 sunrises a day, which can shift sleep. Cabin lights dim at 21:00 tonight.</Note>
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  big: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  hypno: { flexDirection: 'row', gap: 2, height: 26, alignItems: 'flex-end' },
});
