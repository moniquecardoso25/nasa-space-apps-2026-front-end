import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Card, CardTitle } from '@/components/Card';
import { ProgressBar } from '@/components/Charts';
import { Icon, type IconName } from '@/components/Icon';
import { Chip } from '@/components/Inputs';
import { HealthTag, levelColor } from '@/components/Pills';
import { LogoMark } from '@/components/Space';
import { Txt } from '@/components/Txt';
import { getAlerts, getAstronauts, getDailySummary, getEnvironmentReadings, getLogs, getMission, getToday, healthTag } from '@/data/api';
import { MOOD_TITLE, radiationTotalMsv } from '@/data/derived';
import { formatDuration } from '@/data/format';
import { useData } from '@/data/store';
import type { Alert, Level } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

const ALERT_LABEL: Record<Alert['type'], string> = {
  poor_sleep: 'Sleep low',
  low_mood: 'Mood dip',
  bone_loss: 'Bone loss',
  fitness_drop: 'Fitness drop',
  menu_fatigue: 'Menu fatigue',
  injury: 'Injury',
  device_check: 'Device check',
};
const alertLevel = (a: Alert): Level => (a.level === 'high' ? 'alert' : 'warn');
const NAV: { icon: IconName; label: string }[] = [
  { icon: 'crew', label: 'Crew overview' },
  { icon: 'planet', label: 'Environments' },
  { icon: 'alert', label: 'Alerts' },
  { icon: 'calendar', label: 'Schedule' },
  { icon: 'send', label: 'Messages' },
];

