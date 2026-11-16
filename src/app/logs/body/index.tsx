import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LogStateButton, SecondaryButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { InsightCard } from '@/components/InsightCard';
import { TrendLine } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { ListRow, LogScreen, SavedBanner } from '@/components/LogKit';
import { TodayChip } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { getLogs } from '@/data/api';
import { BODY_METRICS, formatDelta, injuryStatusLevel, injuryTitle, INJURY_KIND_LABEL, measurementStatus } from '@/data/derived';
import { capitalize } from '@/data/format';
import { useData } from '@/data/store';
import { C, X, tokens } from '@/theme/tokens';

function Trend({ label, points, labels, delta }: { label: string; points: number[]; labels: string[]; delta: number | null }) {
  const color = delta !== null && delta <= -5 ? C.warning : C.holoOk;
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.between}>
        <Txt weight="600" size={tokens.font.size.caption}>
          {label}
        </Txt>
        <Txt weight="700" size={tokens.font.size.caption} color={color}>
          {delta !== null ? formatDelta(delta) : '—'}
        </Txt>
      </View>
      {points.length ? <TrendLine points={points} labels={labels} threshold={-10} min={-11} max={0.5} color={color} /> : <Txt color={C.muted}>No data yet</Txt>}
    </View>
  );
}

export default function BodyOverview() {
  const d = useData(() => {
    const rows = BODY_METRICS.map((def) => ({ def, ...measurementStatus(def) }));
    // weekly scans / tests only (not daily): one point per measurement, starting at the pre-flight exam
    const series = (metric: string) =>
      getLogs({ type: 'measurement' }).filter((l) => l.data.metric === metric && l.data.deltaVsBaselinePct != null);
    const boneLogs = series('bone_density');
    const aerobicLogs = series('aerobic');
    const bone = [0, ...boneLogs.map((l) => l.data.deltaVsBaselinePct as number)];
    const aerobic = [0, ...aerobicLogs.map((l) => l.data.deltaVsBaselinePct as number)];
    const boneLabels = ['Pre-flight', ...boneLogs.map((l) => `D${l.missionDay}`)];
    const aerobicLabels = ['Pre-flight', ...aerobicLogs.map((l) => `D${l.missionDay}`)];
    const injuries = getLogs({ type: 'injury' }).reverse();
    return {
      rows,
      upToDate: rows.filter((r) => r.upToDate).length,
      bone,
      aerobic,
      boneLabels,
      aerobicLabels,
      injuries,
      active: injuries.filter((i) => i.data.status !== 'resolved').length,
    };
  });
  const allDone = d.upToDate === d.rows.length;

  return (
    <LogScreen
      title="Body"
      footer={
        <LogStateButton
          logged={allDone}
          logLabel="Add measurement"
          loggedText="All up to date"
          editLabel="Add"
          onLog={() => router.push('/logs/body/add')}
          onEdit={() => router.push('/logs/body/add')}
        />
      }>
      <SavedBanner types={['measurement', 'injury']} />
      <Card gap={0} padding={14}>
        <CardTitle
          title="Measurements"
          right={
            <Txt size={tokens.font.size.caption} color={C.muted}>
              {d.upToDate} of {d.rows.length} up to date
            </Txt>
          }
        />
        {d.rows.map((r, i) => {
          const color = r.upToDate ? C.holoOk : C.gold;
          const v = r.last?.data.values as { systolic?: number; diastolic?: number } | undefined;
          const value =
            r.def.metric === 'blood_pressure'
              ? r.upToDate && v?.systolic
                ? `${v.systolic}/${v.diastolic}`
                : '—'
              : r.last?.data.deltaVsBaselinePct != null
                ? formatDelta(r.last.data.deltaVsBaselinePct)
                : '—';
          return (
            <ListRow
              key={r.def.metric}
              first={i === 0}
              icon={r.def.icon}
              title={r.def.label}
              titleSmall={`· ${capitalize(r.def.cadence)}`}
              sub={r.text}
              subColor={color}
              subIcon={r.upToDate ? 'check' : 'clock'}
              onPress={() => router.push(`/logs/body/add?metric=${r.def.metric}` as never)}
              right={
                <Txt weight="700" size={tokens.font.size.body} color={value === '—' ? C.muted : color}>
                  {value}
                </Txt>
              }
            />
          );
        })}
      </Card>
      <Card gap={8}>
        <CardTitle
          title="Trend vs. baseline"
          right={
            <Txt size={tokens.font.size.tiny} color={C.muted}>
              dashed = 10% loss
            </Txt>
          }
        />
        <Txt size={tokens.font.size.caption} color={C.muted}>
          Weekly scans and tests vs. the pre-flight exam (demo data). Not measured daily.
        </Txt>
        <Trend label="Bone density" points={d.bone} labels={d.boneLabels} delta={d.bone.length > 1 ? d.bone.at(-1)! : null} />
        <Trend label="Aerobic fitness" points={d.aerobic} labels={d.aerobicLabels} delta={d.aerobic.length > 1 ? d.aerobic.at(-1)! : null} />
      </Card>
      <Card gap={0} padding={14}>
        <CardTitle
          title="Injuries"
          right={
            <Txt size={tokens.font.size.caption} color={C.muted}>
              {d.active} active
            </Txt>
          }
        />
        {d.injuries.length === 0 ? (
          <Txt size={tokens.font.size.small} color={C.muted} style={{ paddingVertical: 10 }}>
            No injuries reported.
          </Txt>
        ) : null}
        {d.injuries.map((inj, i) => (
          <ListRow
            key={inj.id}
            first={i === 0}
            icon="bandage"
            iconColor={C.danger}
            iconBg={X.dangerIcon}
            title={injuryTitle(inj.data)}
            titleSmall={`· ${INJURY_KIND_LABEL[inj.data.kind]} · ${inj.data.severity}`}
            sub={`Day ${inj.missionDay} · ${inj.data.description}`}
            onPress={() => router.push(`/logs/body/injury?id=${inj.id}` as never)}
            right={<TodayChip state={injuryStatusLevel(inj.data.status)} label={capitalize(inj.data.status)} />}
          />
        ))}
        <SecondaryButton onPress={() => router.push('/logs/body/injury')} style={styles.report} compact>
          <Icon name="bandage" size={18} color={C.danger} />
          <Txt weight="600" size={tokens.ext.fontSize.label}>
            Report an injury
          </Txt>
        </SecondaryButton>
      </Card>
      <InsightCard category="body" />
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  report: { marginTop: 8, minHeight: 48, borderColor: C.danger, borderRadius: tokens.radius.card },
});
