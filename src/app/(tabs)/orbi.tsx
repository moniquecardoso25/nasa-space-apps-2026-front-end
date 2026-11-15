import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrbiDrone } from '@/components/Astronaut';
import { ChatBubble } from '@/components/ChatBubble';
import { Icon } from '@/components/Icon';
import { Chip, Segmented } from '@/components/Inputs';
import { Txt } from '@/components/Txt';
import { VoiceMode } from '@/components/VoiceMode';
import { VoicePrep } from '@/components/VoicePrep';
import { dayOfDate, getAiMessages, getJournal, sendOrbiChat } from '@/data/api';
import { hhmm, relativeDay } from '@/data/format';
import { useData } from '@/data/store';
import type { AiMessage, ChatMode } from '@/data/types';
import { useVoiceGate } from '@/voice/useVoiceGate';
import { fontFamily } from '@/theme/fonts';
import { C, X, tokens } from '@/theme/tokens';

type Msg = Pick<AiMessage, 'id' | 'author' | 'text' | 'timestamp'> & { saved?: boolean };
type OrbiAction = { label: string; href?: string; send?: string };

function looksLikeQuestion(text: string) {
  const value = text.trim().toLocaleLowerCase();
  return (
    /[?¿]/.test(value) ||
    /^(why|what|when|where|who|whom|whose|how|can|could|would|should|is|are|do|does|did|will|make|create|help|give me|show me|tell me|explain|recommend|suggest|plan|i want to know|i have a question|por que|porque|como|o que|qual|quando|onde|quem|posso|pode|devo|deveria|me ajude|me diga|me de|recomende|sugira|planeje)\b/u.test(value)
  );
}

