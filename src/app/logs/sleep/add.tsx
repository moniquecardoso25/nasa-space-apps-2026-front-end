import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, CardTitle } from '@/components/Card';
import { Chip, Field, Rating } from '@/components/Inputs';
import { ChipRow, Group, LogScreen, SaveButton, goBackTo } from '@/components/LogKit';
import { Badge } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { getLogs, getToday, getTodayLogs, saveDailyLog } from '@/data/api';
import { readDevices } from '@/data/plans';
import { formatDuration, hhmm, isoAt, maskTime, parseHHMM, sleepMinutes } from '@/data/format';
import { useData } from '@/data/store';
import type { SleepData } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

const WAKE: { v: SleepData['wakeUps']; label: string }[] = [
  { v: 'none', label: 'No' },
  { v: '1-2', label: '1–2 times' },
  { v: '3+', label: '3+ times' },
];

/** Log sleep: bed/wake and wake-ups come from the band (demo), so the astronaut only confirms + rates how rested. */
export default function SleepAdd() {
  const { existing, last } = useData(() => ({ existing: getTodayLogs('sleep')[0], last: getLogs({ type: 'sleep' }).at(-1) }));
  // New night: the wrist band (demo) already measured bed / wake times and wake-ups.
  const [band] = useState(() => (existing ? null : readDevices()));
  const fromBand = !!band || !!existing?.data.band;
  const [editing, setEditing] = useState(!fromBand);
  const [bed, setBed] = useState(existing ? hhmm(existing.data.bedtime) : (band?.sleep.bed ?? '23:00'));
  const [wake, setWake] = useState(existing ? hhmm(existing.data.wakeTime) : (band?.sleep.wake ?? '07:00'));
  const [quality, setQuality] = useState<number | null>(existing?.data.quality ?? null);
  const [wakeUps, setWakeUps] = useState<SleepData['wakeUps']>(existing?.data.wakeUps ?? band?.sleep.wakeUps ?? '1-2');
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
      source: existing?.data.source ?? (band ? 'archer_band' : 'manual'),
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
        <CardTitle
          title="Last night"
          right={fromBand ? <Badge label={band ? `ARCHeR wrist band · demo · synced ${band.sync}` : 'ARCHeR wrist band · demo'} /> : null}
        />
        <View style={styles.two}>
          <Field label="Went to bed" value={bed} readOnly={!editing} onChangeText={(t) => setBed(maskTime(t))} keyboardType="number-pad" style={styles.half} />
          <Field label="Woke up" value={wake} readOnly={!editing} onChangeText={(t) => setWake(maskTime(t))} keyboardType="number-pad" style={styles.half} />
        </View>
        <View style={styles.total}>
          <Txt size={tokens.font.size.small} color={C.muted}>
            Total
          </Txt>
          <Txt heading weight="700" size={tokens.font.size.title}>
            {total !== null ? formatDuration(total) : '—'}
          </Txt>
          <View style={{ flex: 1 }} />
          {fromBand && !editing ? <Chip label="Edit times" onPress={() => setEditing(true)} /> : null}
        </View>
        {fromBand && !editing ? (
          <Txt size={tokens.font.size.caption} color={C.muted}>
            Estimated by the band from movement. Just confirm, or edit if it looks wrong.
          </Txt>
        ) : null}
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
  total: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
