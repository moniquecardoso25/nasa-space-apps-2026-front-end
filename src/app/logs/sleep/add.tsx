import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, CardTitle } from '@/components/Card';
import { Chip, Field, Rating } from '@/components/Inputs';
import { ChipRow, Group, LogScreen, SaveButton, goBackTo } from '@/components/LogKit';
import { Badge } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { getLogs, getToday, getTodayLogs, saveDailyLog } from '@/data/api';
import { formatDuration, hhmm, isoAt, maskTime, parseHHMM, sleepMinutes } from '@/data/format';
import { useData } from '@/data/store';
import type { SleepData } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

const WAKE: { v: SleepData['wakeUps']; label: string }[] = [
  { v: 'none', label: 'No' },
  { v: '1-2', label: '1–2 times' },
  { v: '3+', label: '3+ times' },
];

/** Log sleep: bed/wake prefilled by the band, rested 1–5, wake-ups, note. */
export default function SleepAdd() {
  const { existing, last } = useData(() => ({ existing: getTodayLogs('sleep')[0], last: getLogs({ type: 'sleep' }).at(-1) }));
  const src = existing ?? last;
  const [bed, setBed] = useState(src ? hhmm(src.data.bedtime) : '23:00');
  const [wake, setWake] = useState(src ? hhmm(src.data.wakeTime) : '07:00');
  const [quality, setQuality] = useState<number | null>(existing?.data.quality ?? null);
  const [wakeUps, setWakeUps] = useState<SleepData['wakeUps']>(existing?.data.wakeUps ?? '1-2');
  const [note, setNote] = useState(existing?.note ?? '');
  const total = sleepMinutes(bed, wake);
  const valid = total !== null && total > 0 && quality !== null;

  const save = async () => {
    if (!valid) return;
    const today = getToday();
    const b = parseHHMM(bed)!;
    const w = parseHHMM(wake)!;
    const data: SleepData = {
      bedtime: isoAt(today, bed, b > w ? -1 : 0),
      wakeTime: isoAt(today, wake),
      durationMin: total!,
      quality: quality!,
      wakeUps,
      source: existing?.data.source ?? (last?.data.band ? 'archer_band' : 'manual'),
      band: existing?.data.band ?? last?.data.band,
    };
    await saveDailyLog('sleep', data, { note: note.trim() || null, environmentId: 'sleep', timestamp: isoAt(today, wake) });
    goBackTo('/logs/sleep');
  };

  return (
    <LogScreen
      title="Log sleep"
      backHref="/logs/sleep"
      gap={14}
      footer={<SaveButton label={existing ? 'Save changes' : 'Save sleep log'} reward={existing ? 0 : 10} onPress={save} disabled={!valid} />}>
      <Card gap={10}>
        <CardTitle title="Last night" right={src?.data.band ? <Badge label="Prefilled by ARCHeR wrist band" /> : null} />
        <View style={styles.two}>
          <Field label="Went to bed" value={bed} onChangeText={(t) => setBed(maskTime(t))} keyboardType="number-pad" style={styles.half} />
          <Field label="Woke up" value={wake} onChangeText={(t) => setWake(maskTime(t))} keyboardType="number-pad" style={styles.half} />
        </View>
        <View style={styles.total}>
          <Txt size={tokens.font.size.small} color={C.muted}>
            Total
          </Txt>
          <Txt heading weight="700" size={tokens.font.size.title}>
            {total !== null ? formatDuration(total) : '—'}
          </Txt>
        </View>
      </Card>
      <Group title="How rested do you feel?" strong>
        <Rating value={quality} onChange={setQuality} minLabel="Exhausted" maxLabel="Fully rested" />
      </Group>
      <Group title="Woke up during the night?" strong>
        <ChipRow>
          {WAKE.map((w) => (
            <Chip key={w.v} label={w.label} selected={wakeUps === w.v} onPress={() => setWakeUps(w.v)} />
          ))}
        </ChipRow>
      </Group>
      <Field label="Anything that affected your sleep?" value={note} onChangeText={setNote} multiline placeholder="Noise, light, stress…" />
      {quality === null ? (
        <Txt size={tokens.font.size.caption} color={C.muted}>
          Pick how rested you feel to save.
        </Txt>
      ) : null}
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  two: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  total: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
});
