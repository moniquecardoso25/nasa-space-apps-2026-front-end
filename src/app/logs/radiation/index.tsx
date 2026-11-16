import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LogStateButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { WeekBars } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { ListRow, LogScreen, SavedBanner } from '@/components/LogKit';
import { Badge } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { getAstronaut, getEnvironmentReadings, getLogs, getMission, getToday, isLoggedToday } from '@/data/api';
import { radiationTotalMsv } from '@/data/derived';
import { hhmm, weekdayOfDay } from '@/data/format';
import { useData } from '@/data/store';
import { C, tokens, X } from '@/theme/tokens';

const NEUTRON_SHARE = 0.3; // CSA: neutrons ≈30% of ISS radiation

export default function RadiationOverview() {
  const d = useData(() => {
    const today = getToday();
    const days = Array.from({ length: 7 }, (_, i) => today - 6 + i).filter((x) => x >= 1);
    const personal = getLogs({ type: 'radiation' }).filter((l) => l.data.source === 'personal');
    const byDay = new Map<number, number>();
    personal.forEach((l) => byDay.set(l.missionDay, (byDay.get(l.missionDay) ?? 0) + l.data.doseUsv));
    const env = 'lab';
    const reading = getEnvironmentReadings()
      .filter((r) => r.environmentId === env)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .at(-1);
    return {
      today,
      days,
      // a day without a badge reading is unknown (null), not a zero dose
      values: days.map((day) => byDay.get(day) ?? null),
      todayDose: byDay.get(today) ?? null,
      todayLog: personal.filter((l) => l.missionDay === today).at(-1),
      badgeId: getAstronaut().devices.dosimeterBadgeId,
      total: radiationTotalMsv(),
      logged: isLoggedToday('radiation'),
      recent: getLogs({ type: 'radiation' }).slice(-3).reverse(),
      reading,
      envName: getMission().environments.find((e) => e.id === env)?.name ?? 'Lab module',
    };
  });
  const max = Math.max(60, ...d.values.map((v) => v ?? 0)) * 1.15;
  const dayText = (day: number) => (day === d.today ? 'Today' : day === d.today - 1 ? 'Yesterday' : weekdayOfDay(day));

  return (
    <LogScreen
      title="Radiation"
      footer={<LogStateButton logged={d.logged} onLog={() => router.push('/logs/radiation/add')} onEdit={() => router.push('/logs/radiation/add')} />}>
      <SavedBanner types={['radiation']} />
      <View style={styles.tiles}>
        <Card gap={2} style={{ flex: 1 }}>
          <Txt size={tokens.font.size.caption} color={C.muted}>
            Mission total
          </Txt>
          <Txt heading weight="700" size={tokens.ext.fontSize.stat}>
            {d.total.toFixed(2)} mSv
          </Txt>
          <Txt size={tokens.font.size.tiny} color={C.muted}>
            Cumulative · personal badge · days 1–{d.today}
          </Txt>
        </Card>
        <Card gap={2} style={{ flex: 1 }}>
          <Txt size={tokens.font.size.caption} color={C.muted}>
            Today
          </Txt>
          <Txt heading weight="700" size={tokens.ext.fontSize.stat} color={d.todayDose === null ? C.muted : C.text}>
            {d.todayDose === null ? 'No reading' : `${d.todayDose} µSv`}
          </Txt>
          <Txt size={tokens.font.size.tiny} color={C.muted}>
            {d.todayLog ? `Daily dose · badge ${d.badgeId} · ${hhmm(d.todayLog.timestamp)}` : `Daily dose · badge ${d.badgeId}`}
          </Txt>
        </Card>
      </View>
      <Card gap={8}>
        <CardTitle title="Daily dose this week" right={<Badge label="Demo data" color={C.gold} bg={X.goldSoft} />} />
        <Txt size={tokens.font.size.caption} color={C.muted}>
          µSv per day · personal dosimeter · – = no reading
        </Txt>
        <WeekBars values={d.values} labels={d.days.map(weekdayOfDay)} max={max} todayIndex={d.days.length - 1} colorFor={() => C.primary} />
        <Txt size={tokens.font.size.caption} color={C.muted} lh={1.4}>
          NASA gives no fixed limits for long missions, so values here are illustrative and not colored as safe / unsafe.
        </Txt>
      </Card>
      {d.reading ? (
        <Card gap={8}>
          <View style={styles.row6}>
            <Icon name="planet" size={16} color={C.primary} />
            <Txt size={tokens.font.size.small} color={C.muted}>
              Dose rate · area monitor (the room, not your body)
            </Txt>
          </View>
          <Txt weight="700" size={tokens.ext.fontSize.stat}>
            {d.envName} · {d.reading.radiationUsvH.toFixed(1)} µSv/h
          </Txt>
          <View style={styles.mix} accessibilityLabel="Particle mix: neutrons about 30 percent">
            <View style={{ flex: NEUTRON_SHARE, backgroundColor: C.gold }} />
            <View style={{ flex: 1 - NEUTRON_SHARE, backgroundColor: C.primary }} />
          </View>
          <View style={[styles.row6, { flexWrap: 'wrap' }]}>
            <View style={[styles.sq, { backgroundColor: C.gold }]} />
            <Txt size={tokens.font.size.caption} color={C.muted}>
              Neutrons ~30% of ISS radiation (CSA) ·
            </Txt>
            <View style={[styles.sq, { backgroundColor: C.primary }]} />
            <Txt size={tokens.font.size.caption} color={C.muted}>
              Other
            </Txt>
          </View>
        </Card>
      ) : null}
      <Card gap={0}>
        <CardTitle title="Recent readings" />
        {d.recent.map((l, i) => (
          <View key={l.id} style={[styles.reading, i > 0 && styles.sep]}>
            <Txt size={tokens.font.size.body} style={{ flex: 1.2 }}>
              {dayText(l.missionDay)} {hhmm(l.timestamp)}
            </Txt>
            <Txt size={tokens.font.size.body} color={C.muted} style={{ flex: 1 }}>
              {l.data.source === 'personal' ? 'Personal badge' : 'Area monitor'}
            </Txt>
            <Txt weight="700" size={tokens.font.size.body}>
              {l.data.value} {l.data.unit === 'uSv' ? 'µSv' : 'mSv'}
            </Txt>
          </View>
        ))}
        {d.recent.length === 0 ? <ListRow first icon="radiation" title="No readings yet" /> : null}
      </Card>
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 8 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mix: { flexDirection: 'row', height: 10, borderRadius: tokens.radius.pill, overflow: 'hidden' },
  sq: { width: 10, height: 10 },
  reading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  sep: { borderTopWidth: 1, borderTopColor: C.track },
});
