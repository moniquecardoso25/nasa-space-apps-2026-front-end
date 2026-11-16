import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrbiDrone } from '@/components/Astronaut';
import { ChatBubble } from '@/components/ChatBubble';
import { Icon } from '@/components/Icon';
import { Chip, Segmented } from '@/components/Inputs';
import { Txt } from '@/components/Txt';
import { VoiceMode } from '@/components/VoiceMode';
import { VoicePrep } from '@/components/VoicePrep';
import { addAiMessage, addJournalEntry, dayOfDate, etaOf, getAiMessages, getAstronaut, getCriticalAlerts, getJournal, getTodayLogs, sendAlertReport } from '@/data/api';
import { hhmm, relativeDay } from '@/data/format';
import { journalSummary, orbiReply, type OrbiAction } from '@/data/orbi';
import { useData } from '@/data/store';
import type { AiMessage, ChatMode } from '@/data/types';
import { useVoiceGate } from '@/voice/useVoiceGate';
import { fontFamily } from '@/theme/fonts';
import { C, X, tokens } from '@/theme/tokens';

type Msg = Pick<AiMessage, 'id' | 'author' | 'text' | 'timestamp'> & { actions?: OrbiAction[]; saved?: boolean };

/** Orbi AI chat. Journal mode persists + writes journal entries; Private mode never stores anything. */
export default function Orbi() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ChatMode>('journal');
  const [text, setText] = useState('');
  const [privateMsgs, setPrivateMsgs] = useState<Msg[]>([]);
  const [lastActions, setLastActions] = useState<OrbiAction[] | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
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
  const firstName = useData(() => getAstronaut().name.split(' ')[0]);
  // critical alerts: the one case where Orbi speaks first (shown in the chat, never as a pop-up)
  const critical = useData(() => getCriticalAlerts());
  const [notNow, setNotNow] = useState(false);
  const reportedAt = critical.find((a) => a.reportSentAt)?.reportSentAt;
  // fixed intro at the top of the chat (not stored, not a notification: Orbi never starts a conversation by itself)
  const intro =
    mode === 'journal'
      ? `Hi ${firstName}, I'm Orbi. Tell me how you feel, ask about your logs, or start your daily check-in. I don't diagnose: for medical questions, message your ground team.`
      : `Private chat: nothing here is saved or shared. Say anything, ${firstName}.`;
  const actions: OrbiAction[] =
    lastActions ??
    (mode === 'journal'
      ? [
          { label: 'Daily check-in', href: '/logs/orbi-fill' },
          { label: 'Make a wind-down plan', send: 'Make a wind-down plan' },
          { label: 'Log mood', href: '/logs/mood/add' },
          { label: 'Message ground team', href: '/messages' },
        ]
      : []);

  /** Sends a message (typed or spoken) and returns Orbi's reply text. */
  const send = (raw: string): string => {
    const body = raw.trim();
    if (!body) return '';
    setText('');
    const mine = addAiMessage(body, 'astronaut', mode);
    const reply = orbiReply(body);
    const answer = addAiMessage(reply.text, 'orbi', mode);
    if (mode === 'journal') {
      addJournalEntry(journalSummary(body), [mine.id], getTodayLogs('mood')[0]?.data.level);
    } else {
      setPrivateMsgs((cur) => [...cur, mine, { ...answer }]);
    }
    setLastActions(reply.actions ?? []);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return reply.text;
  };

  const runAction = (a: OrbiAction) => {
    if (a.href) router.push(a.href as never);
    else if (a.send) send(a.send);
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
            On board · replies instantly, no Earth delay
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
            setLastActions(null);
          }}
        />
        <View style={styles.disclaimer}>
          <Icon name={mode === 'journal' ? 'lock' : 'eyeOff'} size={14} color={C.teal} />
          <Txt size={tokens.font.size.tiny} lh={1.45} style={{ flex: 1 }}>
            {mode === 'journal' ? (
              <>
                <Txt weight="700" size={tokens.font.size.tiny}>
                  Journal mode:{' '}
                </Txt>
                Orbi saves what you share as your journal and sends summaries to your medical team. In{' '}
                <Txt weight="700" size={tokens.font.size.tiny}>
                  Private
                </Txt>{' '}
                mode nothing is saved, talk freely.
              </>
            ) : (
              <>
                <Txt weight="700" size={tokens.font.size.tiny}>
                  Private mode:{' '}
                </Txt>
                nothing you write here is saved or shared. It disappears when you leave.
              </>
            )}
          </Txt>
        </View>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.chat} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        <ChatBubble author="other" text={intro} />
        {mode === 'journal' && critical.length ? (
          <View style={{ gap: 10 }}>
            <ChatBubble author="other" text={`${firstName}, I noticed something important in your recent records.`} />
            <View style={styles.alertCard} accessibilityRole="alert">
              <View style={styles.alertIcon}>
                <Icon name="alert" size={22} color={C.danger} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt heading weight="700" size={tokens.font.size.body}>
                  Health alert
                </Txt>
                {critical.map((a) => (
                  <Txt key={a.id} size={tokens.font.size.small} lh={1.4}>
                    {a.text}
                  </Txt>
                ))}
              </View>
            </View>
            {reportedAt ? (
              <View style={styles.sentNote}>
                <Icon name="check" size={16} color={C.holoOk} />
                <Txt size={tokens.font.size.caption} style={{ flex: 1 }}>
                  Report sent to your medical team · arrives ~{hhmm(etaOf({ sentAt: reportedAt }))}. See Messages.
                </Txt>
              </View>
            ) : notNow ? null : (
              <>
                <ChatBubble author="other" text="Want me to send a report with your recent data to the ground medical team?" />
                <View style={styles.actions}>
                  <Chip label="Send report to ground" onPress={() => sendAlertReport(critical.map((a) => a.id))} />
                  <Chip label="Not now" onPress={() => setNotNow(true)} />
                </View>
              </>
            )}
          </View>
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
              <ChatBubble author={m.author === 'astronaut' ? 'me' : 'other'} text={m.text} />
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
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write or journal anything…"
          placeholderTextColor={C.muted}
          accessibilityLabel="Message Orbi"
          onSubmitEditing={() => send(text)}
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
        <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => send(text)} style={[styles.round, styles.send]}>
          <Icon name="send" size={20} color={C.bg} />
        </Pressable>
      </View>
      <VoiceMode
        visible={voice}
        onClose={() => setVoice(false)}
        title={mode === 'private' ? 'Orbi · Private' : 'Orbi · Journal'}
        intro={mode === 'private' ? 'Private voice chat. Nothing is saved. What is on your mind?' : `I'm listening. How are you doing today?`}
        hint={'“I slept badly” · “I feel stressed” · “I miss my family” · “make a wind-down plan”'}
        respond={(t) => ({ say: send(t) })}
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
  alertCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: tokens.radius.item,
    borderWidth: 1.5,
    borderColor: C.danger,
    backgroundColor: X.dangerNote,
  },
  alertIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: X.dangerIcon },
  sentNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: tokens.radius.small, backgroundColor: C.primarySoft },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
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

