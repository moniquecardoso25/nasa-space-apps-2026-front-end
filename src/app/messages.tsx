import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, Heading, Label, Muted, Screen } from '@/components/cosmo-ui';
import { useAuth } from '@/components/auth-context';
import { C } from '@/constants/cosmo';
import { crewHealthApi, type ProactiveMessage, type SupportRequest } from '@/services/crew-health-api';

const topics = [
  { key: 'medical', label: 'Medical' }, { key: 'psychological', label: 'Behavioral health' },
  { key: 'family', label: 'Family' }, { key: 'operational', label: 'Operations' }, { key: 'other', label: 'Other' },
] as const;

export default function MessagesScreen() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ProactiveMessage[]>([]);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [proactiveMessages, setProactiveMessages] = useState(true);
  const [topic, setTopic] = useState<(typeof topics)[number]['key']>('medical');
  const [draft, setDraft] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!session?.me || session.offlineDemo) return;
    setLoading(true); setError('');
    const results = await Promise.allSettled([crewHealthApi.messages(), crewHealthApi.supportRequests(), crewHealthApi.preferences()]);
    if (results[0].status === 'fulfilled') setMessages(results[0].value);
    if (results[1].status === 'fulfilled') setRequests(results[1].value);
    if (results[2].status === 'fulfilled') setProactiveMessages(results[2].value.proactiveMessages);
    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') setError(messageForError(failure.reason));
    setLoading(false);
  }, [session]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const markMessage = async (message: ProactiveMessage, action: 'read' | 'dismiss') => {
    setError('');
    try {
      const updated = await crewHealthApi.updateMessage(message.id, action);
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, ...updated } : item));
    } catch (cause) { setError(messageForError(cause)); }
  };

  const savePreference = async (value: boolean) => {
    setProactiveMessages(value); setError('');
    try { await crewHealthApi.updatePreferences(value); setNotice('Message preference saved to your crew account.'); }
    catch (cause) { setProactiveMessages(!value); setError(messageForError(cause)); }
  };

  const sendSupportRequest = async () => {
    if (!draft.trim()) { setError('Add a short note for the medical support team.'); return; }
    setError(''); setNotice(''); setLoading(true);
    try {
      const request = await crewHealthApi.requestSupport({ topic, message: draft.trim(), urgent });
      setRequests((current) => [request, ...current]);
      setDraft(''); setUrgent(false);
      setNotice(request.priority === 'urgent' ? 'Urgent request sent to the flight medical team.' : 'Support request sent to the flight medical team.');
    } catch (cause) { setError(messageForError(cause)); }
    setLoading(false);
  };

  return <Screen>
    <Heading eyebrow="Crew Health API" title="Messages & support" subtitle="Review wellbeing messages and send a request to the flight medical team. This API does not provide free-form ground messaging." />
    {session?.offlineDemo ? <Card><Muted>Local demo mode is active. Connect the Crew Health API and sign in to load account messages or submit a support request.</Muted></Card> : null}
    {error ? <Card style={styles.error}><Text style={styles.errorText}>{error}</Text></Card> : null}
    {notice ? <Card style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></Card> : null}

    <Card style={styles.preference}><View style={{ flex: 1, gap: 3 }}><Label>Proactive health messages</Label><Muted>Enable or pause messages based on detected health patterns.</Muted></View><Switch value={proactiveMessages} onValueChange={savePreference} trackColor={{ false: C.track, true: C.teal }} thumbColor={C.text} accessibilityLabel="Proactive health messages" /></Card>

    <Card><View style={styles.section}><Label>Health monitor messages</Label><Muted>{messages.length} total</Muted></View>{loading && !messages.length ? <Muted>Loading messages…</Muted> : messages.length ? messages.map((message) => <View key={message.id} style={styles.message}><View style={styles.section}><Text style={styles.messageTitle}>{message.title}</Text><Text style={[styles.badge, message.status === 'unread' && styles.unread]}>{message.status}</Text></View><Text style={styles.messageBody}>{message.body}</Text>{message.patterns?.length ? <View style={styles.wrap}>{message.patterns.map((pattern) => <Chip key={pattern} title={pattern.replace(/_/g, ' ')} />)}</View> : null}<View style={styles.actions}>{message.status === 'unread' ? <Button title="Mark as read" secondary onPress={() => markMessage(message, 'read')} /> : null}{message.status !== 'dismissed' ? <Button title="Dismiss" secondary onPress={() => markMessage(message, 'dismiss')} /> : null}</View></View>) : <Muted>No proactive messages for this account.</Muted>}</Card>

    <Card><View style={styles.section}><Label>Support requests</Label><Muted>{requests.length} total</Muted></View>{requests.length ? requests.map((request) => <View key={request.id} style={styles.request}><View style={styles.section}><Text style={styles.messageTitle}>{request.topicLabel || request.topic}</Text><Text style={[styles.badge, request.priority === 'urgent' && styles.urgent]}>{request.status} · {request.priority}</Text></View><Text style={styles.messageBody}>{request.message}</Text><Muted>Mission day {request.missionDay} · {request.reason.replace(/_/g, ' ')}</Muted>{request.response ? <View style={styles.response}><Text style={styles.responseTitle}>Response from the medical team</Text><Text style={styles.messageBody}>{request.response}</Text></View> : <Muted>Awaiting a response.</Muted>}</View>) : <Muted>You have no support requests.</Muted>}</Card>

    <Card><Label>Request support</Label><Muted>Choose a topic. Requests are sent to the care team for your astronaut account.</Muted><View style={styles.wrap}>{topics.map((item) => <Chip key={item.key} title={item.label} active={topic === item.key} onPress={() => setTopic(item.key)} />)}</View><TextInput accessibilityLabel="Support request message" value={draft} onChangeText={setDraft} placeholder="What would you like the crew medical team to know?" placeholderTextColor={C.muted} multiline style={styles.input} /><View style={styles.urgentRow}><View style={{ flex: 1, gap: 2 }}><Text style={styles.messageTitle}>Mark as urgent</Text><Muted>Use the mission emergency protocol for immediate danger.</Muted></View><Switch value={urgent} onValueChange={setUrgent} trackColor={{ false: C.track, true: C.gold }} thumbColor={C.text} accessibilityLabel="Urgent support request" /></View><Button title={loading ? 'Sending…' : 'Send support request'} onPress={sendSupportRequest} disabled={loading || !session?.me || session.offlineDemo} /></Card>
  </Screen>;
}

function messageForError(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed.'; }

const styles = StyleSheet.create({
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, preference: { flexDirection: 'row', alignItems: 'center', gap: 10 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, message: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, gap: 9 }, request: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, gap: 8 }, messageTitle: { color: C.text, fontWeight: '800', fontSize: 13, flex: 1 }, messageBody: { color: C.muted, fontSize: 13, lineHeight: 19 }, badge: { color: C.muted, fontSize: 10, textTransform: 'uppercase', fontWeight: '800' }, unread: { color: C.teal }, urgent: { color: C.pink }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, response: { borderLeftWidth: 2, borderLeftColor: C.teal, paddingLeft: 10, gap: 5 }, responseTitle: { color: C.teal, fontWeight: '800', fontSize: 11 }, input: { minHeight: 100, textAlignVertical: 'top', borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, padding: 14, color: C.text }, urgentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }, notice: { borderColor: C.green }, noticeText: { color: C.green, fontSize: 12 }, error: { borderColor: C.pink }, errorText: { color: C.pink, fontSize: 12 },
});
