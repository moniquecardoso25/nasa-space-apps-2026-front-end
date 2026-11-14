import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrbiDrone } from '@/components/Astronaut';
import { PrimaryButton } from '@/components/Buttons';
import { ChatBubble } from '@/components/ChatBubble';
import { DraftCard } from '@/components/FillCards';
import { BackButton } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { Chip } from '@/components/Inputs';
import { Txt } from '@/components/Txt';
import { firstName, getAstronaut } from '@/data/api';
import { FILL_LABEL, FILL_QUESTION, openCategories, parseContext, saveDrafts, type Drafts } from '@/data/fill';
import { orbiParser, type DraftMap, type FillCategory } from '@/data/orbiParser';
import { fontFamily } from '@/theme/fonts';
import { C, X, tokens } from '@/theme/tokens';
import { speechAvailable, startListening } from '@/voice/speech';

type Item = { id: string; kind: 'orbi' | 'me'; text: string } | { id: string; kind: 'card'; category: FillCategory; slider?: boolean };

let seq = 0;
const nid = () => `f${++seq}`;

/** Pulsing mic while listening (static with reduced motion). */
function MicButton({ listening, onPress }: { listening: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(s);
    if (listening && !reduced) s.set(withRepeat(withSequence(withTiming(1.12, { duration: 450 }), withTiming(1, { duration: 450 })), -1));
    else s.set(1);
  }, [listening, reduced, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : 'Answer by voice'}
        accessibilityState={{ selected: listening }}
        onPress={onPress}
        style={[styles.round, styles.mic, listening && styles.micOn]}>
        <Icon name="mic" size={20} color={listening ? C.bg : C.teal} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Fill with Orbi: Orbi asks only the categories not logged today; the astronaut
 * answers by voice or text; each answer becomes an editable draft card; nothing
 * is saved until "Confirm & save".
 */
export default function OrbiFill() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  const [queue] = useState<FillCategory[]>(() => openCategories());
  const [step, setStep] = useState(0);
  const [retried, setRetried] = useState(false);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [assumed, setAssumed] = useState<Partial<Record<FillCategory, string[]>>>({});
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voice] = useState(() => speechAvailable());
  const stopRef = useRef<() => void>(() => {});
  const name = firstName(getAstronaut());
  const current = queue[step] as FillCategory | undefined;
  const done = step >= queue.length;

  const [items, setItems] = useState<Item[]>(() => {
    if (!queue.length) return [{ id: nid(), kind: 'orbi', text: `Everything is already logged today, ${name}. Nice work!` }];
    return [
      {
        id: nid(),
        kind: 'orbi',
        text: `Hi ${name}! Let's fill today's logs together: ${queue.map((c) => FILL_LABEL[c].toLowerCase()).join(', ')}. Answer by ${voice ? 'voice or text' : 'text'}, or say “skip”.`,
      },
      { id: nid(), kind: 'orbi', text: FILL_QUESTION[queue[0]].q },
    ];
  });

  useEffect(() => () => stopRef.current(), []);

  const push = (...more: Item[]) => {
    setItems((cur) => [...cur, ...more]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  };

  const next = (afterText?: string) => {
    const n = step + 1;
    setStep(n);
    setRetried(false);
    const msgs: Item[] = [];
    if (afterText) msgs.push({ id: nid(), kind: 'orbi', text: afterText });
    if (n < queue.length) msgs.push({ id: nid(), kind: 'orbi', text: FILL_QUESTION[queue[n]].q });
    else msgs.push({ id: nid(), kind: 'orbi', text: 'That’s everything. Check the cards above, edit anything, then confirm.' });
    push(...msgs);
  };

  const answer = (raw: string) => {
    const body = raw.trim();
    if (!body || !current) return;
    setText('');
    push({ id: nid(), kind: 'me', text: body });
    const r = orbiParser.parse(current, body, parseContext());
    if (r.skipped) {
      next(`Skipped ${FILL_LABEL[current].toLowerCase()}.`);
      return;
    }
    if (!r.understood && !retried) {
      setRetried(true);
      push({
        id: nid(),
        kind: 'orbi',
        text: `I didn't catch the ${r.assumed[0] ?? 'details'}. Could you say it again? ${FILL_QUESTION[current].hint}`,
      });
      return;
    }
    setDrafts((d) => ({ ...d, [current]: r.draft }));
    setAssumed((a) => ({ ...a, [current]: r.assumed }));
    push({ id: nid(), kind: 'card', category: current });
    next('Got it. Edit the card if something is off.');
  };

  /** Manual option for mood: a draft card with the vertical slider open. */
  const useSlider = () => {
    if (current !== 'mood') return;
    setDrafts((d) => ({ ...d, mood: { level: 3, tags: [] } }));
    setAssumed((a) => ({ ...a, mood: [] }));
    push({ id: nid(), kind: 'card', category: 'mood', slider: true });
    next('Drag the slider to your level.');
  };

  const toggleMic = async () => {
    setVoiceError(null);
    if (listening) {
      stopRef.current();
      return;
    }
    setListening(true);
    stopRef.current = await startListening({
      onPartial: (t) => setText(t),
      onFinal: (t) => answer(t),
      onEnd: () => setListening(false),
      onError: (m) => {
        setVoiceError(m);
        setListening(false);
      },
    });
  };

  const remove = (c: FillCategory) => {
    setDrafts((d) => {
      const copy = { ...d };
      delete copy[c];
      return copy;
    });
    setItems((cur) => cur.filter((i) => !(i.kind === 'card' && i.category === c)));
  };

  const count = Object.keys(drafts).length;
  const confirm = () => {
    saveDrafts(drafts);
    router.navigate('/home');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
        <OrbiDrone size={36} float={false} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt heading weight="700" size={tokens.font.size.screenTitle} accessibilityRole="header">
            Fill with Orbi
          </Txt>
          <Txt size={tokens.font.size.caption} color={C.teal}>
            {queue.length ? `${Math.min(step, queue.length)} of ${queue.length} answered · nothing saved until you confirm` : 'All logs done today'}
          </Txt>
        </View>
      </View>
      <View style={styles.steps}>
        {queue.map((c, i) => (
          <View key={c} style={[styles.stepChip, i === step && styles.stepNow, (drafts[c] || i < step) && styles.stepDone]}>
            <Txt size={tokens.font.size.tiny} weight={i === step ? '700' : '500'} color={drafts[c] ? C.teal : i === step ? C.text : C.muted}>
              {drafts[c] ? '✓ ' : ''}
              {FILL_LABEL[c]}
            </Txt>
          </View>
        ))}
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.chat} keyboardShouldPersistTaps="handled">
        {items.map((it) =>
          it.kind === 'card' ? (
            drafts[it.category] ? (
              <DraftCard
                key={it.id}
                category={it.category}
                draft={drafts[it.category] as DraftMap[typeof it.category]}
                assumed={assumed[it.category] ?? []}
                onChange={(d) => setDrafts((cur) => ({ ...cur, [it.category]: d }))}
                onRemove={() => remove(it.category)}
                initialSlider={it.slider}
              />
            ) : null
          ) : (
            <ChatBubble key={it.id} author={it.kind === 'me' ? 'me' : 'other'} text={it.text} />
          ),
        )}
        {!done && current ? (
          <Txt size={tokens.font.size.caption} color={C.muted}>
            {FILL_QUESTION[current].hint}
          </Txt>
        ) : null}
      </ScrollView>

      {done ? (
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {count ? (
            <PrimaryButton label={`Confirm & save ${count} log${count === 1 ? '' : 's'}`} reward={count * 10} onPress={confirm} />
          ) : (
            <PrimaryButton label="Back to Home" onPress={() => router.navigate('/home')} />
          )}
        </View>
      ) : (
        <View style={[styles.composerWrap, { paddingBottom: 10 + insets.bottom }]}>
          {voiceError ? (
            <Txt size={tokens.font.size.caption} color={C.warning}>
              {voiceError} You can type instead.
            </Txt>
          ) : listening ? (
            <Txt size={tokens.font.size.caption} color={C.teal} accessibilityLiveRegion="polite">
              Listening… speak your answer.
            </Txt>
          ) : null}
          <View style={styles.row}>
            <Chip label="Skip" onPress={() => answer('skip')} />
            {current === 'mood' ? <Chip label="Use the slider" onPress={useSlider} /> : null}
          </View>
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={listening ? 'Listening…' : 'Type your answer…'}
              placeholderTextColor={C.muted}
              accessibilityLabel="Your answer"
              onSubmitEditing={() => answer(text)}
              returnKeyType="send"
              style={styles.input}
            />
            {voice ? <MicButton listening={listening} onPress={toggleMic} /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Send answer" onPress={() => answer(text)} style={[styles.round, styles.send]}>
              <Icon name="send" size={20} color={C.bg} />
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10, paddingHorizontal: 16 },
  stepChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  stepNow: { borderColor: C.primary, backgroundColor: C.primarySoft },
  stepDone: { borderColor: C.teal, backgroundColor: X.tealChip },
  chat: { gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  footer: { paddingTop: 10, paddingHorizontal: 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: X.borderSoft, boxShadow: tokens.shadow.footer },
  composerWrap: { gap: 8, paddingTop: 8, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.border },
  row: { flexDirection: 'row', gap: 6 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  micOn: { backgroundColor: C.teal },
  send: { backgroundColor: C.primary },
});
