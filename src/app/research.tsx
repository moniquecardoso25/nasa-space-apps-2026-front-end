import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Button, Card, Chip, Heading, Label, Muted, Screen } from '@/components/cosmo-ui';
import { useAuth } from '@/components/auth-context';
import { C } from '@/constants/cosmo';
import { crewHealthApi, type JsonRecord } from '@/services/crew-health-api';

type ResearchTab = 'Inspiration4' | 'AGBRESA';

export default function ResearchScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState<ResearchTab>('Inspiration4');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<JsonRecord | null>(null);
  const [apiHealth, setApiHealth] = useState<JsonRecord | null>(null);
  const [studies, setStudies] = useState<JsonRecord[]>([]);
  const [crew, setCrew] = useState<JsonRecord[]>([]);
  const [crewId, setCrewId] = useState('C004');
  const [crewSummary, setCrewSummary] = useState<JsonRecord | null>(null);
  const [timeline, setTimeline] = useState<JsonRecord[]>([]);
  const [alerts, setAlerts] = useState<JsonRecord[]>([]);
  const [highAlerts, setHighAlerts] = useState<JsonRecord[]>([]);
  const [crewMeasurements, setCrewMeasurements] = useState<JsonRecord[]>([]);
  const [analyteSeries, setAnalyteSeries] = useState<JsonRecord | null>(null);
  const [analyteTrend, setAnalyteTrend] = useState<JsonRecord | null>(null);
  const [analyteCode, setAnalyteCode] = useState('hemoglobin');
  const [categories, setCategories] = useState<JsonRecord[]>([]);
  const [timepoints, setTimepoints] = useState<JsonRecord[]>([]);
  const [analytes, setAnalytes] = useState<JsonRecord[]>([]);
  const [heatmap, setHeatmap] = useState<JsonRecord | null>(null);
  const [measurements, setMeasurements] = useState<JsonRecord[]>([]);
  const [query, setQuery] = useState('');
  const [knowledge, setKnowledge] = useState<JsonRecord[]>([]);
  const [agbresa, setAgbresa] = useState<JsonRecord | null>(null);
  const [subjects, setSubjects] = useState<JsonRecord[]>([]);
  const [subjectId, setSubjectId] = useState('AGB-L');
  const [subject, setSubject] = useState<JsonRecord | null>(null);
  const [observations, setObservations] = useState<JsonRecord[]>([]);
  const [comparison, setComparison] = useState<JsonRecord | null>(null);
  const [quality, setQuality] = useState<JsonRecord[]>([]);

  const loadInspiration4 = useCallback(async () => {
    setBusy(true); setError('');
    const results = await Promise.allSettled([
      crewHealthApi.health(), crewHealthApi.osdr.overview(), crewHealthApi.osdr.studies(), crewHealthApi.osdr.crew(),
      crewHealthApi.osdr.categories(), crewHealthApi.osdr.timepoints(), crewHealthApi.osdr.analytes('cbc'),
      crewHealthApi.osdr.alerts({ severity: 'high' }), crewHealthApi.osdr.heatmap({ panel: 'cmp', metric: 'delta_pct' }),
    ]);
    const [healthResult, overviewResult, studiesResult, crewResult, categoriesResult, timepointsResult, analytesResult, alertsResult, heatmapResult] = results;
    if (healthResult.status === 'fulfilled') setApiHealth(healthResult.value as JsonRecord);
    if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
    if (studiesResult.status === 'fulfilled') setStudies(studiesResult.value);
    if (crewResult.status === 'fulfilled') {
      setCrew(crewResult.value);
      if (crewResult.value.length) setCrewId((current) => crewResult.value.some((item) => String(item.crewId ?? item.id) === current) ? current : String(crewResult.value[0].crewId ?? crewResult.value[0].id ?? 'C004'));
    }
    if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value);
    if (timepointsResult.status === 'fulfilled') setTimepoints(timepointsResult.value);
    if (analytesResult.status === 'fulfilled') setAnalytes(analytesResult.value);
    if (alertsResult.status === 'fulfilled') setHighAlerts(alertsResult.value);
    if (heatmapResult.status === 'fulfilled') setHeatmap(heatmapResult.value);
    const rejected = results.filter((result) => result.status === 'rejected');
    if (rejected.length === results.length) setError(rejected[0].status === 'rejected' ? errorText(rejected[0].reason) : 'Unable to load NASA data.');
    else if (rejected.length) setError(`${rejected.length} NASA data request(s) could not be loaded.`);
    setBusy(false);
  }, []);

  const loadCrewMember = useCallback(async (id: string) => {
    if (!id) return;
    const results = await Promise.allSettled([
      crewHealthApi.osdr.crewSummary(id), crewHealthApi.osdr.timeline(id), crewHealthApi.osdr.crewAlerts(id),
      crewHealthApi.osdr.measurements(id, { timepoint: 'R+1' }), crewHealthApi.osdr.analyteTrend('crp'),
    ]);
    if (results[0].status === 'fulfilled') setCrewSummary(results[0].value);
    if (results[1].status === 'fulfilled') setTimeline(results[1].value);
    if (results[2].status === 'fulfilled') setAlerts(results[2].value);
    if (results[3].status === 'fulfilled') setCrewMeasurements(results[3].value);
    if (results[4].status === 'fulfilled') setAnalyteTrend(results[4].value);
  }, []);

  const loadAnalyteSeries = async (id: string, code: string) => {
    try { setAnalyteSeries(await crewHealthApi.osdr.analyteSeries(id, code)); }
    catch (cause) { setError(errorText(cause)); }
  };

  const loadAgbresa = useCallback(async () => {
    setBusy(true); setError('');
    const results = await Promise.allSettled([
      crewHealthApi.agbresa.overview(), crewHealthApi.agbresa.subjects(), crewHealthApi.agbresa.quality(),
      crewHealthApi.agbresa.compareGroups({ metric: 'heart_rate', moment: 'during' }),
    ]);
    const [overviewResult, subjectsResult, qualityResult, comparisonResult] = results;
    if (overviewResult.status === 'fulfilled') setAgbresa(overviewResult.value);
    if (subjectsResult.status === 'fulfilled') {
      setSubjects(subjectsResult.value);
      if (subjectsResult.value.length) setSubjectId((current) => subjectsResult.value.some((item) => String(item.id ?? item.subjectId) === current) ? current : String(subjectsResult.value[0].id ?? subjectsResult.value[0].subjectId ?? 'AGB-L'));
    }
    if (qualityResult.status === 'fulfilled') setQuality(qualityResult.value);
    if (comparisonResult.status === 'fulfilled') setComparison(comparisonResult.value);
    if (results.every((result) => result.status === 'rejected')) setError(errorText(results[0].status === 'rejected' ? results[0].reason : null));
    setBusy(false);
  }, []);

  const loadSubject = useCallback(async (id: string) => {
    if (!id) return;
    const results = await Promise.allSettled([
      crewHealthApi.agbresa.subject(id),
      crewHealthApi.agbresa.observations(id, { metric: 'heart_rate', moment: 'during' }),
    ]);
    if (results[0].status === 'fulfilled') setSubject(results[0].value);
    if (results[1].status === 'fulfilled') setObservations(results[1].value);
  }, []);

  useEffect(() => {
    if (tab === 'Inspiration4') void Promise.resolve().then(loadInspiration4);
    else void Promise.resolve().then(loadAgbresa);
  }, [tab, loadAgbresa, loadInspiration4]);

  useEffect(() => {
    if (tab !== 'Inspiration4') return;
    void Promise.resolve().then(() => loadCrewMember(crewId));
  }, [tab, crewId, loadCrewMember]);

  useEffect(() => {
    if (tab !== 'AGBRESA') return;
    void Promise.resolve().then(() => loadSubject(subjectId));
  }, [tab, subjectId, loadSubject]);

  const searchData = async () => {
    setError('');
    try {
      const result = await crewHealthApi.osdr.searchMeasurements({ crewId: crewId || undefined, limit: 20 });
      setMeasurements(result);
      if (query.trim()) {
        const sources = await crewHealthApi.knowledge.search(query.trim(), 5);
        setKnowledge(sources.hits);
      } else setKnowledge([]);
    } catch (cause) { setError(errorText(cause)); }
  };

  const exportCsv = (url: string) => Linking.openURL(url).catch(() => setError('The CSV export could not be opened. Check the API address and try again.'));

  return <Screen>
    <Heading eyebrow="NASA research data" title="Research data" subtitle="Explore real Inspiration4 and AGBRESA records served by the Crew Health API. These research datasets are not personal medical records." />
    <View style={styles.tabs}><Chip title="Inspiration4 · OSDR" active={tab === 'Inspiration4'} onPress={() => setTab('Inspiration4')} /><Chip title="AGBRESA · bed-rest study" active={tab === 'AGBRESA'} onPress={() => setTab('AGBRESA')} /></View>
    {error ? <Card style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Muted>API: {crewHealthApi.baseUrl}</Muted></Card> : null}
    {busy ? <Muted>Loading research data…</Muted> : null}

    {tab === 'Inspiration4' ? <>
      <Card style={styles.notice}><Label>Inspiration4 · real NASA OSDR data</Label><Muted>The API reports measured values, reference ranges, quality flags, and mission timepoints. A missing reference range is shown as “No reference,” not as a normal result.</Muted></Card>
      <View style={styles.sectionHead}><Label>Mission crew</Label><Muted>{crew.length} crew profiles</Muted></View>
      <View style={styles.wrap}>{crew.map((member) => { const id = String(member.crewId ?? member.id ?? ''); return id ? <Chip key={id} title={String(member.displayName ?? id)} active={crewId === id} onPress={() => setCrewId(id)} /> : null; })}</View>
      <DataCard title={`Crew member ${crewId}`} value={crewSummary} />
      <DataList title="Health timeline" items={timeline} empty="No timeline records returned." />
      <DataList title="Health alerts" items={alerts} empty="No alerts returned for this crew member." />
      <DataList title="High-severity mission alerts" items={highAlerts} empty="No high-severity alerts returned." />
      <DataList title={`Measurements for ${crewId} at R+1`} items={crewMeasurements} empty="No measurements returned for this timepoint." />
      <Card><Label>Analyte series</Label><TextInput value={analyteCode} onChangeText={setAnalyteCode} placeholder="Analyte code, e.g. hemoglobin" placeholderTextColor={C.muted} style={styles.input} /><Button title="Load selected analyte" secondary onPress={() => void loadAnalyteSeries(crewId, analyteCode)} /><DataCard title={`${crewId} · ${analyteCode}`} value={analyteSeries} /></Card>
      <DataCard title="C-reactive protein trend across the crew" value={analyteTrend} />
      <DataList title="Mission studies" items={studies} empty="No studies found." />
      <View style={styles.statsRow}><DataList title="Timepoints" items={timepoints} empty="No timepoints." /><DataList title="Body systems" items={categories} empty="No categories." /></View>
      <DataList title="Blood count analytes" items={analytes} empty="No analytes." />
      <DataCard title="Mission overview" value={overview} />
      <DataCard title="API connection" value={apiHealth} />
      <DataCard title="CMP crew heatmap" value={heatmap} />
      <Card><Label>Measurements and NASA references</Label><TextInput value={query} onChangeText={setQuery} placeholder="Search NASA health references (optional)" placeholderTextColor={C.muted} style={styles.input} /><Button title="Load measurements and search references" onPress={searchData} /><Muted>Measurements can be filtered by crew member. Reference search uses the authenticated knowledge API.</Muted></Card>
      <DataList title="Measurements" items={measurements} empty="Choose a crew member and load measurements." />
      <DataList title="NASA health references" items={knowledge} empty="Enter a phrase above to search the knowledge base." />
      <Button title="Export all measurements (CSV)" secondary onPress={() => exportCsv(crewHealthApi.osdr.exportCsvUrl())} />
    </> : <>
      <Card style={styles.notice}><Label>AGBRESA · real Earth-based study</Label><Muted>Healthy volunteers completed 60 days of head-down-tilt bed rest. This study is an analogue for some effects of microgravity, not astronaut flight data and not medical advice.</Muted></Card>
      <DataCard title="Study details" value={agbresa} />
      <View style={styles.sectionHead}><Label>Study participants</Label><Muted>{subjects.length} records</Muted></View>
      <View style={styles.wrap}>{subjects.map((item) => { const id = String(item.id ?? item.subjectId ?? ''); return id ? <Chip key={id} title={String(item.code ?? id)} active={subjectId === id} onPress={() => setSubjectId(id)} /> : null; })}</View>
      <DataCard title={`Participant ${subjectId}`} value={subject} />
      <DataList title="Heart-rate observations" items={observations} empty="No observations returned." />
      <DataCard title="Intermittent vs continuous group comparison" value={comparison} />
      <DataList title="Quality flags" items={quality} empty="No withheld or invalid values returned." />
      <Button title="Export AGBRESA observations (CSV)" secondary onPress={() => exportCsv(crewHealthApi.agbresa.exportCsvUrl())} />
    </>}
    <Muted>NASA and AGBRESA source data are not the CosmoMedic demo profile. The source and status fields come from the API response.</Muted>
    {session?.offlineDemo ? <Muted>Local demo mode is active. Connect the Crew Health API to load research data.</Muted> : null}
  </Screen>;
}

