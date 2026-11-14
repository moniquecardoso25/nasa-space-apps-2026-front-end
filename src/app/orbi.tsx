import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Chip, Label, Muted, Screen } from '@/components/cosmo-ui';
import { C } from '@/constants/cosmo';

type Message = { from: 'orbi' | 'you'; text: string };

export default function OrbiScreen() {
  const [mode, setMode] = useState<'Journal' | 'Private'>('Journal');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { from: 'orbi', text: 'Good morning, Ana. How did you sleep?' },
    { from: 'you', text: 'Not great. Woke up twice and felt tired all morning.' },
    { from: 'orbi', text: 'Your wrist band shows 5 h 20 min and low light exposure in the evening. Want me to set a 21:00 wind-down reminder?' },
  ]);
  const send = (value = text) => {
    if (!value.trim()) return;
    setMessages((current) => [...current, { from: 'you', text: value.trim() }, { from: 'orbi', text: 'Thanks for sharing. I have added this to your mission notes. Would you like a breathing break or to message Mission Control?' }]);
    setText('');
  };
  return <Screen>
    <View style={styles.header}><View style={styles.bot}><Text style={styles.botText}>O</Text></View><View style={{ flex: 1 }}><Text style={styles.title}>Orbi</Text><Text style={styles.online}>● On board · replies instantly</Text></View></View>
    <View style={styles.mode}><Pressable onPress={() => setMode('Journal')} style={[styles.modeButton, mode === 'Journal' && styles.modeSelected]}><Text style={styles.modeText}>▤  Journal</Text></Pressable><Pressable onPress={() => setMode('Private')} style={[styles.modeButton, mode === 'Private' && styles.modeSelected]}><Text style={styles.modeText}>◌  Private</Text></Pressable></View>
    <Card><Muted>{mode === 'Journal' ? 'Journal mode: Orbi saves what you share and can send summaries to your medical team.' : 'Private mode: nothing is saved or shared. Talk freely.'}</Muted></Card>
    <View style={{ gap: 11 }}>{messages.map((message, index) => <View key={`${index}-${message.from}`} style={[styles.bubble, message.from === 'you' ? styles.you : styles.orbi]}><Text style={styles.bubbleText}>{message.text}</Text></View>)}</View>
    <View style={styles.quick}><Chip title="Make a wind-down plan" onPress={() => send('Help me make a wind-down plan')} /><Chip title="Log mood" onPress={() => send('I want to log my mood')} /><Chip title="Message ground team" onPress={() => send('I would like to message Mission Control')} /></View>
    <View style={styles.composer}><TextInput accessibilityLabel="Write or journal anything" value={text} onChangeText={setText} placeholder={mode === 'Journal' ? 'Write or journal anything…' : 'Private note…'} placeholderTextColor={C.muted} multiline style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Send to Orbi" onPress={() => send()} style={styles.send}><Text style={{ color: C.background, fontWeight: '900' }}>➤</Text></Pressable></View>
    <Label>Talk with Orbi</Label>
  </Screen>;
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 4 }, bot: { height: 44, width: 44, borderRadius: 23, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }, botText: { color: C.background, fontWeight: '900', fontSize: 20 }, title: { color: C.text, fontWeight: '800', fontSize: 21 }, online: { color: C.teal, fontSize: 11, marginTop: 3 },
  mode: { flexDirection: 'row', borderRadius: 15, overflow: 'hidden', backgroundColor: C.surface, padding: 4 }, modeButton: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 12 }, modeSelected: { backgroundColor: C.purple }, modeText: { color: C.text, fontWeight: '700', fontSize: 13 },
  bubble: { padding: 14, maxWidth: '88%', borderRadius: 18 }, orbi: { alignSelf: 'flex-start', backgroundColor: C.surface, borderBottomLeftRadius: 5 }, you: { alignSelf: 'flex-end', backgroundColor: C.purple, borderBottomRightRadius: 5 }, bubbleText: { color: C.text, fontSize: 14, lineHeight: 20 }, quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, input: { flex: 1, minHeight: 48, maxHeight: 112, borderRadius: 18, padding: 13, color: C.text, backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, fontSize: 14 }, send: { width: 48, height: 48, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: C.purple },
});
