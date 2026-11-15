import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { Chip, Field } from '@/components/Inputs';
import { ChipRow, LogScreen, Note, SaveButton, goBackTo } from '@/components/LogKit';
import { Txt } from '@/components/Txt';
import { getAstronaut, getLogs, getNow, getToday, getTodayLogs, saveDailyLog } from '@/data/api';
import { hhmm, isoAt, maskTime, parseHHMM } from '@/data/format';
import { useData } from '@/data/store';
import type { RadiationData } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

/** Log dosimeter: personal/area, value, read at, µSv/mSv, simulated badge scan. */
export default function RadiationAdd() {
  const { me, existing, last } = useData(() => ({
    me: getAstronaut(),
    existing: getTodayLogs('radiation')[0],
    last: getLogs({ type: 'radiation' }).at(-1),
  }));
  const [source, setSource] = useState<RadiationData['source']>(existing?.data.source ?? 'personal');
  const [value, setValue] = useState(existing ? String(existing.data.value) : '');
  const [readAt, setReadAt] = useState(existing ? hhmm(existing.timestamp) : hhmm(getNow()));
  const [unit, setUnit] = useState<RadiationData['unit']>(existing?.data.unit ?? 'uSv');
  const [scanned, setScanned] = useState(false);
  const num = Number(value.replace(',', '.'));
  const valid = value !== '' && Number.isFinite(num) && num > 0 && parseHHMM(readAt) !== null;

  const scan = () => {
    // Simulated badge scan: last reading ± a few µSv.
    const base = last?.data.doseUsv ?? 40;
    setValue(String(Math.round(base + (Math.random() * 6 - 3))));
    setUnit('uSv');
    setSource('personal');
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
        <CardTitle title="Dosimeter reading" />
        <ChipRow>
          <Chip label="Personal dosimeter" selected={source === 'personal'} onPress={() => setSource('personal')} />
          <Chip label="Area monitor" selected={source === 'area'} onPress={() => setSource('area')} />
        </ChipRow>
        <View style={styles.two}>
          <Field label="Value" value={value} onChangeText={(t) => setValue(t.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad" placeholder="38" style={{ flex: 1.3 }} />
          <Field label="Read at" value={readAt} onChangeText={(t) => setReadAt(maskTime(t))} keyboardType="number-pad" style={{ flex: 1 }} />
        </View>
        <ChipRow>
          <Chip label="µSv" selected={unit === 'uSv'} onPress={() => setUnit('uSv')} />
          <Chip label="mSv" selected={unit === 'mSv'} onPress={() => setUnit('mSv')} />
        </ChipRow>
        <Txt size={tokens.font.size.caption} color={C.muted}>
          {scanned
            ? `Scanned from badge ${me.devices.dosimeterBadgeId} (simulated).`
            : `Copy the value shown on your badge (ID ${me.devices.dosimeterBadgeId}).`}
        </Txt>
      </Card>
      <SecondaryButton label="Scan badge instead" icon="camera" onPress={scan} />
      <Note tone="muted">Values are illustrative: NASA sources set no fixed limit for long missions.</Note>
    </LogScreen>
  );
}

const styles = StyleSheet.create({ two: { flexDirection: 'row', gap: 8 } });