function DataCard({ title, value }: { title: string; value: JsonRecord | null }) {
  if (!value) return null;
  const rows = Object.entries(value).filter(([, item]) => !Array.isArray(item) && (item === null || typeof item !== 'object')).slice(0, 12);
  const nested = Object.entries(value).filter(([, item]) => Array.isArray(item) || (item !== null && typeof item === 'object')).slice(0, 5);
  return <Card><Label>{title}</Label>{rows.map(([key, item]) => <DataRow key={key} label={labelize(key)} value={String(item ?? '—')} />)}{nested.map(([key, item]) => <DataRow key={key} label={labelize(key)} value={Array.isArray(item) ? `${item.length} records` : 'Available'} />)}</Card>;
}

function DataList({ title, items, empty }: { title: string; items: JsonRecord[]; empty: string }) {
  return <Card><View style={styles.sectionHead}><Label>{title}</Label><Muted>{items.length}</Muted></View>{items.length ? items.slice(0, 8).map((item, index) => {
    const titleValue = item.label ?? item.title ?? item.displayName ?? item.name ?? item.code ?? item.metric ?? item.id ?? `Record ${index + 1}`;
    const lines = Object.entries(item).filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 4);
    return <View key={String(item.id ?? item.code ?? index)} style={styles.record}><Text style={styles.recordTitle}>{String(titleValue)}</Text>{lines.map(([key, value]) => <DataRow key={key} label={labelize(key)} value={String(value ?? '—')} />)}</View>;
  }) : <Muted>{empty}</Muted>}</Card>;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.dataRow}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

function labelize(value: string) { return value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()); }
function errorText(error: unknown) { return error instanceof Error ? error.message : 'The API request failed.'; }

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, notice: { borderColor: C.teal }, errorCard: { borderColor: C.pink }, errorText: { color: C.pink, fontSize: 13, fontWeight: '700' }, sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, record: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, gap: 4 }, recordTitle: { color: C.text, fontWeight: '800', marginBottom: 2 }, dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 7 }, rowLabel: { color: C.muted, flex: 1, fontSize: 11 }, rowValue: { color: C.text, flex: 1, textAlign: 'right', fontSize: 11, fontWeight: '700' }, input: { borderWidth: 1, borderColor: C.border, borderRadius: 14, backgroundColor: C.background, color: C.text, minHeight: 46, paddingHorizontal: 13 }, exportRow: { gap: 8 },
});
