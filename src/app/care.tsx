import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Button, Card, Chip, Heading, Label, Muted, Screen } from '@/components/cosmo-ui';
import { useAuth } from '@/components/auth-context';
import { C } from '@/constants/cosmo';
import { crewHealthApi, type DailyCheckin, type JsonRecord, type ProactiveMessage, type SupportRequest } from '@/services/crew-health-api';

export default function CareScreen() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === 'admin';
  const canReviewCare = session?.user.role === 'medical' || session?.user.role === 'surgeon' || isAdmin;
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [patterns, setPatterns] = useState<JsonRecord[]>([]);
  const [missions, setMissions] = useState<JsonRecord[]>([]);
  const [missionId, setMissionId] = useState('SYN-LDM-01');
  const [missionCrew, setMissionCrew] = useState<JsonRecord[]>([]);
  const [missionDetail, setMissionDetail] = useState<JsonRecord | null>(null);
  const [missionMetrics, setMissionMetrics] = useState<JsonRecord[]>([]);
  const [dailyRecords, setDailyRecords] = useState<JsonRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<JsonRecord | null>(null);
  const [baseline, setBaseline] = useState<JsonRecord | null>(null);
  const [astronautEpisodes, setAstronautEpisodes] = useState<JsonRecord[]>([]);
  const [agentContext, setAgentContext] = useState<JsonRecord | null>(null);
  const [crewDaySummary, setCrewDaySummary] = useState<JsonRecord | null>(null);
  const [metricSeries, setMetricSeries] = useState<JsonRecord | null>(null);
  const [missionEpisodes, setMissionEpisodes] = useState<JsonRecord[]>([]);
  const [plantedEvents, setPlantedEvents] = useState<JsonRecord[]>([]);
  const [metricCode, setMetricCode] = useState('body_temperature');
  const [astronautId, setAstronautId] = useState('A004');
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [messages, setMessages] = useState<ProactiveMessage[]>([]);
  const [day, setDay] = useState('180');
  const [response, setResponse] = useState('');
  const [careNotes, setCareNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [documents, setDocuments] = useState<JsonRecord[]>([]);
  const [knowledgePage, setKnowledgePage] = useState<JsonRecord | null>(null);
  const [documentId, setDocumentId] = useState('1');
  const [documentPage, setDocumentPage] = useState('1');
  const [ingestRuns, setIngestRuns] = useState<JsonRecord[]>([]);
  const [title, setTitle] = useState('');

  const loadQueue = useCallback(async () => {
    setLoading(true); setError('');
    const results = await Promise.allSettled([
      crewHealthApi.care.support('open'), crewHealthApi.care.patterns({ minSeverity: 'high' }),
      crewHealthApi.mission.list(), crewHealthApi.knowledge.documents(),
      ...(isAdmin ? [crewHealthApi.ingest.runs()] : []),
    ]);
    if (results[0].status === 'fulfilled') setRequests(results[0].value);
    if (results[1].status === 'fulfilled') setPatterns(results[1].value);
    if (results[2].status === 'fulfilled') {
      setMissions(results[2].value);
      const first = results[2].value[0];
      if (first) {
        const id = String(first.id ?? first.missionId ?? '');
        if (id) setMissionId(id);
        if (first.lastDay != null) setDay(String(first.lastDay));
      }
    }
    if (results[3].status === 'fulfilled') setDocuments(results[3].value);
    if (isAdmin && results[4]?.status === 'fulfilled') setIngestRuns(results[4].value as JsonRecord[]);
    const rejected = results.filter((result) => result.status === 'rejected');
    if (rejected.length) setError(`Some care data could not be loaded. ${errorText(rejected[0].status === 'rejected' ? rejected[0].reason : null)}`);
    setLoading(false);
  }, [isAdmin]);

  const loadAstronaut = useCallback(async () => {
    if (!missionId || !astronautId) return;
    const results = await Promise.allSettled([
      crewHealthApi.mission.crew(missionId),
      crewHealthApi.care.checkins({ astronautId, fromDay: Math.max(1, Number(day) - 6), toDay: Number(day) }),
      crewHealthApi.care.messages(astronautId),
      crewHealthApi.mission.detail(missionId),
      crewHealthApi.mission.metrics(missionId),
      crewHealthApi.mission.daily(missionId, astronautId, { fromDay: Math.max(1, Number(day) - 6), toDay: Number(day) }),
      crewHealthApi.mission.today(missionId, astronautId, Number(day)),
      crewHealthApi.mission.baseline(missionId, astronautId),
      crewHealthApi.mission.astronautEpisodes(missionId, astronautId, { fromDay: Math.max(1, Number(day) - 6), toDay: Number(day) }),
      crewHealthApi.mission.agentContext(missionId, astronautId, false),
      crewHealthApi.mission.crewDay(missionId, Number(day)),
      crewHealthApi.mission.metricSeries(missionId, metricCode, { fromDay: Math.max(1, Number(day) - 6), toDay: Number(day) }),
      crewHealthApi.mission.episodes(missionId, 5),
      ...(isAdmin ? [crewHealthApi.mission.plantedEvents(missionId)] : []),
    ]);
    if (results[0].status === 'fulfilled') setMissionCrew(results[0].value);
    if (results[1].status === 'fulfilled') setCheckins(results[1].value);
    if (results[2].status === 'fulfilled') setMessages(results[2].value);
    if (results[3].status === 'fulfilled') setMissionDetail(results[3].value);
    if (results[4].status === 'fulfilled') setMissionMetrics(results[4].value);
    if (results[5].status === 'fulfilled') setDailyRecords(results[5].value);
    if (results[6].status === 'fulfilled') setTodayRecord(results[6].value);
    if (results[7].status === 'fulfilled') setBaseline(results[7].value);
    if (results[8].status === 'fulfilled') setAstronautEpisodes(results[8].value);
    if (results[9].status === 'fulfilled') setAgentContext(results[9].value);
    if (results[10].status === 'fulfilled') setCrewDaySummary(results[10].value);
    if (results[11].status === 'fulfilled') setMetricSeries(results[11].value);
    if (results[12].status === 'fulfilled') setMissionEpisodes(results[12].value);
    if (isAdmin && results[13]?.status === 'fulfilled') setPlantedEvents(results[13].value as JsonRecord[]);
  }, [astronautId, day, isAdmin, metricCode, missionId]);

  useEffect(() => { void Promise.resolve().then(loadQueue); }, [loadQueue]);
  useEffect(() => { void Promise.resolve().then(loadAstronaut); }, [loadAstronaut]);

  const updateRequest = async (id: number, status: 'acknowledged' | 'resolved') => {
    setError(''); setNotice('');
    try {
      await crewHealthApi.care.updateSupport(id, { status, response: response.trim() || undefined, careNotes: careNotes.trim() || undefined });
      setNotice(`Support request #${id} updated.`);
      await loadQueue();
    } catch (cause) { setError(errorText(cause)); }
  };

  const runPatterns = async () => {
    setLoading(true); setError(''); setNotice('');
    try { await crewHealthApi.care.runPatterns(Number(day)); setPatterns(await crewHealthApi.care.patterns({ day: Number(day), minSeverity: 'high' })); setNotice(`Health pattern review completed for mission day ${day}.`); }
    catch (cause) { setError(errorText(cause)); }
    setLoading(false);
  };

  const importData = async () => {
    setLoading(true); setError(''); setNotice('');
    try { await crewHealthApi.ingest.run('bundled'); setNotice('Bundled NASA datasets were re-imported.'); await loadQueue(); }
    catch (cause) { setError(errorText(cause)); }
    setLoading(false);
  };

  const regenerateMission = async () => {
    setLoading(true); setError(''); setNotice('');
    try { await crewHealthApi.mission.regenerate(42); setNotice('Synthetic long-duration mission regenerated with seed 42.'); await loadQueue(); }
    catch (cause) { setError(errorText(cause)); }
    setLoading(false);
  };

  const uploadPdf = () => {
    if (Platform.OS !== 'web') { setError('PDF upload is available in the browser version of this prototype.'); return; }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/pdf,.pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setLoading(true); setError(''); setNotice('');
      try { await crewHealthApi.knowledge.upload(file, title.trim() || undefined); setNotice(`${file.name} was added to the crew health knowledge base.`); await loadQueue(); }
      catch (cause) { setError(errorText(cause)); }
      setLoading(false);
    };
    input.click();
  };

  const loadDocumentPage = async () => {
    setLoading(true); setError('');
    try { setKnowledgePage(await crewHealthApi.knowledge.page(Number(documentId), Number(documentPage))); }
    catch (cause) { setError(errorText(cause)); }
    setLoading(false);
  };

  return <Screen>
    <Heading eyebrow="Medical team · Crew Health API" title="Care operations" subtitle="Review astronaut support requests, health patterns, synthetic mission records, and the crew health knowledge base." />
    {!canReviewCare ? <Card style={styles.errorCard}><Text style={styles.errorText}>Sign in with a medical, surgeon, or admin API account to use this screen.</Text></Card> : null}
    {error ? <Card style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></Card> : null}
    {notice ? <Card style={styles.noticeCard}><Text style={styles.noticeText}>{notice}</Text></Card> : null}

    <Card><View style={styles.section}><Label>Open support queue</Label><Muted>{requests.length} open</Muted></View>{loading && !requests.length ? <Muted>Loading care queue…</Muted> : requests.length ? requests.map((request) => <View key={request.id} style={styles.record}><View style={styles.section}><Text style={styles.recordTitle}>{request.topicLabel || request.topic} · {request.astronautId}</Text><Text style={[styles.priority, request.priority === 'urgent' && styles.urgent]}>{request.priority}</Text></View><Text style={styles.body}>{request.message}</Text><Muted>Mission day {request.missionDay} · {request.reason.replace(/_/g, ' ')}</Muted><View style={styles.actions}><Button title="Acknowledge" secondary onPress={() => updateRequest(request.id, 'acknowledged')} /><Button title="Resolve" secondary onPress={() => updateRequest(request.id, 'resolved')} /></View></View>) : <Muted>No open support requests.</Muted>}</Card>

    <Card><View style={styles.section}><Label>Health pattern review</Label><Text style={styles.priority}>{patterns.length} high-severity patterns</Text></View><TextInput accessibilityLabel="Mission day for pattern review" value={day} onChangeText={setDay} keyboardType="numeric" placeholder="Mission day" placeholderTextColor={C.muted} style={styles.input} /><Button title={loading ? 'Working…' : 'Run detection for this day'} onPress={runPatterns} disabled={loading} />{patterns.length ? <DataList records={patterns} empty="No patterns returned." /> : <Muted>No high-severity patterns returned.</Muted>}</Card>

    <Card><View style={styles.section}><Label>Mission records</Label><Muted>{missionCrew.length} astronauts</Muted></View><View style={styles.wrap}>{missions.map((mission) => { const id = String(mission.id ?? mission.missionId ?? ''); return id ? <Chip key={id} title={String(mission.name ?? id)} active={missionId === id} onPress={() => setMissionId(id)} /> : null; })}</View><View style={styles.wrap}>{missionCrew.map((member) => { const id = String(member.astronautId ?? member.id ?? ''); return id ? <Chip key={id} title={String(member.displayName ?? id)} active={astronautId === id} onPress={() => setAstronautId(id)} /> : null; })}</View><TextInput accessibilityLabel="Medical response" value={response} onChangeText={setResponse} placeholder="Response visible to the astronaut" placeholderTextColor={C.muted} style={styles.input} /><TextInput accessibilityLabel="Internal care notes" value={careNotes} onChangeText={setCareNotes} placeholder="Internal care notes" placeholderTextColor={C.muted} style={styles.input} /></Card>
    <DataRecordCard title="Mission details" value={missionDetail} />
    <DataListCard title="Mission metric definitions" records={missionMetrics} empty="No metric definitions returned." />
    <DataRecordCard title={`Mission day ${day} readings`} value={todayRecord} />
    <DataRecordCard title="Pre-mission baseline" value={baseline} />
    <DataListCard title={`Recent daily records for ${astronautId}`} records={dailyRecords} empty="No daily records returned for this mission window." />
    <DataListCard title={`Health episodes for ${astronautId}`} records={astronautEpisodes} empty="No episodes returned for this mission window." />
    <DataRecordCard title="Medical review context" value={agentContext} />
    <DataRecordCard title={`Crew summary for day ${day}`} value={crewDaySummary} />
    <Card><Label>Mission metric series</Label><TextInput accessibilityLabel="Metric code" value={metricCode} onChangeText={setMetricCode} placeholder="Metric code" placeholderTextColor={C.muted} style={styles.input} /><DataRecordCard title={metricCode} value={metricSeries} /></Card>
    <DataListCard title="Mission health episodes" records={missionEpisodes} empty="No mission episodes returned." />
    <Button title="Export synthetic mission records (CSV)" secondary onPress={() => { void Linking.openURL(crewHealthApi.mission.exportCsvUrl(missionId)); }} />
    {isAdmin ? <DataListCard title="Synthetic evaluation events" records={plantedEvents} empty="No evaluation events returned." /> : null}
    <DataListCard title={`Check-ins for ${astronautId}`} records={checkins as unknown as JsonRecord[]} empty="No check-ins for this mission window." />
    <DataListCard title={`Proactive messages for ${astronautId}`} records={messages as unknown as JsonRecord[]} empty="No proactive messages for this crew member." />

    <Card><Label>Crew health documents</Label><DataList records={documents} empty="No documents in the knowledge base." /><TextInput accessibilityLabel="New document title" value={title} onChangeText={setTitle} placeholder="Document title (optional)" placeholderTextColor={C.muted} style={styles.input} /><Button title="Upload a medical PDF" secondary onPress={uploadPdf} disabled={!canReviewCare} /><TextInput accessibilityLabel="Document ID" value={documentId} onChangeText={setDocumentId} keyboardType="numeric" placeholder="Document ID" placeholderTextColor={C.muted} style={styles.input} /><TextInput accessibilityLabel="Page number" value={documentPage} onChangeText={setDocumentPage} keyboardType="numeric" placeholder="Page number" placeholderTextColor={C.muted} style={styles.input} /><Button title="Read document page" secondary onPress={loadDocumentPage} disabled={loading} /></Card>
    <DataRecordCard title={`Document ${documentId}, page ${documentPage}`} value={knowledgePage} />

    {isAdmin ? <Card style={styles.adminCard}><Label>Admin tools</Label><Muted>These actions modify shared backend datasets and mission seed data.</Muted><Button title="Re-import bundled NASA datasets" onPress={importData} disabled={loading} /><Button title="Regenerate synthetic mission - seed 42" secondary onPress={regenerateMission} disabled={loading} /><DataListCard title="Recent import runs" records={ingestRuns} empty="No import runs returned." /><Button title="Export synthetic mission CSV" secondary onPress={() => { void Linking.openURL(crewHealthApi.mission.exportCsvUrl(missionId)); }} /></Card> : null}
  </Screen>;
}

