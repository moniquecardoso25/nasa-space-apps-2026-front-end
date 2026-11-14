import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LogStateButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { Ring, WeekBars } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { ListRow, LogScreen, SavedBanner } from '@/components/LogKit';
import { Txt } from '@/components/Txt';
import { dateOfDay, getLogs, getMission, getToday, getTodayLogs } from '@/data/api';
import { EFFORT_LABEL, exerciseMinutes } from '@/data/derived';
import { hhmm, weekdayOfDay } from '@/data/format';
import { useData } from '@/data/store';
import { C, X, tokens } from '@/theme/tokens';

const EQUIP: Record<string, string> = { resistive_device: 'resistive device', treadmill: 'treadmill', cycle: 'cycle' };

export default function ExerciseOverview() {
  const d = useData(() => {
    const today = getToday();
    const mission = getMission();
    // Calendar week Mon → Sun around today.
    const dow = (dateOfDay(today).getUTCDay() + 6) % 7; // 0 = Mon
    const week = Array.from({ length: 7 }, (_, i) => today - dow + i);
    const mins = week.map((day) => (day >= 1 && day <= today ? exerciseMinutes(day) : 0));
    return {
      today,
      week,
      mins,
      done: week.filter((day, i) => day < today && mins[i] > 0).length + (mins[dow] > 0 ? 1 : 0),
      minutes: exerciseMinutes(today),
      goal: mission.goals.exerciseMinPerDay,
      daysGoal: mission.goals.exerciseDaysPerWeek,
      sessions: getTodayLogs('exercise'),
      anyLogs: getLogs({ type: 'exercise' }).length,
    };
  });
  const toGo = Math.max(0, d.goal - d.minutes);
  const reached = d.minutes >= d.goal;

  return (
    <LogScreen
      title="Exercise"
      footer={
        <LogStateButton
          logged={reached}
          logLabel="Log a session"
          loggedText="Daily goal reached"
          editLabel="Add"
          onLog={() => router.push('/logs/exercise/add')}
          onEdit={() => router.push('/logs/exercise/add')}
        />
      }>
      <SavedBanner types={['exercise']} />
      <Card style={styles.ringCard} gap={14}>
        <View style={styles.ringWrap} accessibilityLabel={`${d.minutes} of ${d.goal} minutes today`}>
          <Ring value={d.minutes} max={d.goal} size={132} stroke={12} />
          <View style={styles.ringText}>
            <Txt heading weight="700" size={tokens.font.size.display}>
              {d.minutes}
            </Txt>
            <Txt size={tokens.font.size.small} color={C.muted}>
              of {d.goal} min
            </Txt>
          </View>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt weight="700" size={tokens.ext.fontSize.label}>
            Today · {reached ? 'goal reached' : `${toGo} min to go`}
          </Txt>
          <Txt size={tokens.font.size.small} color={C.muted}>
            This week: {d.done} of {d.daysGoal} days done
          </Txt>
          <Txt size={tokens.font.size.small} color={C.muted} lh={1.35}>
            ISS crews train about 1.5 h a day, 6–7 days a week.
          </Txt>
          <View style={styles.strip}>
            {d.week.map((day, i) => {
              const isToday = day === d.today;
              const future = day > d.today || day < 1;
              const done = d.mins[i] > 0;
              const style = done
                ? { backgroundColor: C.teal, borderColor: C.teal }
                : isToday
                  ? { borderColor: C.gold }
                  : future
                    ? { borderColor: C.track, borderStyle: 'dashed' as const }
                    : { backgroundColor: X.dangerIcon, borderColor: C.danger };
              return (
                <View key={day} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={[styles.dayDot, style]}>{done ? <Icon name="check" size={12} color={C.bg} strokeWidth={3} /> : null}</View>
                  <Txt size={tokens.font.size.tiny} weight={isToday ? '700' : '400'} color={isToday ? C.text : C.muted}>
                    {isToday ? 'Today' : weekdayOfDay(day).charAt(0)}
                  </Txt>
                </View>
              );
            })}
          </View>
        </View>
      </Card>
      <Card gap={0}>
        <CardTitle title="Today" />
        {d.sessions.length === 0 ? (
          <Txt size={tokens.font.size.small} color={C.muted} style={{ paddingTop: 10 }}>
            No sessions yet today.
          </Txt>
        ) : null}
        {d.sessions.map((s, i) => (
          <ListRow
            key={s.id}
            first={i === 0}
            icon={s.data.modality === 'resistive' ? 'zap' : 'activity'}
            title={s.data.modality === 'resistive' ? 'Resistive' : `Aerobic · ${EQUIP[s.data.equipment]}`}
            sub={`${hhmm(s.timestamp)} · ${EFFORT_LABEL[s.data.effort]}`}
            right={
              <Txt weight="700" size={tokens.font.size.screenTitle}>
                {s.data.durationMin} min
              </Txt>
            }
          />
        ))}
      </Card>
      <Card gap={10}>
        <CardTitle
          title="This week"
          right={
            <Txt size={tokens.font.size.caption} color={C.muted}>
              minutes
            </Txt>
          }
        />
        <WeekBars
          values={d.mins.map((m, i) => (d.week[i] > d.today ? null : m || 1))}
          labels={d.week.map(weekdayOfDay)}
          max={d.goal * 1.25}
          target={d.goal}
          targetLabel={`target ${d.goal} min`}
          todayIndex={d.week.indexOf(d.today)}
          colorFor={(v) => (v >= d.goal ? C.teal : C.warning)}
        />
      </Card>
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  ringCard: { flexDirection: 'row', alignItems: 'center' },
  ringWrap: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center' },
  ringText: { position: 'absolute', alignItems: 'center' },
  strip: { flexDirection: 'row', gap: 2, marginTop: 4 },
  dayDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
