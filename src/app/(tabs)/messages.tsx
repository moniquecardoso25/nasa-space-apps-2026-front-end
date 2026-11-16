import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/ChatBubble';
import { Icon } from '@/components/Icon';
import { Chip } from '@/components/Inputs';
import { Txt } from '@/components/Txt';
import { dayOfDate, etaOf, getGroundMessages, getMission, getNow, getTodayLogs, sendGroundMessage } from '@/data/api';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { hhmm, relativeDay } from '@/data/format';
import { useData } from '@/data/store';
import { fontFamily } from '@/theme/fonts';
import { speechAvailable, startListening, type StopFn } from '@/voice/speech';
import { useVoiceGate } from '@/voice/useVoiceGate';
import { C, X, tokens } from '@/theme/tokens';

/** Header of a medical support request, so the medical team can triage it (the astronaut only says / types the content). */
const SUPPORT_HEADER = 'Medical support request';

/** Messages with the ground team. Status and ETA come from sentAt + mission.commDelaySec. */
export default function Messages() {
  const insets = useSafeAreaInsets();
  const action = useAsyncAction();
  const [text, setText] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [attach, setAttach] = useState(false);
  // system note shown while a support request is being written (local only, never sent)
  const [supportNote, setSupportNote] = useState(false);
  const [now, setNow] = useState(() => getNow().getTime());
  const scroll = useRef<ScrollViewInstance>(null);
  // dictation: same on-device / browser speech as the rest of the app
  const [voice] = useState(() => speechAvailable());
  const gate = useVoiceGate(voice);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const stopRef = useRef<StopFn | null>(null);
  const baseRef = useRef('');
  useEffect(() => () => stopRef.current?.abort(), []);

  const toggleMic = async () => {
    if (listening) {
      stopRef.current?.();
      return;
    }
    baseRef.current = text ? `${text.trimEnd()} ` : '';
    setListening(true);
    stopRef.current = await startListening(
      {
        onPartial: (t) => setText(baseRef.current + t),
        onStatus: (st) => setBusy(st === 'transcribing' || st === 'loading'),
        onFinal: (t) => setText(baseRef.current + t),
        onEnd: () => {
          setListening(false);
          setBusy(false);
        },
        onError: () => {
          setListening(false);
          setBusy(false);
        },
      },
      { continuous: true },
    );
  };

  const requestSupport = () => {
    setAttach(true);
    setSupportNote(true);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  // Re-evaluate in-transit messages every 15 s.
  useEffect(() => {
    const t = setInterval(() => setNow(getNow().getTime()), 15000);
    return () => clearInterval(t);
  }, []);

  const { msgs, delayMin, todayLogIds } = useData(() => ({
    msgs: getGroundMessages(),
    delayMin: Math.round(getMission().commDelaySec / 60),
    todayLogIds: (['mood', 'sleep', 'radiation', 'measurement', 'meal', 'exercise'] as const).flatMap((t) => getTodayLogs(t).map((l) => l.id)),
  }));
  const delayMs = delayMin * 60000;

  const send = () => action.run(async () => {
    const body = text.trim();
    if (!body) return;
    await sendGroundMessage(supportNote ? `${SUPPORT_HEADER}\n${body}` : body, urgent, attach ? todayLogIds : []);
    setText('');
    setUrgent(false);
    setAttach(false);
    setSupportNote(false);
    setNow(getNow().getTime());
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { paddingTop: insets.top }]}>
      {action.error ? <Txt color={C.danger} accessibilityLiveRegion="polite">{action.error}</Txt> : null}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ gap: 2, flex: 1 }}>
            <Txt heading weight="700" size={tokens.font.size.title} accessibilityRole="header">
              Messages
            </Txt>
            <Txt size={tokens.font.size.small} color={C.muted}>
              Ground team · Mission Control
            </Txt>
          </View>
          <View style={styles.planet}>
            <Icon name="planet" size={22} color={C.primary} />
          </View>
        </View>
        <View style={styles.banner} accessibilityRole="alert">
          <Icon name="clock" size={16} color={C.gold} />
          <Txt size={tokens.font.size.caption} style={{ flex: 1 }}>
            <Txt weight="700" size={tokens.font.size.caption}>
              Earth is {delayMin} min away.{' '}
            </Txt>
            Replies take {delayMin * 2}+ min. For anything urgent, use Orbi.
          </Txt>
        </View>
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.thread} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {msgs.map((m, i) => {
          const day = dayOfDate(m.sentAt);
          const sep = i === 0 || day !== dayOfDate(msgs[i - 1].sentAt);
          const eta = etaOf(m);
          const arrived = now >= eta.getTime();
          const mine = m.from === 'astronaut';
          const progress = Math.max(0, Math.min(1, (now - new Date(m.sentAt).getTime()) / delayMs));
          return (
            <View key={m.id} style={{ gap: 12 }}>
              {sep ? (
                <Txt size={tokens.font.size.tiny} color={C.muted} align="center">
                  {relativeDay(day).split(' · ')[0]}
                </Txt>
              ) : null}
              <ChatBubble
                author={mine ? 'me' : 'other'}
                text={m.text}
                progress={mine && !arrived ? progress : undefined}
                meta={
                  mine
                    ? arrived
                      ? `Delivered ${hhmm(eta)}${m.urgent ? ' · urgent' : ''}`
                      : `In transit · arrives on Earth ~${hhmm(eta)}`
                    : `Mission Control · arrived ${hhmm(eta)}${m.urgent ? ' · urgent' : ''}`
                }
                metaColor={mine ? (arrived ? C.holoOk : C.gold) : m.urgent ? C.danger : C.muted}
                metaIcon={mine ? (arrived ? 'check' : 'clock') : m.urgent ? 'alert' : undefined}>
                {m.attachments.length ? (
                  <View style={styles.attach}>
                    <Icon name="paperclip" size={12} color={mine ? C.onPrimary : C.muted} />
                    <Txt size={tokens.font.size.tiny} color={mine ? C.onPrimary : C.muted}>
                      {m.attachments.length} log{m.attachments.length === 1 ? '' : 's'} attached
                    </Txt>
                  </View>
                ) : null}
              </ChatBubble>
            </View>
          );
        })}
        {supportNote ? (
          <View style={styles.system} accessibilityRole="alert">
            <View style={styles.row}>
              <Icon name="alert" size={14} color={C.teal} />
              <Txt weight="700" size={tokens.font.size.tiny} color={C.teal}>
                SYSTEM
              </Txt>
            </View>
            <Txt size={tokens.font.size.caption} lh={1.45}>
              Medical support request: say it with the mic or type it. Tell what is wrong, since when, and what you noticed. Today&apos;s logs go attached; tap Send when ready.
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <View style={styles.row}>
          <Txt size={tokens.font.size.caption} weight="600" color={C.muted} style={{ flex: 1 }}>
            New message to ground
          </Txt>
          <Chip label="Request medical support" selected={supportNote} onPress={supportNote ? () => setSupportNote(false) : requestSupport} />
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder={busy ? 'Writing down what you said…' : listening ? 'Listening… tap the mic when you finish' : supportNote ? 'What is wrong, since when, what you noticed…' : 'Write or dictate to the ground team…'}
          placeholderTextColor={C.muted}
          accessibilityLabel="New message to ground"
          style={styles.textarea}
        />
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={attach ? "Remove today's logs" : "Attach today's logs"}
            accessibilityState={{ selected: attach }}
            onPress={() => setAttach(!attach)}
            style={[styles.attachBtn, attach && { borderColor: C.teal, backgroundColor: X.tealChip }]}>
            <Icon name="paperclip" size={18} color={attach ? C.teal : C.text} />
          </Pressable>
          {voice ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop dictation' : gate.ready ? 'Dictate message' : 'Voice is getting ready'}
              accessibilityState={{ selected: listening, disabled: !gate.ready || busy }}
              disabled={!gate.ready || busy}
              onPress={toggleMic}
              style={[styles.attachBtn, listening && { borderColor: C.teal, backgroundColor: C.teal }, (!gate.ready || busy) && { opacity: 0.4 }]}>
              {busy ? <ActivityIndicator size="small" color={C.teal} /> : <Icon name="mic" size={18} color={listening ? C.bg : C.teal} />}
            </Pressable>
          ) : null}
          <Chip label="Mark urgent" selected={urgent} onPress={() => setUrgent(!urgent)} />
          {attach ? (
            <Txt size={tokens.font.size.tiny} color={C.teal}>
              {todayLogIds.length} logs
            </Txt>
          ) : null}
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send} disabled={!text.trim()} style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]}>
            <Icon name="send" size={16} color={C.bg} />
            <Txt weight="700" size={tokens.ext.fontSize.label} color={C.onPrimary}>
              Send
            </Txt>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { gap: 10, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planet: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.small,
    backgroundColor: X.goldBanner,
    borderWidth: 1,
    borderColor: X.goldBannerBorder,
  },
  system: { gap: 4, alignSelf: 'stretch', paddingVertical: 10, paddingHorizontal: 12, borderRadius: tokens.radius.small, borderWidth: 1, borderStyle: 'dashed', borderColor: C.teal, backgroundColor: X.tealSoft },
  thread: { gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  attach: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  composer: { gap: 8, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 10, borderTopWidth: 1, borderTopColor: C.border },
  textarea: {
    minHeight: 64,
    maxHeight: 120,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: tokens.ext.radius.button,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: tokens.ext.fontSize.label,
    lineHeight: 20,
    fontFamily: fontFamily('body', '400'),
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachBtn: { width: 44, height: 44, borderRadius: tokens.radius.item, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { minHeight: 44, paddingHorizontal: 18, borderRadius: tokens.radius.item, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
