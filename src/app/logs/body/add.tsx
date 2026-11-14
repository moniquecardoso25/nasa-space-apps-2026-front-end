import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, CardTitle } from '@/components/Card';
import { Chip, Field, Segmented } from '@/components/Inputs';
import { ChipRow, LogScreen, SaveButton, goBackTo } from '@/components/LogKit';
import { Txt } from '@/components/Txt';
import { addLog, getAstronaut, getNow, getToday } from '@/data/api';
import { BODY_METRICS, deltaVsBaseline, measurementStatus, type BodyMetricDef } from '@/data/derived';
import { hhmm, isoAt, maskTime, parseHHMM } from '@/data/format';
import { useData } from '@/data/store';
import type { Metric } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

/** Add to Body · Measurement tab. Already-logged metrics are greyed (dashed ✓). */
export default function BodyAdd() {
  const params = useLocalSearchParams<{ metric?: Metric }>();
  const { status, me } = useData(() => ({
    status: Object.fromEntries(BODY_METRICS.map((m) => [m.metric, measurementStatus(m)])) as Record<Metric, ReturnType<typeof measurementStatus>>,
    me: getAstronaut(),
  }));
  const firstOpen = BODY_METRICS.find((m) => !status[m.metric].upToDate)?.metric ?? 'blood_pressure';
  const [metric, setMetric] = useState<Metric>(params.metric && !status[params.metric]?.upToDate ? params.metric : firstOpen);
  const def = BODY_METRICS.find((m) => m.metric === metric) as BodyMetricDef;
  const restingBp = me.baseline.restingBp.split('/');
  const [sys, setSys] = useState(restingBp[0] ?? '');
  const [dia, setDia] = useState(restingBp[1] ?? '');
  const [pulse, setPulse] = useState(String(me.baseline.restingHr));
  const [value, setValue] = useState('');
  const [at, setAt] = useState(hhmm(getNow()));

  const isBp = metric === 'blood_pressure';
  const num = Number(value.replace(',', '.'));
  const valid =
    parseHHMM(at) !== null &&
    (isBp ? Number(sys) > 50 && Number(dia) > 30 && Number(pulse) > 20 : value !== '' && Number.isFinite(num) && num > 0);

  const save = () => {
    if (!valid) return;
    addLog(
      'measurement',
      isBp
        ? { metric, cadence: 'daily', values: { systolic: Number(sys), diastolic: Number(dia), pulse: Number(pulse) } }
        : { metric, cadence: 'weekly', values: { value: num, unit: def.unit }, deltaVsBaselinePct: deltaVsBaseline(def, num) },
      { timestamp: isoAt(getToday(), at), environmentId: metric === 'strength' || metric === 'aerobic' ? 'gym' : 'lab' },
    );
    goBackTo('/logs/body');
  };

  return (
    <LogScreen
      title="Add to Body"
      backHref="/logs/body"
      gap={14}
      footer={<SaveButton label={`Save ${def.short.toLowerCase()}`} onPress={save} disabled={!valid} />}>
      <Segmented
        items={[
          { value: 'measurement', label: 'Measurement' },
          { value: 'injury', label: 'Injury' },
        ]}
        selected="measurement"
        onChange={(v) => v === 'injury' && router.replace('/logs/body/injury')}
      />
      <Txt size={tokens.font.size.small} color={C.muted}>
        Greyed items are already logged this week.
      </Txt>
      <ChipRow>
        {BODY_METRICS.map((m) => (
          <Chip key={m.metric} label={m.short} selected={metric === m.metric} disabled={status[m.metric].upToDate} onPress={() => setMetric(m.metric)} />
        ))}
      </ChipRow>
      <Card gap={10}>
        <CardTitle
          title={def.label.replace(' test', '')}
          right={
            <Txt size={tokens.font.size.caption} color={C.muted}>
              {def.unit}
            </Txt>
          }
        />
        {isBp ? (
          <View style={styles.row}>
            <Field label="Systolic" value={sys} onChangeText={(t) => setSys(t.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" style={styles.flex} />
            <Field label="Diastolic" value={dia} onChangeText={(t) => setDia(t.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" style={styles.flex} />
            <Field label="Pulse" value={pulse} unit="bpm" onChangeText={(t) => setPulse(t.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" style={styles.flex} />
          </View>
        ) : (
          <Field
            label="Value"
            value={value}
            unit={def.unit}
            onChangeText={(t) => setValue(t.replace(/[^\d.,]/g, ''))}
            keyboardType="decimal-pad"
            placeholder={String(def.baseline(me))}
          />
        )}
        <Field label="Measured at" value={at} onChangeText={(t) => setAt(maskTime(t))} keyboardType="number-pad" />
        <Txt size={tokens.font.size.caption} color={C.muted}>
          {isBp
            ? 'Measure seated, after 5 minutes of rest.'
            : `Pre-flight baseline: ${def.baseline(me)} ${def.unit}.${value && num > 0 ? ` Change: ${deltaVsBaseline(def, num)}%.` : ''}`}
        </Txt>
      </Card>
    </LogScreen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 } });
