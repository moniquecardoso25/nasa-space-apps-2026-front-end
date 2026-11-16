import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { Chip, Field } from '@/components/Inputs';
import { ChipRow, LogScreen, Note, SaveButton, goBackTo } from '@/components/LogKit';
import { Badge } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { getAstronaut, getLogs, getNow, getToday, getTodayLogs, saveDailyLog } from '@/data/api';
import { readDevices } from '@/data/plans';
import { hhmm, isoAt, maskTime, parseHHMM } from '@/data/format';
import { useData } from '@/data/store';
import type { RadiationData } from '@/data/types';
import { C, tokens, X } from '@/theme/tokens';

/** Log dosimeter: source (personal badge vs area monitor), dose, unit, time. Prefilled from the badge (demo). */
export default function RadiationAdd() {
  const { me, existing, last } = useData(() => ({
    me: getAstronaut(),
    existing: getTodayLogs('radiation')[0],
    last: getLogs({ type: 'radiation' }).at(-1),
  }));
  // New day: the personal badge (demo) already has this morning's reading.
  const [badge] = useState(() => (existing ? null : readDevices().radiation));
  const [source, setSource] = useState<RadiationData['source']>(existing?.data.source ?? 'personal');
  const [value, setValue] = useState(existing ? String(existing.data.value) : badge ? String(badge.value) : '');
  const [readAt, setReadAt] = useState(existing ? hhmm(existing.timestamp) : (badge?.readAt ?? hhmm(getNow())));
  const [unit, setUnit] = useState<RadiationData['unit']>(existing?.data.unit ?? 'uSv');
  const [scanned, setScanned] = useState(!!badge);
  const num = Number(value.replace(',', '.'));
  const valid = value !== '' && Number.isFinite(num) && num > 0 && parseHHMM(readAt) !== null;

  const scan = () => {
    // Simulated badge scan: last reading ± a few µSv.
    const base = last?.data.doseUsv ?? 40;
    setValue(String(Math.round(base + (Math.random() * 6 - 3))));
    setUnit('uSv');
    setSource('personal');
    setReadAt(hhmm(getNow()));
    setScanned(true);
  };

  const save = async () => {
    if (!valid) return;
    const data: RadiationData = {
      value: num,
      unit,
      doseUsv: unit === 'mSv' ? num * 1000 : num,
      source,
      badgeId: source === 'personal' ? me.devices.dosimeterBadgeId : null,
      particle: 'total',
      illustrative: true,
    };
    await saveDailyLog('radiation', data, { timestamp: isoAt(getToday(), readAt) });
    goBackTo('/logs/radiation');
  };

  return (
    <LogScreen
      title="Log dosimeter"
      backHref="/logs/radiation"
      footer={<SaveButton label={existing ? 'Save changes' : 'Save reading'} reward={existing ? 0 : 10} onPress={save} disabled={!valid} />}>
      <Card gap={10}>
        <CardTitle title="Reading" right={<Badge label="Demo data" color={C.gold} bg={X.goldSoft} />} />
        <Txt size={tokens.font.size.caption} weight="600" color={C.muted}>
          Source
        </Txt>
        <ChipRow>
          <Chip label="Personal dosimeter" selected={source === 'personal'} onPress={() => setSource('personal')} />
          <Chip label="Area monitor" selected={source === 'area'} onPress={() => setSource('area')} />
        </ChipRow>
        <Txt size={tokens.font.size.caption} color={C.muted} lh={1.4}>
          {source === 'personal'
            ? `Your badge ${me.devices.dosimeterBadgeId}: the dose your body received since the last reading.`
            : 'The module’s monitor: radiation in the room, not the dose your body received.'}
        </Txt>
        <View style={styles.two}>
          <Field
            label={source === 'personal' ? 'Dose since last reading' : 'Area dose'}
            value={value}
            onChangeText={(t) => setValue(t.replace(/[^\d.,]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="38"
            style={{ flex: 1.3 }}
          />
          <Field label="Read at" value={readAt} onChangeText={(t) => setReadAt(maskTime(t))} keyboardType="number-pad" style={{ flex: 1 }} />
        </View>
        <ChipRow>
          <Chip label="µSv" selected={unit === 'uSv'} onPress={() => setUnit('uSv')} />
          <Chip label="mSv" selected={unit === 'mSv'} onPress={() => setUnit('mSv')} />
        </ChipRow>
        <Txt size={tokens.font.size.caption} color={C.muted}>
          {scanned ? `Read from badge ${me.devices.dosimeterBadgeId} at ${readAt} (simulated). Just confirm.` : `Copy the value shown on your badge (ID ${me.devices.dosimeterBadgeId}).`}
        </Txt>
      </Card>
      <SecondaryButton label="Read the badge again" icon="radiation" onPress={scan} />
      <Note tone="muted">Illustrative values, no safe / unsafe colors: NASA sources set no fixed limit for long missions.</Note>
    </LogScreen>
  );
}

const styles = StyleSheet.create({ two: { flexDirection: 'row', gap: 8 } });