/** Orbi chat backed by the Crew Health API. Journal history comes from the server; Private stays in component state. */
export default function Orbi() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ChatMode>('private');
  const [text, setText] = useState('');
  const [privateMsgs, setPrivateMsgs] = useState<Msg[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<string | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const sending = useRef(false);
  const [voice, setVoice] = useState(false);
  // start the on-device voice download as soon as this screen opens; voice unlocks when ready
  const gate = useVoiceGate();

  const journalMsgs = useData(() => {
    const msgs = getAiMessages();
    const savedSources = new Set(getJournal().flatMap((j) => j.sourceMessageIds));
    // "Saved to your journal" chip goes after Orbi's reply to a saved message.
    return msgs.map((m, i) => ({
      ...m,
      saved: m.author === 'orbi' && i > 0 && msgs[i - 1].author === 'astronaut' && savedSources.has(msgs[i - 1].id),
    }));
  });
  const msgs: Msg[] = mode === 'journal' ? journalMsgs : privateMsgs;
  const actions: OrbiAction[] =
    mode === 'journal'
      ? [
          { label: "Fill today's logs", href: '/logs/orbi-fill' },
          { label: 'Ask about sleep (private)', send: 'Why is sleep important in space?' },
          { label: 'Log mood', href: '/logs/mood/add' },
          { label: 'Message ground team', href: '/messages' },
        ]
      : [];

  /** Sends a message to the authenticated API; no success message is added before the HTTP reply. */
  const send = async (raw: string, targetMode: ChatMode = mode): Promise<string> => {
    const body = raw.trim();
    if (!body) return '';
    if (targetMode === 'journal' && looksLikeQuestion(body)) {
      setMode('private');
      setPrivacyNotice('This looks like a question, so Orbi is sending it privately instead of creating a journal entry.');
      return send(body, 'private');
    }
    if (sending.current) throw new Error('Orbi is still responding. Please wait.');
    sending.current = true;
    setIsSending(true);
    setError(null);
    try {
      const response = await sendOrbiChat(body, targetMode);
      const timestamp = new Date().toISOString();
      if (response.mode === 'private') {
        if (targetMode !== 'private') setMode('private');
        const mine: Msg = { id: `private-${timestamp}-user`, author: 'astronaut', text: body, timestamp };
        const answer: Msg = { id: `private-${timestamp}-orbi`, author: 'orbi', text: response.reply, timestamp };
        setPrivateMsgs((cur) => [...cur, mine, answer]);
      } else if (targetMode === 'private') {
        setMode('journal');
      }
      setText('');
      setRetryText(null);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
      return response.reply;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Orbi could not respond. Please try again.';
      setError(message);
      setRetryText(body);
      if (targetMode === mode) setText(body);
      throw cause;
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  };

  const sendFromComposer = () => void send(text).catch(() => {});

  const runAction = (a: OrbiAction) => {
    if (a.href) router.push(a.href as never);
    else if (a.send) {
      setMode('private');
      void send(a.send, 'private').catch(() => {});
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <OrbiDrone size={40} float={false} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt heading weight="700" size={tokens.font.size.screenTitle} accessibilityRole="header">
            Orbi
          </Txt>
          <Txt size={tokens.font.size.caption} color={C.teal}>
            API Orbi · rules-based (agent route unavailable)
          </Txt>
        </View>
      </View>
      <View style={styles.modeWrap}>
        <Segmented
          items={[
            { value: 'journal', label: 'Journal' },
            { value: 'private', label: 'Private' },
          ]}
          selected={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
            setPrivacyNotice(null);
            setRetryText(null);
          }}
        />
        <View style={styles.disclaimer}>
          <Icon name={mode === 'journal' ? 'lock' : 'eyeOff'} size={14} color={C.teal} />
          <Txt size={tokens.font.size.tiny} lh={1.45} style={{ flex: 1 }}>
            {mode === 'journal'
              ? 'The server stores every Journal message as a health journal entry. Questions and advice requests are sent privately.'
              : 'Your text is sent to the API for a reply, but the server does not store it.'}
          </Txt>
        </View>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.chat} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {msgs.length === 0 ? (
          <Txt size={tokens.font.size.small} color={C.muted} align="center" style={{ marginTop: 20 }}>
            {mode === 'private' ? 'Ask Orbi anything. This conversation is not stored.' : 'Share a health update with Orbi.'}
          </Txt>
        ) : null}
        {msgs.map((m, i) => {
          const day = dayOfDate(m.timestamp);
          const sep = i === 0 || day !== dayOfDate(msgs[i - 1].timestamp);
          return (
            <View key={m.id} style={{ gap: 10 }}>
              {sep ? (
                <Txt size={tokens.font.size.tiny} color={C.muted} align="center">
                  {relativeDay(day).split(' · ')[0]} · {hhmm(m.timestamp)}
                </Txt>
              ) : null}
              <ChatBubble author={m.author === 'astronaut' ? 'me' : 'other'} text={m.text} meta={m.author === 'orbi' ? 'Crew Health API' : undefined} />
              {m.saved ? (
                <Pressable accessibilityRole="link" onPress={() => router.push('/logs/mood')} style={styles.savedChip}>
                  <Icon name="journal" size={16} color={C.teal} />
                  <Txt size={tokens.font.size.caption} style={{ flexShrink: 1 }}>
                    Saved to your journal (Shared with Orbi) ·{' '}
                    <Txt weight="700" size={tokens.font.size.caption} color={C.teal}>
                      View
                    </Txt>
                  </Txt>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        {isSending ? (
          <View style={styles.thinking} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={C.teal} />
            <Txt size={tokens.font.size.caption} color={C.muted}>Orbi is waiting for the server...</Txt>
          </View>
        ) : null}
        {actions.length ? (
          <View style={styles.actions}>
            {actions.map((a) => (
              <Chip key={a.label} label={a.label} onPress={() => runAction(a)} />
            ))}
          </View>
        ) : null}
      </ScrollView>
      {gate.needs && !gate.ready ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
          <VoicePrep gate={gate} />
        </View>
      ) : null}
      <View style={styles.composer}>
        {privacyNotice ? (
          <Txt size={tokens.font.size.caption} color={C.teal} style={{ width: '100%' }} accessibilityLiveRegion="polite">
            {privacyNotice}
          </Txt>
        ) : null}
        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Txt size={tokens.font.size.caption} color={C.danger} style={{ flex: 1 }}>{error}</Txt>
            {retryText ? (
              <Pressable accessibilityRole="button" onPress={() => void send(retryText).catch(() => {})} disabled={isSending}>
                <Txt size={tokens.font.size.caption} color={C.teal} weight="700">Retry</Txt>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            setPrivacyNotice(null);
          }}
          placeholder={mode === 'private' ? 'Ask Orbi privately...' : 'Share a health update...'}
          placeholderTextColor={C.muted}
          editable={!isSending}
          accessibilityLabel="Message Orbi"
          onSubmitEditing={sendFromComposer}
          returnKeyType="send"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={gate.ready ? 'Voice mode: talk with Orbi' : 'Voice mode: preparing'}
          accessibilityState={{ disabled: !gate.ready }}
          disabled={!gate.ready}
          onPress={() => setVoice(true)}
          style={[styles.round, styles.mic, !gate.ready && { opacity: 0.35 }]}>
          <Icon name="wave" size={20} color={C.teal} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={sendFromComposer} disabled={isSending || !text.trim()} style={[styles.round, styles.send, (isSending || !text.trim()) && { opacity: 0.5 }]}>
          {isSending ? <ActivityIndicator size="small" color={C.bg} /> : <Icon name="send" size={20} color={C.bg} />}
        </Pressable>
      </View>
      <VoiceMode
        visible={voice}
        onClose={() => setVoice(false)}
        title={mode === 'private' ? 'Orbi · Private' : 'Orbi · Journal'}
        intro={mode === 'private' ? 'Private voice chat. What is on your mind?' : `I'm listening. Share a health update.`}
        hint={mode === 'private' ? '“Why is sleep important?” · “Make a wind-down plan”' : '“I slept badly” · “I feel stressed” · “I miss my family”'}
        respond={async (t) => ({ say: await send(t) })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modeWrap: { gap: 8, paddingTop: 10, paddingHorizontal: 16 },
  disclaimer: { flexDirection: 'row', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: tokens.radius.small, backgroundColor: C.primarySoft },
  chat: { gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  savedChip: {
    alignSelf: 'flex-start',
    maxWidth: '78%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.item,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.teal,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 8 },
  errorBox: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: tokens.radius.small, backgroundColor: C.surface, borderWidth: 1, borderColor: C.danger },
  composer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: tokens.ext.radius.panel,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: tokens.ext.fontSize.label,
    fontFamily: fontFamily('body', '400'),
  },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  mic: { backgroundColor: X.tealSoft, borderWidth: 1, borderColor: C.teal },
  send: { backgroundColor: C.primary },
});

