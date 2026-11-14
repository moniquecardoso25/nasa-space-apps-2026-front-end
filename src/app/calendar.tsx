import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ComingSoon, Greyed, LogScreen } from '@/components/LogKit';
import { Txt } from '@/components/Txt';
import { dateOfDay, dayOfDate, getCalendar, getLogs, getMission, getToday } from '@/data/api';
import { hhmm, monthName, weekdayOfDay } from '@/data/format';
import { useData } from '@/data/store';
import type { CalendarEvent } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

const SUB: Record<CalendarEvent['kind'], (e: CalendarEvent, today: boolean) => string> = {
  test: (_, t) => `Weekly · ${t ? 'due today' : 'scheduled'}`,
  scan: (e) => `Weekly · ${monthName(new Date(e.date).getUTCMonth())} ${new Date(e.date).getUTCDate()}`,
  winddown: () => 'Set by Orbi · cabin lights dim',
  call: (e) => `${monthName(new Date(e.date).getUTCMonth())} ${new Date(e.date).getUTCDate()} · ${hhmm(e.date)}`,
};

function EventRow({ e, left, today }: { e: CalendarEvent; left: string; today: boolean }) {
  return (
    <View style={styles.eventRow}>
      <Txt weight="700" size={tokens.font.size.body} style={{ width: 56, paddingTop: 12 }}>
        {left}
      </Txt>
      <View style={[styles.event, today && e.kind === 'test' && { borderColor: C.muted }]}>
        <View style={styles.bar} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt weight="700" size={tokens.font.size.body}>
            {e.title}
          </Txt>
          <Txt size={tokens.font.size.small} color={C.muted}>
            {SUB[e.kind](e, today)}
          </Txt>
        </View>
        <Icon name="chevronRight" size={16} color={C.muted} />
      </View>
    </View>
  );
}

/** Calendar · coming soon: month grid with check-in days and events, all greyed. */
export default function Calendar() {
  const d = useData(() => {
    const mission = getMission();
    const today = getToday();
    const todayDate = dateOfDay(today);
    const y = todayDate.getUTCFullYear();
    const m = todayDate.getUTCMonth();
    const first = new Date(Date.UTC(y, m, 1));
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const checkins = new Set(getLogs({ type: 'mood' }).map((l) => l.missionDay));
    const events = getCalendar();
    const cells = Array.from({ length: first.getUTCDay() + daysInMonth }, (_, i) => {
      const dom = i - first.getUTCDay() + 1;
      if (dom < 1) return null;
      const iso = new Date(Date.UTC(y, m, dom)).toISOString();
      const md = dayOfDate(iso);
      return {
        dom,
        isToday: md === today,
        future: md > today,
        checkin: checkins.has(md) && md >= 1,
        events: events.filter((e) => dayOfDate(e.date) === md).length,
      };
    });
    return {
      title: `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]} ${y}`,
      cells,
      today,
      length: mission.lengthDays,
      todayEvents: events.filter((e) => dayOfDate(e.date) === today),
      upcoming: events.filter((e) => dayOfDate(e.date) > today),
    };
  });

  return (
    <LogScreen title="Calendar" gap={14}>
      <ComingSoon>Each module already shows its own history.</ComingSoon>
      <Greyed style={{ gap: 14 }}>
        <Card gap={8} shadow={false}>
          <View style={styles.between}>
            <Txt heading weight="700" size={tokens.ext.fontSize.label}>
              {d.title}
            </Txt>
            <Txt size={tokens.font.size.caption} color={C.muted}>
              Day {d.today} of {d.length}
            </Txt>
          </View>
          <View style={styles.week}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
              <Txt key={i} size={tokens.font.size.tiny} color={C.muted} align="center" style={styles.cellW}>
                {w}
              </Txt>
            ))}
          </View>
          <View style={styles.grid}>
            {d.cells.map((c, i) =>
              c ? (
                <View key={i} style={[styles.cell, c.isToday && styles.today, c.future && { opacity: 0.6 }]}>
                  <Txt weight={c.isToday ? '700' : '400'} size={tokens.font.size.body}>
                    {c.dom}
                  </Txt>
                  {c.checkin && !c.isToday ? (
                    <View style={styles.tick}>
                      <Icon name="check" size={10} color={C.muted} strokeWidth={3} />
                    </View>
                  ) : null}
                  {c.events ? (
                    <View style={styles.dots}>
                      {Array.from({ length: Math.min(3, c.events) }, (_, k) => (
                        <View key={k} style={styles.dot} />
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                <View key={i} style={styles.cellEmpty} />
              ),
            )}
          </View>
          <View style={[styles.week, { gap: 16, justifyContent: 'flex-start' }]}>
            <View style={styles.legend}>
              <Icon name="check" size={12} color={C.muted} />
              <Txt size={tokens.font.size.caption} color={C.muted}>
                Check-in done
              </Txt>
            </View>
            <View style={styles.legend}>
              <View style={styles.dot} />
              <Txt size={tokens.font.size.caption} color={C.muted}>
                Event
              </Txt>
            </View>
          </View>
        </Card>
        <Txt weight="700" size={tokens.font.size.body} color={C.muted}>
          Today · {weekdayOfDay(d.today)} {dateOfDay(d.today).getUTCDate()}
        </Txt>
        {d.todayEvents.map((e) => (
          <EventRow key={e.id} e={e} left={hhmm(e.date)} today />
        ))}
        <Txt weight="700" size={tokens.font.size.body} color={C.muted}>
          Coming up
        </Txt>
        {d.upcoming.map((e) => (
          <EventRow key={e.id} e={e} left={weekdayOfDay(dayOfDate(e.date))} today={false} />
        ))}
      </Greyed>
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  cellW: { width: '13%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, justifyContent: 'space-between' },
  cell: {
    width: '13%',
    aspectRatio: 1.05,
    borderRadius: tokens.radius.small,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: { width: '13%', aspectRatio: 1.05 },
  today: { backgroundColor: C.primary, borderColor: C.primary },
  tick: { position: 'absolute', top: 3, right: 4 },
  dots: { position: 'absolute', bottom: 4, flexDirection: 'row', gap: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.muted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventRow: { flexDirection: 'row', gap: 8 },
  event: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: C.primary },
});