/** Ground dashboard (web, fluid). Reads every astronaut; the mission control view of the mock. */
export default function Ground() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [module, setModule] = useState<string>('all');
  const [scheduled, setScheduled] = useState<string[]>([]);

  const d = useData(() => {
    const mission = getMission();
    const today = getToday();
    const crew = getAstronauts()
      .filter((a) => a.crewId !== 'TEST') // the test user is not real crew
      .map((a) => {
      const mood = getLogs({ type: 'mood', astronautId: a.id }).at(-1);
      const sleep = getLogs({ type: 'sleep', astronautId: a.id }).at(-1);
      const week = getLogs({ type: 'sleep', astronautId: a.id, fromDay: today - 6 });
      const avg = week.length ? week.reduce((s, l) => s + l.data.durationMin, 0) / week.length / 60 : 0;
      const alert = getAlerts(a.id)[0];
      return {
        a,
        score: getDailySummary(today, a.id).overallScore,
        mood: mood ? MOOD_TITLE[mood.data.level] : '—',
        sleep: sleep ? formatDuration(sleep.data.durationMin) : '—',
        avg,
        rad: radiationTotalMsv(today, a.id),
        alert,
      };
    });
    const alerts = getAstronauts()
      .flatMap((a) => getAlerts(a.id).map((al) => ({ ...al, name: a.name.split(' ')[0] })))
      .sort((x, y) => (x.level === y.level ? y.timestamp.localeCompare(x.timestamp) : x.level === 'high' ? -1 : y.level === 'high' ? 1 : x.level === 'medium' ? -1 : 1));
    const readings = mission.environments.map((env) => ({
      env,
      r: getEnvironmentReadings()
        .filter((x) => x.environmentId === env.id)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .at(-1),
    }));
    return { mission, today, crew, alerts, readings, delay: Math.round(mission.commDelaySec / 60) };
  });

  const sleepLevel = (h: number): Level => (h >= 7 ? 'ok' : h >= 5 ? 'warn' : 'alert');

  return (
    <View style={[styles.root, { flexDirection: wide ? 'row' : 'column' }]}>
      <View style={[styles.side, !wide && styles.sideNarrow]}>
        <View style={styles.brand}>
          <LogoMark size={36} />
          <Txt heading weight="700" size={tokens.font.size.screenTitle}>
            Orbi · Ground
          </Txt>
        </View>
        <View style={[{ gap: 4 }, !wide && { flexDirection: 'row', flexWrap: 'wrap' }]}>
          {NAV.map((n, i) => (
            <View key={n.label} style={[styles.nav, i === 0 && styles.navOn]}>
              <Icon name={n.icon} size={18} color={i === 0 ? C.primary : C.muted} />
              <Txt weight={i === 0 ? '700' : '500'} size={tokens.font.size.body} color={i === 0 ? C.text : C.muted}>
                {n.label}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.main}>
        <View style={styles.titleRow}>
          <View style={{ gap: 4, flex: 1 }}>
            <Txt heading weight="700" size={tokens.font.size.display} accessibilityRole="header">
              Crew overview
            </Txt>
            <Txt size={tokens.font.size.small} color={C.muted}>
              Mission {d.mission.name} · Day {d.today} · *radiation values illustrative
            </Txt>
          </View>
          <Chip label="Last 7 days" selected />
        </View>

        <Card padding={16} shadow={false}>
          <CardTitle
            title="Crew overview"
            right={
              <Txt size={tokens.font.size.caption} color={C.muted}>
                Data arrives with ~{d.delay} min delay
              </Txt>
            }
          />
          <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 640, flex: 1 }}>
              <View style={[styles.tr, styles.th]}>
                {['Crew', 'Status', 'Mood', 'Sleep', 'Radiation (mSv)*', 'Orbi alert'].map((h, i) => (
                  <Txt key={h} weight="600" size={tokens.font.size.small} color={C.muted} style={[styles.td, i === 1 && { flex: 1.4 }, i === 5 && { flex: 1.6 }]}>
                    {h}
                  </Txt>
                ))}
              </View>
              {d.crew.map((c) => (
                <View key={c.a.id} style={styles.tr}>
                  <Txt weight="700" size={tokens.font.size.body} style={styles.td}>
                    {c.a.name.split(' ')[0]}
                  </Txt>
                  <View style={[styles.td, { flex: 1.4 }]}>
                    <HealthTag {...healthTag(c.score)} />
                  </View>
                  <Txt size={tokens.font.size.body} style={styles.td}>
                    {c.mood}
                  </Txt>
                  <Txt size={tokens.font.size.body} style={styles.td}>
                    {c.sleep}
                  </Txt>
                  <Txt size={tokens.font.size.body} style={styles.td}>
                    {c.rad.toFixed(2)}
                  </Txt>
                  <Txt weight="700" size={tokens.font.size.body} color={c.alert ? levelColor(alertLevel(c.alert)) : C.muted} style={[styles.td, { flex: 1.6 }]}>
                    {c.alert ? ALERT_LABEL[c.alert.type] : '—'}
                  </Txt>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>

        <View style={[styles.two, !wide && { flexDirection: 'column' }]}>
          <Card padding={16} shadow={false} style={{ flex: 1 }} gap={0}>
            <CardTitle title="Orbi alerts" />
            {d.alerts.map((a, i) => {
              const done = scheduled.includes(a.id);
              return (
                <View key={a.id} style={[styles.alert, i > 0 && styles.sep]}>
                  <View style={[styles.dot, { backgroundColor: levelColor(alertLevel(a)) }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt size={tokens.font.size.body}>
                      <Txt weight="700" size={tokens.font.size.body}>
                        {a.name}
                      </Txt>{' '}
                      · {a.text}
                    </Txt>
                    <Txt size={tokens.font.size.small} color={C.muted}>
                      Evidence: {a.evidence.join(', ')}
                    </Txt>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setScheduled((s) => (done ? s.filter((x) => x !== a.id) : [...s, a.id]))}
                    style={[styles.btn, done && { borderColor: C.teal }]}>
                    {done ? <Icon name="check" size={14} color={C.teal} strokeWidth={3} /> : null}
                    <Txt weight="500" size={tokens.font.size.small} color={done ? C.teal : C.text}>
                      {done ? 'Check-up scheduled' : 'Schedule check-up'}
                    </Txt>
                  </Pressable>
                </View>
              );
            })}
          </Card>
          <Card padding={16} shadow={false} style={{ flex: 1 }} gap={12}>
            <CardTitle title="Sleep · 7-day average" />
            {d.crew.map((c) => (
              <View key={c.a.id} style={styles.sleepRow}>
                <Txt size={tokens.font.size.body} style={{ width: 52 }}>
                  {c.a.name.split(' ')[0]}
                </Txt>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={c.avg / 9} color={levelColor(sleepLevel(c.avg))} height={10} />
                </View>
                <Txt size={tokens.font.size.body} align="right" style={{ width: 52 }}>
                  {c.avg.toFixed(1)} h
                </Txt>
              </View>
            ))}
          </Card>
        </View>

        <Txt weight="700" size={tokens.font.size.screenTitle}>
          Environment readings
        </Txt>
        <View style={styles.chips}>
          <Chip label="All modules" selected={module === 'all'} onPress={() => setModule('all')} />
          {d.mission.environments.map((e) => (
            <Chip key={e.id} label={e.name.replace(' module', '')} selected={module === e.id} onPress={() => setModule(e.id)} />
          ))}
        </View>
        <View style={styles.envGrid}>
          {d.readings
            .filter((x) => module === 'all' || x.env.id === module)
            .map(({ env, r }) => (
              <Card key={env.id} padding={16} shadow={false} gap={6} style={styles.envCard}>
                <Txt heading weight="700" size={tokens.font.size.screenTitle}>
                  {env.name.replace(' module', '')}
                </Txt>
                {r
                  ? (
                      [
                        ['thermometer', 'Temp', `${r.temperatureC.toFixed(1)} °C`, r.temperatureC > 26 ? 'warn' : 'ok'],
                        ['gauge', 'Pressure', `${r.pressureKpa.toFixed(1)} kPa`, 'ok'],
                        ['sun', 'Light', `${r.lightLux} lux`, 'ok'],
                        ['volume', 'Noise', `${r.noiseDb} dB`, r.noiseDb >= 60 ? 'warn' : 'ok'],
                        ['radiation', 'Radiation*', `${r.radiationUsvH.toFixed(1)} µSv/h`, 'ok'],
                        ['crew', 'Crew present', String(r.crewPresent), 'ok'],
                      ] as [IconName, string, string, Level][]
                    ).map(([icon, label, value, lvl]) => (
                      <View key={label} style={styles.envRow}>
                        <Icon name={icon} size={16} color={C.primary} />
                        <Txt size={tokens.font.size.body} color={C.muted} style={{ flex: 1 }}>
                          {label}
                        </Txt>
                        <Txt weight="600" size={tokens.font.size.body} color={lvl === 'ok' ? C.text : C.gold}>
                          {value}
                        </Txt>
                      </View>
                    ))
                  : (
                      <Txt color={C.muted}>No readings</Txt>
                    )}
              </Card>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  side: { width: 270, padding: 16, gap: 24, borderRightWidth: 1, borderRightColor: C.border },
  sideNarrow: { width: '100%', borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 14, borderRadius: tokens.radius.item },
  navOn: { backgroundColor: C.surface },
  main: { padding: 28, gap: 18, maxWidth: 1200 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderTopWidth: 1, borderTopColor: C.track },
  th: { borderTopWidth: 0 },
  td: { flex: 1, paddingHorizontal: 12 },
  two: { flexDirection: 'row', gap: 18 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderTopColor: C.track },
  dot: { width: 10, height: 10, borderRadius: 5 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.item,
    borderWidth: 1,
    borderColor: C.border,
  },
  sleepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  envGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  envCard: { flexGrow: 1, flexBasis: 240 },
  envRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