function DataRecordCard({ title, value }: { title: string; value: JsonRecord | null }) {
  if (!value) return <Card><Label>{title}</Label><Muted>No record loaded.</Muted></Card>;
  const fields = Object.entries(value).filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item)).slice(0, 14);
  const collections = Object.entries(value).filter(([, item]) => Array.isArray(item)).slice(0, 5);
  return <Card><Label>{title}</Label>{fields.map(([key, item]) => <View key={key} style={styles.section}><Muted>{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}</Muted><Text style={styles.body}>{String(item ?? "?")}</Text></View>)}{collections.map(([key, item]) => <View key={key} style={styles.section}><Muted>{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}</Muted><Text style={styles.body}>{Array.isArray(item) ? `${item.length} records` : "Available"}</Text></View>)}</Card>;
}

function DataListCard({ title, records, empty }: { title: string; records: JsonRecord[]; empty: string }) { return <Card><Label>{title}</Label><DataList records={records} empty={empty} /></Card>; }

function DataList({ records, empty }: { records: JsonRecord[]; empty: string }) {
  if (!records.length) return <Muted>{empty}</Muted>;
  return <View style={{ gap: 8 }}>{records.slice(0, 8).map((record, index) => {
    const title = record.topicLabel ?? record.title ?? record.pattern ?? record.label ?? record.metric ?? record.id ?? `Record ${index + 1}`;
    const fields = Object.entries(record).filter(([key, value]) => key !== 'title' && value !== null && ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 4);
    return <View key={String(record.id ?? record.code ?? index)} style={styles.record}><Text style={styles.recordTitle}>{String(title)}</Text>{fields.map(([key, value]) => <Text key={key} style={styles.body}>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}: {String(value)}</Text>)}</View>;
  })}</View>;
}

function errorText(error: unknown) { return error instanceof Error ? error.message : 'The API request failed.'; }

const styles = StyleSheet.create({ section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, record: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, gap: 7 }, recordTitle: { color: C.text, fontWeight: '800', fontSize: 13, flex: 1 }, body: { color: C.muted, fontSize: 12, lineHeight: 18 }, priority: { color: C.teal, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, urgent: { color: C.pink }, input: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, color: C.text, paddingHorizontal: 13 }, errorCard: { borderColor: C.pink }, errorText: { color: C.pink, fontSize: 12 }, noticeCard: { borderColor: C.green }, noticeText: { color: C.green, fontSize: 12 }, adminCard: { borderColor: C.gold },
});
