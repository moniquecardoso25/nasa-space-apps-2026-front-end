import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LogStateButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { ProgressBar, WeekBars } from '@/components/Charts';
import { LogScreen, Note, SavedBanner, Stars } from '@/components/LogKit';
import { Txt } from '@/components/Txt';
import { getLogs, getMission, getToday, getTodayLogs } from '@/data/api';
import { MACRO_GOALS, menuFatigue } from '@/data/derived';
import { formatCoins, hhmm, weekdayOfDay } from '@/data/format';
import { useData } from '@/data/store';
import { C, tokens } from '@/theme/tokens';

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Txt size={tokens.font.size.caption} color={C.muted}>
        {label}
      </Txt>
      <Txt weight="700" size={tokens.font.size.small}>
        {value} / {goal} g
      </Txt>
      <ProgressBar value={value / goal} color={color} height={5} />
    </View>
  );
}

export default function MealsOverview() {
  const d = useData(() => {
    const today = getToday();
    const days = Array.from({ length: 7 }, (_, i) => today - 6 + i).filter((x) => x >= 1);
    const meals = getLogs({ type: 'meal', fromDay: days[0] });
    const kcalByDay = days.map((day) => meals.filter((m) => m.missionDay === day).reduce((s, m) => s + m.data.kcal, 0));
    const todayMeals = getTodayLogs('meal');
    const sum = (k: 'kcal' | 'proteinG' | 'carbsG' | 'fatG') => todayMeals.reduce((s, m) => s + m.data[k], 0);
    return {
      days,
      kcalByDay,
      todayMeals,
      kcal: sum('kcal'),
      protein: sum('proteinG'),
      carbs: sum('carbsG'),
      fat: sum('fatG'),
      goal: getMission().goals.kcalPerDay,
      fatigue: menuFatigue(),
    };
  });
  const n = d.todayMeals.length;

  return (
    <LogScreen
      title="Meals"
      footer={
        <LogStateButton
          logged={n > 0}
          logLabel="Log a meal"
          loggedText={`${n} meal${n === 1 ? '' : 's'} logged today`}
          editLabel="Add"
          onLog={() => router.push('/logs/meals/add')}
          onEdit={() => router.push('/logs/meals/add')}
        />
      }>
      <SavedBanner types={['meal']} />
      <Card gap={10}>
        <CardTitle
          title="Today"
          right={
            <Txt size={tokens.font.size.caption} color={C.muted}>
              Goal {formatCoins(d.goal)} kcal
            </Txt>
          }
        />
        <View style={styles.big}>
          <Txt heading weight="700" size={tokens.ext.fontSize.hero}>
            {formatCoins(d.kcal)}
          </Txt>
          <Txt size={tokens.font.size.title} color={C.muted}>
            kcal
          </Txt>
        </View>
        <ProgressBar value={d.kcal / d.goal} color={C.primary} height={8} />
        <View style={styles.macros}>
          <Macro label="Protein" value={d.protein} goal={MACRO_GOALS.proteinG} color={C.teal} />
          <Macro label="Carbs" value={d.carbs} goal={MACRO_GOALS.carbsG} color={C.primary} />
          <Macro label="Fat" value={d.fat} goal={MACRO_GOALS.fatG} color={C.gold} />
        </View>
      </Card>
      <Card gap={0}>
        <CardTitle title="Meals today" />
        {n === 0 ? (
          <Txt size={tokens.font.size.small} color={C.muted} style={{ paddingTop: 10 }}>
            No meals logged yet today.
          </Txt>
        ) : null}
        {d.todayMeals.map((m, i) => (
          <View key={m.id} style={[styles.meal, i > 0 && styles.sep]}>
            <Txt size={tokens.font.size.small} color={C.muted} style={{ width: 54 }}>
              {hhmm(m.timestamp)}
            </Txt>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt weight="600" size={tokens.font.size.body} numberOfLines={1}>
                {m.data.name}
              </Txt>
              <Stars value={m.data.tasteRating} />
            </View>
            <Txt weight="700" size={tokens.font.size.body}>
              {m.data.kcal}
            </Txt>
          </View>
        ))}
      </Card>
      <Card gap={10}>
        <CardTitle
          title="This week"
          right={
            <Txt size={tokens.font.size.caption} color={C.muted}>
              kcal
            </Txt>
          }
        />
        <WeekBars
          values={d.kcalByDay}
          labels={d.days.map(weekdayOfDay)}
          max={d.goal * 1.25}
          target={d.goal}
          targetLabel={`target ${d.goal}`}
          todayIndex={d.days.length - 1}
          colorFor={(v) => (v >= d.goal ? C.primary : C.warning)}
        />
      </Card>
      {d.fatigue ? <Note tone="warning">{d.fatigue}</Note> : null}
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  big: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  macros: { flexDirection: 'row', gap: 16 },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  sep: { borderTopWidth: 1, borderTopColor: C.track },
});
