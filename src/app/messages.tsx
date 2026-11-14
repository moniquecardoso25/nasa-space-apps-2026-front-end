import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Heading, Muted, Screen } from '@/components/cosmo-ui';
import { C } from '@/constants/cosmo';

export default function MessagesScreen() {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const send = () => { if (draft.trim()) { setSent((items) => [...items, draft.trim()]); setDraft(''); } };
  return <Screen>
    <Heading eyebrow="Mission Control" title="Messages" subtitle="Earth is about 20 minutes away. Replies can take 40 minutes or more." />
    <Card style={{ borderColor: C.gold }}><Text style={styles.alert}>◷  For urgent health concerns, use the emergency protocol from your mission team.</Text></Card>
    <Text style={styles.date}>YESTERDAY</Text>
    <Bubble>Hi Ana, your logs show short sleep three nights in a row. We can dim the cabin lights at 21:00 for the crew.</Bubble>
    <Muted>Mission Control · 19:30</Muted>
    <Bubble outgoing>Thanks! The fan in the sleep quarters is loud; my band logged 52 dB.</Bubble>
    <Muted style={{ textAlign: 'right' }}>Delivered · 20:02</Muted>
    <Bubble>Maintenance will check the fan tomorrow. Keep logging sleep so we can compare.</Bubble>
    {sent.map((message, i) => <Bubble outgoing key={`${i}-${message}`}>{message}</Bubble>)}
    <Heading title="New message to ground" />
    <TextInput accessibilityLabel="Write to the ground team" value={draft} onChangeText={setDraft} multiline placeholder="Write to Mission Control…" placeholderTextColor={C.muted} style={styles.input} />
    <Pressable accessibilityRole="button" onPress={send} style={styles.send}><Text style={styles.sendText}>➤  Send message</Text></Pressable>
  </Screen>;
}

function Bubble({ children, outgoing }: { children: string; outgoing?: boolean }) { return <View style={[styles.bubble, outgoing && styles.outgoing]}><Text style={styles.body}>{children}</Text></View>; }

const styles = StyleSheet.create({ alert: { color: C.gold, lineHeight: 19, fontWeight: '600', fontSize: 13 }, date: { color: C.muted, textAlign: 'center', fontSize: 10, letterSpacing: 1.4 }, bubble: { padding: 14, maxWidth: '88%', alignSelf: 'flex-start', backgroundColor: C.surface, borderRadius: 18, borderBottomLeftRadius: 5 }, outgoing: { alignSelf: 'flex-end', backgroundColor: C.purple, borderBottomLeftRadius: 18, borderBottomRightRadius: 5 }, body: { color: C.text, lineHeight: 20, fontSize: 14 }, input: { minHeight: 110, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: 14, color: C.text, textAlignVertical: 'top' }, send: { minHeight: 50, borderRadius: 15, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }, sendText: { color: C.background, fontWeight: '800' },
});
