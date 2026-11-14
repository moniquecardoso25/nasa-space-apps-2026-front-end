import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrbiDrone } from '@/components/Astronaut';
import { ChatBubble } from '@/components/ChatBubble';
import { Icon } from '@/components/Icon';
import { Chip, Segmented } from '@/components/Inputs';
import { Txt } from '@/components/Txt';
import { addAiMessage, addJournalEntry, dayOfDate, getAiMessages, getJournal, getTodayLogs } from '@/data/api';
import { hhmm, relativeDay } from '@/data/format';
import { journalSummary, orbiReply, type OrbiAction } from '@/data/orbi';
import { useData } from '@/data/store';
import type { AiMessage, ChatMode } from '@/data/types';
import { fontFamily } from '@/theme/fonts';
import { C, tokens } from '@/theme/tokens';

type Msg = Pick<AiMessage, 'id' | 'author' | 'text' | 'timestamp'> & { actions?: OrbiAction[]; saved?: boolean };

/** Orbi AI chat. Journal mode persists + writes journal entries; Private mode never stores anything. */
export default function Orbi() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ChatMode>('journal');
  const [text, setText] = useState('');
  const [privateMsgs, setPrivateMsgs] = useState<Msg[]>([]);
  const [lastActions, setLastActions] = useState<OrbiAction[] | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

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
    lastActions ??
    (mode === 'journal'
      ? [
          { label: 'Make a wind-down plan', send: 'Make a wind-down plan' },
          { label: 'Log mood', href: '/logs/mood/add' },
          { label: 'Message ground team', href: '/messages' },
        ]
      : []);

  const send = (raw: string) => {
    const body = raw.trim();
    if (!body) return;
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
  };

  const runAction = (a: OrbiAction) => {
    if (a.href) router.push(a.href as never);
    else if (a.send) send(a.send);
  };

  let lastDay = -1;
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
        {msgs.length === 0 ? (
          <Txt size={tokens.font.size.small} color={C.muted} align="center" style={{ marginTop: 20 }}>
            {mode === 'private' ? 'Say anything. This conversation is not stored.' : 'Say hi to Orbi.'}
          </Txt>
        ) : null}
        {msgs.map((m) => {
          const day = dayOfDate(m.timestamp);
          const sep = day !== lastDay;
          lastDay = day;
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
        <View accessibilityLabel="Voice message (coming soon)" accessibilityState={{ disabled: true }} style={[styles.round, styles.mic]}>
          <Icon name="mic" size={20} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => send(text)} style={[styles.round, styles.send]}>
          <Icon name="send" size={20} color={C.bg} />
        </Pressable>
      </View>
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
  mic: { opacity: 0.35, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  send: { backgroundColor: C.primary },
});

