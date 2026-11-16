import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LogStateButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { WeekLine } from '@/components/Charts';
import { Grid, LogScreen, MetricTile, Note, SavedBanner } from '@/components/LogKit';
import { Badge, levelColor } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { getLogs, getMission, getToday, getTodayLogs } from '@/data/api';
import { sleepLevel } from '@/data/derived';
import { formatDuration, hhmm, weekdayOfDay } from '@/data/format';
import { useData } from '@/data/store';
import type { SleepData } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

const WAKE_TEXT: Record<SleepData['wakeUps'], string> = { none: 'No wake-ups', '1-2': '1–2 wake-ups', '3+': '3+ wake-ups' };

export default function SleepOverview() {
  const d = useData(() => {
    const today = getToday();
    const days = Array.from({ length: 7 }, (_, i) => today - 6 + i).filter((x) => x >= 1);
    const logs = getLogs({ type: 'sleep', fromDay: days[0] });
    const byDay = new Map(logs.map((l) => [l.missionDay, l]));
    // no log that day = no data (null), never a zero-hour night
    const values = days.map((day) => { const l = byDay.get(day); return l ? l.data.durationMin / 60 : null; });
    const logged = values.filter((v): v is number => v !== null);
    return {
      today: getTodayLogs('sleep')[0],
      last: getLogs({ type: 'sleep' }).at(-1),
      days,
      values,
      missing: values.filter((v) => v === null).length,
      avg: logged.length ? (logged.reduce((a, b) => a + b, 0) / logged.length) * 60 : 0,
      goal: getMission().goals.sleepHours,
    };
  });
  const night = d.today ?? d.last;
  const below = night && night.data.durationMin < d.goal * 60;
  const level = night ? sleepLevel(night.data.durationMin) : 'ok';
  const band = night?.data.band;

  return (
    <LogScreen
      title="Sleep"
      footer={<LogStateButton logged={!!d.today} onLog={() => router.push('/logs/sleep/add')} onEdit={() => router.push('/logs/sleep/add')} />}>
      <SavedBanner types={['sleep']} />
      <Card gap={8}>
        <CardTitle title={d.today ? 'Last night' : 'Last logged night'} right={<Badge label={night?.data.source === 'manual' ? 'Manual entry' : 'Wrist band estimate · demo'} />} />
        {night ? (
          <>
            <View style={styles.big}>
              <Txt heading weight="700" size={tokens.ext.fontSize.hero}>
                {formatDuration(night.data.durationMin)}
              </Txt>
              <Txt weight="700" size={tokens.font.size.caption} color={levelColor(level)}>
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
        <WeekLine
          values={d.values}
          labels={d.days.map(weekdayOfDay)}
          min={3}
          max={9}
          target={d.goal}
          targetLabel={`target ${d.goal}h`}
          todayIndex={d.days.length - 1}
          colorFor={(v) => levelColor(sleepLevel(v * 60))}
          format={(v) => `${Math.round(v * 10) / 10}h`}
        />
        <View style={styles.legend}>
          {(
            [
              ['ok', `${d.goal}h+`],
              ['warn', `${d.goal - 2}–${d.goal}h`],
              ['alert', `under ${d.goal - 2}h`],
            ] as const
          ).map(([l, t]) => (
            <View key={l} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: levelColor(l) }]} />
              <Txt size={tokens.font.size.tiny} color={C.muted}>
                {t}
              </Txt>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.dot, styles.dotEmpty]} />
            <Txt size={tokens.font.size.tiny} color={C.muted}>
              no data{d.missing ? ` (${d.missing})` : ''}
            </Txt>
          </View>
        </View>
      </Card>
      {band ? (
        <View style={{ gap: 8 }}>
          <Txt weight="700" size={tokens.ext.fontSize.label}>
            From your ARCHeR wrist band (demo)
          </Txt>
          <Grid>
            <MetricTile
              icon="sun"
              label="Light exposure"
              value={band.lightExposureLux < 100 ? 'Low' : 'Good'}
              color={band.lightExposureLux < 100 ? levelColor('warn') : C.text}
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
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.muted },
});
