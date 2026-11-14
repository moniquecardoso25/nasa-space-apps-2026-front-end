import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, CardTitle } from '@/components/Card';
import { Chip, Field } from '@/components/Inputs';
import { ChipRow, LogScreen, SaveButton, Stars, goBackTo } from '@/components/LogKit';
import { Txt } from '@/components/Txt';
import { addLog, getNow, getToday } from '@/data/api';
import { estimateMacros, MEAL_PICKS } from '@/data/derived';
import { hhmm, isoAt, maskTime, parseHHMM } from '@/data/format';
import { C, tokens } from '@/theme/tokens';

/** Log a meal: what you ate + quick picks, kcal, time, taste 1–5 stars. */
export default function MealsAdd() {
  const [name, setName] = useState('');
  const [picks, setPicks] = useState<string[]>([]);
  const [kcal, setKcal] = useState('');
  const [kcalTouched, setKcalTouched] = useState(false);
  const [time, setTime] = useState(hhmm(getNow()));
  const [taste, setTaste] = useState(0);
  const valid = name.trim().length > 1 && Number(kcal) > 0 && parseHHMM(time) !== null && taste > 0;

  const togglePick = (p: string) => {
    const next = picks.includes(p) ? picks.filter((x) => x !== p) : [...picks, p];
    setPicks(next);
    setName(next.join(' + '));
    if (!kcalTouched) {
      const sum = next.reduce((s, n) => s + (MEAL_PICKS.find((m) => m.name === n)?.kcal ?? 0), 0);
      setKcal(sum ? String(sum) : '');
    }
  };

  const save = () => {
    if (!valid) return;
    const k = Number(kcal);
    addLog(
      'meal',
      {
        name: name.trim(),
        items: picks.length ? picks.map((p) => p.toLowerCase()) : name.split('+').map((s) => s.trim().toLowerCase()),
        kcal: k,
        ...estimateMacros(k),
        tasteRating: taste,
      },
      { timestamp: isoAt(getToday(), time), environmentId: 'galley' },
    );
    goBackTo('/logs/meals');
  };

  return (
    <LogScreen title="Log a meal" backHref="/logs/meals" gap={14} footer={<SaveButton label="Save meal" onPress={save} disabled={!valid} />}>
      <Field label="What did you eat?" value={name} onChangeText={setName} placeholder="Beef stew + tortilla" />
      <ChipRow>
        {MEAL_PICKS.slice(0, 6).map((p) => (
          <Chip key={p.name} label={p.name} selected={picks.includes(p.name)} onPress={() => togglePick(p.name)} />
        ))}
      </ChipRow>
      <View style={styles.two}>
        <Field
          label="Calories"
          value={kcal}
          unit="kcal"
          onChangeText={(t) => {
            setKcalTouched(true);
            setKcal(t.replace(/\D/g, '').slice(0, 4));
          }}
          keyboardType="number-pad"
          style={styles.flex}
        />
        <Field label="Time" value={time} onChangeText={(t) => setTime(maskTime(t))} keyboardType="number-pad" style={styles.flex} />
      </View>
      <Card gap={10}>
        <CardTitle title="How did it taste?" />
        <Stars value={taste} onChange={setTaste} size={32} gap={4} />
        <Txt size={tokens.font.size.caption} color={C.muted}>
          Taste ratings help spot menu fatigue.
        </Txt>
      </Card>
    </LogScreen>
  );
}

const styles = StyleSheet.create({ two: { flexDirection: 'row', gap: 10 }, flex: { flex: 1 } });
