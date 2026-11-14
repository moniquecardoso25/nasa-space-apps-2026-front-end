import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Chip, Label, Muted, Screen } from '@/components/cosmo-ui';
import { useAuth } from '@/components/auth-context';
import { C } from '@/constants/cosmo';
import { crewHealthApi, type JsonRecord } from '@/services/crew-health-api';

type Message = { from: 'orbi' | 'you'; text: string };

export default function OrbiScreen() {
  const { session } = useAuth();
  const [mode, setMode] = useState<'Journal' | 'Private'>('Journal');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [hits, setHits] = useState<JsonRecord[]>([]);

  const send = async (value = text) => {
    const prompt = value.trim();
    if (!prompt || busy) return;
    setMessages((current) => [...current, { from: 'you', text: prompt }]);
    setText(''); setError(''); setBusy(true);
    if (mode === 'Private') {
      setMessages((current) => [...current, { from: 'orbi', text: 'Private mode keeps this conversation in this screen only. No Crew Health API request was made.' }]);
      setBusy(false);
      return;
    }
    if (!session?.me || session.offlineDemo) {
      setMessages((current) => [...current, { from: 'orbi', text: 'The NASA health knowledge API is not connected. This message stays in the local demo.' }]);
      setBusy(false);
      return;
    }
    try {
      const result = await crewHealthApi.knowledge.search(prompt, 3);
      setHits(result.hits);
      setMessages((current) => [...current, { from: 'orbi', text: result.hits.length ? `I found ${result.total} reference passage(s) in the crew health knowledge base.` : 'I could not find a matching passage in the crew health knowledge base.' }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Knowledge search failed.');
      setMessages((current) => [...current, { from: 'orbi', text: 'I could not reach the crew health knowledge base. Your question was not saved.' }]);
    }
    setBusy(false);
  };

  return <Screen>
    <View style={styles.header}><View style={styles.bot}><Text style={styles.botText}>O</Text></View><View style={{ flex: 1 }}><Text style={styles.title}>Orbi</Text><Text style={styles.online}>{session?.me && !session.offlineDemo ? 'Crew Health API · reference search' : 'Local prototype · API not connected'}</Text></View></View>
    <View style={styles.mode}><Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'Journal' }} onPress={() => { setMode('Journal'); setHits([]); }} style={[styles.modeButton, mode === 'Journal' && styles.modeSelected]}><Text style={styles.modeText}>▤  Journal</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'Private' }} onPress={() => { setMode('Private'); setHits([]); }} style={[styles.modeButton, mode === 'Private' && styles.modeSelected]}><Text style={styles.modeText}>◌  Private</Text></Pressable></View>
    <Card><Muted>{mode === 'Journal' ? 'Journal mode sends your question to the Crew Health knowledge search. This backend does not store Orbi chat messages.' : 'Private mode makes no API requests. Messages remain in this screen state and disappear when you leave.'}</Muted></Card>
    <View style={{ gap: 11 }}>{messages.length ? messages.map((message, index) => <View key={`${index}-${message.from}`} style={[styles.bubble, message.from === 'you' ? styles.you : styles.orbi]}><Text style={styles.bubbleText}>{message.text}</Text></View>) : <View style={[styles.bubble, styles.orbi]}><Text style={styles.bubbleText}>Hello, {session?.me?.displayName.split(' ')[0] || 'crew member'}. Ask a question about crew health references or switch to Private mode.</Text></View>}</View>
    {busy ? <Muted>Searching crew health references…</Muted> : null}
    {error ? <Muted style={{ color: C.gold }}>{error}</Muted> : null}
    {hits.length ? <Card><Label>NASA health references</Label>{hits.map((hit, index) => <View key={`${hit.documentId ?? index}-${hit.page ?? 0}`} style={styles.hit}><Text style={styles.hitTitle}>{String(hit.documentTitle ?? 'Crew health document')}</Text><Muted>Page {String(hit.page ?? '—')} · score {String(hit.score ?? '—')}</Muted><Text style={styles.hitSnippet}>{String(hit.snippet ?? '')}</Text></View>)}</Card> : null}
    <View style={styles.quick}><Chip title="Find a wind-down reference" onPress={() => void send('sleep work rest schedule')} /><Chip title="Open mood check-in" onPress={() => router.push('/log/mood')} /><Chip title="Request medical support" onPress={() => router.push('/messages')} /></View>
    <View style={styles.composer}><TextInput accessibilityLabel="Ask Orbi a question" value={text} onChangeText={setText} placeholder={mode === 'Journal' ? 'Search crew health references…' : 'Write a private note…'} placeholderTextColor={C.muted} multiline style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Send to Orbi" disabled={busy} onPress={() => void send()} style={[styles.send, busy && { opacity: 0.5 }]}><Text style={{ color: C.background, fontWeight: '900' }}>➤</Text></Pressable></View>
    <Label>Talk with Orbi</Label>
  </Screen>;
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 4 }, bot: { height: 44, width: 44, borderRadius: 23, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }, botText: { color: C.background, fontWeight: '900', fontSize: 20 }, title: { color: C.text, fontWeight: '800', fontSize: 21 }, online: { color: C.teal, fontSize: 11, marginTop: 3 },
  mode: { flexDirection: 'row', borderRadius: 15, overflow: 'hidden', backgroundColor: C.surface, padding: 4 }, modeButton: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 12 }, modeSelected: { backgroundColor: C.purple }, modeText: { color: C.text, fontWeight: '700', fontSize: 13 },
  bubble: { padding: 14, maxWidth: '88%', borderRadius: 18 }, orbi: { alignSelf: 'flex-start', backgroundColor: C.surface, borderBottomLeftRadius: 5 }, you: { alignSelf: 'flex-end', backgroundColor: C.purple, borderBottomRightRadius: 5 }, bubbleText: { color: C.text, fontSize: 14, lineHeight: 20 }, quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, input: { flex: 1, minHeight: 48, maxHeight: 112, borderRadius: 18, padding: 13, color: C.text, backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, fontSize: 14 }, send: { width: 48, height: 48, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: C.purple }, hit: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 9, gap: 5 }, hitTitle: { color: C.text, fontSize: 13, fontWeight: '800' }, hitSnippet: { color: C.muted, fontSize: 12, lineHeight: 17 },
});
