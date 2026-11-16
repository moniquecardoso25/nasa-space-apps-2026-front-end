import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrbiDrone } from '@/components/Astronaut';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { ChatBubble } from '@/components/ChatBubble';
import { CheckinSteps, type StepItem } from '@/components/CheckinSteps';
import { DraftCard } from '@/components/FillCards';
import { BackButton } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { Chip } from '@/components/Inputs';
import { applyMealAnswer, applySessionAnswer, MealChoices, SessionChoices } from '@/components/PlanCards';
import { PrototypeTag } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { VoiceMode, type VoiceReply } from '@/components/VoiceMode';
import { VoicePrep } from '@/components/VoicePrep';
import { firstName, getAstronaut } from '@/data/api';
import { AUTO_FILLED, FILL_LABEL, FILL_ORDER, FILL_QUESTION, openCategories, parseContext, saveDrafts, SOURCE_LABEL, type Drafts } from '@/data/fill';
import { openMealChoices, openSessionChoices, readDevices, SLOT_LABEL, type MealChoice, type SessionChoice } from '@/data/plans';
import { MOOD_TITLE } from '@/data/derived';
import { formatDuration } from '@/data/format';
import { draftSleepMinutes, orbiParser, type DraftMap, type FillCategory } from '@/data/orbiParser';
import { spokenToDigits } from '@/data/spokenNumbers';
import { fontFamily } from '@/theme/fonts';
import { C, X, tokens } from '@/theme/tokens';
import { speechAvailable, startListening } from '@/voice/speech';
import { speak, stopSpeaking, ttsAvailable } from '@/voice/tts';
import { useVoiceGate } from '@/voice/useVoiceGate';

type Item = { id: string; kind: 'orbi' | 'me'; text: string } | { id: string; kind: 'card'; category: FillCategory; slider?: boolean; source?: string };

/** Order of the check-in: device readings first (each confirmed with "OK"), then the questions. */
/** Spoken / tapped mood answers (same words the parser understands). */
const MOOD_CHOICES = ['Great', 'Good', 'Okay', 'Tired', 'Stressed'];
const ASK_ORDER: FillCategory[] = ['sleep', 'radiation', 'body', 'mood', 'meal', 'exercise'];
const OK = /^\s*(ok|okay|yes|yeah|yep|sure|correct|right|confirm(ed)?|looks? (good|right)|all good|that'?s right)\b/i;
const CONFIRM_HINT: Partial<Record<FillCategory, string>> = {
  sleep: 'e.g. “OK” or “slept six hours” or “bed at eleven”',
  radiation: 'e.g. “OK” or “forty microsieverts”',
  body: 'e.g. “OK” or “120 over 80, pulse 70”',
};

/** One device reading read back, short (it is also spoken): "Sleep: 7h 02m, 22:44–05:46. Right?" */
function confirmQuestion(c: FillCategory, d: Drafts, edited = false): string {
  const pre = edited ? 'Updated. ' : '';
  const end = edited ? 'OK?' : 'Right?';
  if (c === 'sleep' && d.sleep) return `${pre}Sleep: ${formatDuration(draftSleepMinutes(d.sleep))}, ${d.sleep.bed}–${d.sleep.wake}. ${end}`;
  if (c === 'radiation' && d.radiation) return `${pre}Dose: ${d.radiation.value} ${d.radiation.unit === 'uSv' ? 'µSv' : 'mSv'} at ${d.radiation.readAt}. ${end}`;
  if (c === 'body' && d.body) return `${pre}Blood pressure: ${d.body.systolic}/${d.body.diastolic}, pulse ${d.body.pulse}. ${end}`;
  return FILL_QUESTION[c].q;
}

let seq = 0;
const nid = () => `f${++seq}`;

/** Pulsing mic while listening (static with reduced motion). */
function MicButton({ listening, busy, onPress }: { listening: boolean; busy?: boolean; onPress: () => void }) {
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
        accessibilityLabel={busy ? 'Voice busy' : listening ? 'Stop listening' : 'Answer by voice'}
        accessibilityState={{ selected: listening, disabled: busy }}
        disabled={busy}
        onPress={onPress}
        style={[styles.round, styles.mic, listening && styles.micOn, busy && { opacity: 0.35 }]}>
        <Icon name="mic" size={20} color={listening ? C.bg : C.teal} />
      </Pressable>
    </Animated.View>
  );
}

/** Shown when every counted log is already done today: nothing left to fill. */
function AllCaughtUp({ name, bottom }: { name: string; bottom: number }) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.allDone}>
        <View style={styles.doneBadge}>
          <Icon name="check" size={44} color={C.holoOk} strokeWidth={2.5} />
        </View>
        <Txt heading weight="700" size={tokens.font.size.title} align="center" accessibilityRole="header">
          All caught up!
        </Txt>
        <Txt size={tokens.font.size.body} color={C.muted} align="center" lh={1.45}>
          Every log is done for today, {name}. Nothing left to fill.
        </Txt>
        <View style={styles.doneList}>
          {FILL_ORDER.map((c, i) => (
            <View key={c} style={[styles.doneRow, i > 0 && styles.doneSep]}>
              <Txt weight="600" size={tokens.font.size.body}>
                {FILL_LABEL[c]}
              </Txt>
              <View style={styles.row}>
                <Icon name="check" size={16} color={C.holoOk} strokeWidth={2.5} />
                <Txt weight="600" size={tokens.font.size.small} color={C.holoOk}>
                  Logged
                </Txt>
              </View>
            </View>
          ))}
        </View>
        <Txt size={tokens.font.size.caption} color={C.muted} align="center">
          Come back tomorrow: Orbi only asks what is still missing.
        </Txt>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + bottom, gap: 8 }]}>
        <PrimaryButton label="Back to Home" onPress={() => router.navigate('/home')} />
        <SecondaryButton label="Talk to Orbi" icon="orbi" onPress={() => router.navigate('/orbi')} />
      </View>
    </View>
  );
}

/**
 * Daily check-in (Fill with Orbi), under 2 minutes:
 * 1. Orbi "reads" the devices (wrist band, dosimeter, BP cuff; simulated) and loads
 *    today's meal plan and training schedule: those cards arrive pre-filled.
 * 2. Then it asks only what needs a person: mood, and whether meals and
 *    training went as planned ("yes" is enough).
 * Every card stays editable; nothing is saved until "Confirm & save".
 */
export default function OrbiFill() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  const [queue] = useState<FillCategory[]>(() => openCategories());
  // every open log is one step: device readings are confirmed one by one, the rest are questions
  const [ask] = useState<FillCategory[]>(() => ASK_ORDER.filter((c) => queue.includes(c)));
  const [meals, setMeals] = useState<MealChoice[]>(() => (queue.includes('meal') ? openMealChoices() : []));
  const [sessions, setSessions] = useState<SessionChoice[]>(() => (queue.includes('exercise') ? openSessionChoices() : []));
  const [ready, setReady] = useState(false);
  const [skipped, setSkipped] = useState<FillCategory[]>([]);
  const [sliderOpen, setSliderOpen] = useState(false);
  // what you just said / typed while Orbi "checks" it (short loader before the reply)
  const [pending, setPending] = useState<string | null>(null);
  const skip = (c: FillCategory) => setSkipped((cur) => (cur.includes(c) ? cur : [...cur, c]));
  const [step, setStep] = useState(0);
  const [retried, setRetried] = useState(false);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [assumed, setAssumed] = useState<Partial<Record<FillCategory, string[]>>>({});
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hearing, setHearing] = useState<boolean | null>(null);
  const [voiceLoading, setVoiceLoading] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voice] = useState(() => speechAvailable());
  const stopRef = useRef<() => void>(() => {});
  const [voiceMode, setVoiceMode] = useState(false);
  const [sound, setSound] = useState(() => ttsAvailable());
  const soundRef = useRef(sound);
  const voiceModeRef = useRef(false);
  useEffect(() => {
    soundRef.current = sound;
    voiceModeRef.current = voiceMode;
    if (!sound || voiceMode) stopSpeaking();
  }, [sound, voiceMode]);
  /** Orbi's lines are short and read aloud too (refs: also called from the sync timers). */
  function sayAloud(t: string) {
    if (!soundRef.current || voiceModeRef.current || !t.trim()) return;
    stopSpeaking();
    speak(t, { onDone: () => {} });
  }
  // download the on-device voice model as soon as the page opens; voice unlocks when ready
  const gate = useVoiceGate(queue.length > 0);
  const name = firstName(getAstronaut());
  const current = ready ? (ask[step] as FillCategory | undefined) : undefined;
  const qText = (q: FillCategory, d: Drafts = drafts) => (AUTO_FILLED.includes(q) ? confirmQuestion(q, d) : FILL_QUESTION[q].q);
  const qHint = (q: FillCategory) => CONFIRM_HINT[q] ?? FILL_QUESTION[q].hint;
  const done = ready && step >= ask.length;

  const [items, setItems] = useState<Item[]>(() => {
    if (!queue.length) return [{ id: nid(), kind: 'orbi', text: `Everything is already logged today, ${name}. Nice work!` }];
    return [{ id: nid(), kind: 'orbi', text: `Hi ${name}! Reading your devices…` }];
  });

  useEffect(
    () => () => {
      stopRef.current();
      stopSpeaking();
    },
    [],
  );

  // 1) Simulated device sync + plan: cards appear one by one, then the questions start.
  useEffect(() => {
    if (!queue.length) return;
    sayAloud(`Hi ${name}! Reading your devices.`);
    const dev = readDevices();
    const auto = queue.filter((c) => AUTO_FILLED.includes(c));
    const plan = queue.filter((c) => c === 'meal' || c === 'exercise');
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, f: () => void) => timers.push(setTimeout(f, ms));
    [...auto, ...plan].forEach((c, i) =>
      later(600 * (i + 1), () => {
        if (c === 'sleep' || c === 'radiation' || c === 'body') {
          setDrafts((d) => ({ ...d, [c]: dev[c] }));
          setAssumed((a) => ({ ...a, [c]: c === 'sleep' ? ['how rested you feel'] : [] }));
        }
      }),
    );
    later(600 * (auto.length + plan.length + 1), () => {
      // nothing is "done" yet: say what was read and that we'll check it together
      const intro = auto.length
        ? `Got ${auto.length} reading${auto.length === 1 ? '' : 's'}${plan.length ? ' and today’s plan' : ''}. Let’s check each one.`
        : `${ask.length} quick question${ask.length === 1 ? '' : 's'}.`;
      const devDrafts: Drafts = Object.fromEntries(auto.map((c) => [c, dev[c as 'sleep' | 'radiation' | 'body']]));
      const q0 = ask.length ? (AUTO_FILLED.includes(ask[0]) ? confirmQuestion(ask[0], devDrafts) : FILL_QUESTION[ask[0]].q) : '';
      setItems((cur) => [...cur, { id: nid(), kind: 'orbi', text: intro }, ...(ask.length ? [...cardFor(ask[0]), { id: nid(), kind: 'orbi' as const, text: q0 }] : [])]);
      sayAloud(`${intro} ${q0}`);
      setReady(true);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    });
    return () => timers.forEach(clearTimeout);
    // runs once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** One card at a time: the pre-filled card of a step appears together with its question. */
  function cardFor(c: FillCategory): Item[] {
    return AUTO_FILLED.includes(c) || c === 'meal' || c === 'exercise' ? [{ id: nid(), kind: 'card', category: c, source: SOURCE_LABEL[c] }] : [];
  }

  const push = (...more: Item[]) => {
    setItems((cur) => [...cur, ...more]);
    sayAloud(more.map((m) => (m.kind === 'orbi' ? m.text : '')).join(' '));
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  };

  /** Moves to the next category; returns what Orbi says (also spoken in voice mode). */
  const next = (afterText?: string): VoiceReply => {
    const n = step + 1;
    setStep(n);
    setRetried(false);
    const msgs: Item[] = [];
    if (afterText) msgs.push({ id: nid(), kind: 'orbi', text: afterText });
    const end = n >= ask.length;
    if (!end) msgs.push(...cardFor(ask[n]), { id: nid(), kind: 'orbi', text: qText(ask[n]) });
    else msgs.push({ id: nid(), kind: 'orbi', text: 'All set. Check and confirm below.' });
    push(...msgs);
    return { say: msgs.map((m) => (m.kind === 'card' ? '' : m.text)).join(' '), end };
  };

  const answer = (raw: string): VoiceReply => {
    // show (and parse) numbers as digits: "a hundred and eighteen" → "118"
    const body = spokenToDigits(raw.trim());
    if (!current) return { say: 'We are done. Check the cards, then confirm.', end: true };
    if (!body) return { say: qText(current) };
    setText('');
    push({ id: nid(), kind: 'me', text: body });
    // device readings, one at a time: "OK" confirms it; otherwise the answer is the corrected value
    if (current === 'sleep' || current === 'radiation' || current === 'body') {
      const c = current;
      if (/^\s*skip\b/i.test(body)) {
        remove(c);
        skip(c);
        return next('Skipped.');
      }
      if (OK.test(body)) return next('Got it.');
      const r = orbiParser.parse(c, body, parseContext());
      if (r.understood) {
        const merged = { ...drafts[c], ...r.draft } as Drafts[typeof c];
        setDrafts((d) => ({ ...d, [c]: merged }));
        const msg = `Updated. ${confirmQuestion(c, { ...drafts, [c]: merged }, true)}`;
        push({ id: nid(), kind: 'orbi', text: msg });
        return { say: msg };
      }
      const again = 'Sorry, didn’t catch that. Say OK, or the right value.';
      push({ id: nid(), kind: 'orbi', text: again });
      return { say: again };
    }
    // meals / training: the plan is already on the card, the answer only says what changed
    if (current === 'meal' || current === 'exercise') {
      if (/^\s*skip\b/i.test(body)) {
        if (current === 'meal') setMeals([]);
        else setSessions([]);
        setItems((cur) => cur.filter((i) => !(i.kind === 'card' && i.category === current)));
        skip(current);
        return next('Skipped.');
      }
      const r = current === 'meal' ? applyMealAnswer(body, meals) : applySessionAnswer(body, sessions);
      // "change the taste" without saying which meal / how many stars: ask just that
      if (current === 'meal' && !r.understood && /\b(taste|stars?|rating|rate)\b/i.test(body)) {
        const which = 'Which meal, and how many stars? Like “lunch 3 stars”.';
        push({ id: nid(), kind: 'orbi', text: which });
        return { say: which };
      }
      if (!r.understood && !retried) {
        setRetried(true);
        const again = 'Sorry, didn’t catch that. Say OK, or what changed.';
        push({ id: nid(), kind: 'orbi', text: again });
        return { say: again };
      }
      if (current === 'meal') {
        const after = r.choices as MealChoice[];
        setMeals(after);
        // read back only the tastes that changed: "Lunch: 3 stars."
        const changed = after.filter((m, i) => m.taste !== meals[i]?.taste).map((m) => `${SLOT_LABEL[m.meal.slot]}: ${m.taste} star${m.taste === 1 ? '' : 's'}.`);
        return next(changed.length ? `Got it. ${changed.join(' ')}` : 'Got it.');
      }
      setSessions(r.choices as SessionChoice[]);
      return next('Got it.');
    }
    const r = orbiParser.parse(current, body, parseContext());
    if (sliderOpen && OK.test(body)) {
      setSliderOpen(false);
      return next('Got it.');
    }
    if (r.skipped) skip(current);
    if (r.skipped) return next('Skipped, that’s fine.');
    if (!r.understood && !retried) {
      setRetried(true);
      const again = 'Sorry, didn’t catch that. Try again, or skip.';
      push({ id: nid(), kind: 'orbi', text: again });
      return { say: again };
    }
    setDrafts((d) => ({ ...d, [current]: r.draft }));
    setAssumed((a) => ({ ...a, [current]: r.assumed }));
    push({ id: nid(), kind: 'card', category: current });
    return next('Got it.');
  };

  /** Manual option for mood: a draft card with the vertical slider open. */
  const useSlider = () => {
    if (current !== 'mood') return;
    setDrafts((d) => ({ ...d, mood: { level: 3, tags: [] } }));
    setAssumed((a) => ({ ...a, mood: [] }));
    push({ id: nid(), kind: 'card', category: 'mood', slider: true }, { id: nid(), kind: 'orbi', text: 'Move the slider, then tap Done.' });
    setSliderOpen(true);
  };
  const sliderDone = () => {
    setSliderOpen(false);
    push({ id: nid(), kind: 'me', text: 'Done' });
    next('Got it.');
  };

  /** Sends an answer with a short visible "checking" step first. */
  const submit = (raw: string) => {
    const body = spokenToDigits(raw.trim());
    if (!body || pending !== null) return;
    setText('');
    setPending(body);
    setTimeout(() => {
      setPending(null);
      answer(raw);
    }, 700);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  };

  const toggleMic = async () => {
    setVoiceError(null);
    stopSpeaking(); // never listen while Orbi talks
    if (listening) {
      stopRef.current();
      setTranscribing(true); // until the recognizer hands back the text
      return;
    }
    setListening(true);
    setHearing(null);
    stopRef.current = await startListening({
      onPartial: (t) => setText(t),
      onSpeech: (s) => setHearing(s),
      onStatus: (s, p) => {
        if (s === 'loading') setVoiceLoading(p ?? 0);
        else {
          setVoiceLoading(null);
          if (s === 'transcribing') setTranscribing(true);
        }
      },
      onFinal: (t) => {
        setTranscribing(false);
        submit(t);
      },
      onEnd: () => {
        setListening(false);
        setTranscribing(false);
        setVoiceLoading(null);
      },
      onError: (m) => {
        setVoiceError(m);
        setListening(false);
        setTranscribing(false);
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

  const mealsOk = meals.filter((c) => c.status && (c.status !== 'swapped' || c.swapTo)).length;
  const sessionsOk = sessions.filter((c) => c.status === 'done' || c.status === 'changed').length;
  const count = Object.keys(drafts).length + (mealsOk ? 1 : 0) + (sessionsOk ? 1 : 0);
  const coins = Object.keys(drafts).length * 10 + mealsOk * 10 + sessionsOk * 10;
  const confirm = () => {
    saveDrafts(drafts, { meals, sessions });
    router.navigate('/home');
  };
  // the 6 logs in the order the check-in fills them (devices first, then the questions)
  const ORDER: { c: FillCategory; label: string; icon: StepItem['icon'] }[] = [
    { c: 'sleep', label: 'Sleep', icon: 'moon' },
    { c: 'radiation', label: 'Dose', icon: 'radiation' },
    { c: 'body', label: 'BP', icon: 'heart' },
    { c: 'mood', label: 'Mood', icon: 'smile' },
    { c: 'meal', label: 'Meals', icon: 'utensils' },
    { c: 'exercise', label: 'Training', icon: 'activity' },
  ];
  const valueOf = (c: FillCategory): string | undefined => {
    const d = drafts[c];
    if (c === 'meal') return mealsOk ? `${mealsOk} meal${mealsOk === 1 ? '' : 's'}` : undefined;
    if (c === 'exercise') {
      const min = sessions.reduce((t, x) => t + (x.status === 'done' ? x.session.minutes : x.status === 'changed' ? x.minutes : 0), 0);
      return sessionsOk ? `${min} min` : undefined;
    }
    if (!d) return undefined;
    if (c === 'sleep') return formatDuration(draftSleepMinutes(d as DraftMap['sleep']));
    if (c === 'radiation') return `${(d as DraftMap['radiation']).value} µSv`;
    if (c === 'body') return `${(d as DraftMap['body']).systolic}/${(d as DraftMap['body']).diastolic}`;
    if (c === 'mood') return MOOD_TITLE[(d as DraftMap['mood']).level];
    return undefined;
  };
  const MEAL_STATUS_TEXT = { followed: 'as planned', partial: 'ate part', swapped: 'swapped', skipped: 'skipped' } as const;
  const summaryOf = (c: FillCategory | undefined): { title: string; lines: string[] } | undefined => {
    if (!c) return undefined;
    const d = drafts;
    if (c === 'sleep' && d.sleep)
      return { title: 'Sleep · wrist band (demo)', lines: [`${formatDuration(draftSleepMinutes(d.sleep))} · bed ${d.sleep.bed} → up ${d.sleep.wake}`, `Wake-ups: ${d.sleep.wakeUps === 'none' ? 'none' : d.sleep.wakeUps}`] };
    if (c === 'radiation' && d.radiation)
      return { title: 'Dose · personal badge (demo)', lines: [`${d.radiation.value} ${d.radiation.unit === 'uSv' ? 'µSv' : 'mSv'} · read at ${d.radiation.readAt}`] };
    if (c === 'body' && d.body) return { title: 'Blood pressure · cuff (demo)', lines: [`${d.body.systolic}/${d.body.diastolic} mmHg · pulse ${d.body.pulse}`] };
    if (c === 'mood') return { title: 'Mood', lines: [d.mood ? `${MOOD_TITLE[d.mood.level]}${d.mood.tags.length ? ` · ${d.mood.tags.join(', ')}` : ''}` : 'Say: great · good · okay · tired · stressed'] };
    if (c === 'meal')
      return {
        title: 'Meal plan (medical team)',
        lines: meals.length
          ? meals.map((m) => `${m.meal.time} ${m.meal.name} · ${m.status ? (m.status === 'partial' ? `ate ${m.eatenPct}%` : m.status === 'swapped' && m.swapTo ? `swapped → ${m.swapTo}` : MEAL_STATUS_TEXT[m.status]) : 'later'}${m.status !== 'skipped' ? ` · ${'★'.repeat(m.taste)}${'☆'.repeat(5 - m.taste)}` : ''}`)
          : ['No planned meals left'],
      };
    if (c === 'exercise')
      return {
        title: 'Training schedule',
        lines: sessions.length
          ? sessions.map((x) => `${x.session.time} ${x.session.label} · ${x.status === 'changed' ? x.minutes : x.session.minutes} min · ${x.status ?? 'later today'}`)
          : ['No sessions left today'],
      };
    return undefined;
  };

  const steps: StepItem[] = ORDER.map(({ c, label, icon }) => {
    if (!queue.includes(c)) return { key: c, label, icon, state: 'done', value: 'logged' };
    if (skipped.includes(c)) return { key: c, label, icon, state: 'skipped' };
    // read / planned values only get a ✓ once you answered that step
    const answered = ready && ask.indexOf(c) < step;
    const value = valueOf(c);
    if (value && answered) return { key: c, label, icon, state: 'done', value };
    const pending = AUTO_FILLED.includes(c) ? (value ? `${value}?` : undefined) : value ? 'planned' : undefined;
    if (c === current) return { key: c, label, icon, state: 'now', value: pending ?? 'your turn' };
    if (!ready && !value && (AUTO_FILLED.includes(c) || c === 'meal' || c === 'exercise')) return { key: c, label, icon, state: 'reading' };
    return { key: c, label, icon, state: 'todo', value: pending };
  });

  const removePlan = (c: 'meal' | 'exercise') => {
    if (c === 'meal') setMeals([]);
    else setSessions([]);
    setItems((cur) => cur.filter((i) => !(i.kind === 'card' && i.category === c)));
    skip(c);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
        <OrbiDrone size={36} float={false} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt heading weight="700" size={tokens.font.size.screenTitle} accessibilityRole="header">
            Daily check-in
          </Txt>
          <Txt size={tokens.font.size.caption} color={C.teal}>
            {queue.length
              ? ready
                ? `Step ${Math.min(step + 1, ask.length)} of ${ask.length} · saved only when you confirm`
                : 'Under 2 min · reading your devices…'
              : 'All logs done today'}
          </Txt>
        </View>
        {ttsAvailable() ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Read Orbi aloud"
            accessibilityState={{ checked: sound }}
            onPress={() => setSound(!sound)}
            hitSlop={6}
            style={[styles.soundBtn, !sound && { opacity: 0.45 }]}>
            <Icon name="volume" size={18} color={sound ? C.teal : C.muted} />
          </Pressable>
        ) : null}
      </View>
      {!done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={gate.ready && ready ? 'Voice mode: answer hands-free' : 'Voice mode: preparing'}
          accessibilityState={{ disabled: !gate.ready || !ready }}
          disabled={!gate.ready || !ready}
          onPress={() => setVoiceMode(true)}
          style={[styles.voiceBtn, (!gate.ready || !ready) && { opacity: 0.35 }]}>
          <Icon name="wave" size={18} color={C.teal} />
          <Txt weight="600" size={tokens.font.size.small} color={C.teal}>
            Answer everything by voice · hands-free
          </Txt>
        </Pressable>
      ) : null}
      {!done && voice ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 6, gap: 6 }}>
          <VoicePrep gate={gate} />
          <PrototypeTag />
        </View>
      ) : null}
      {queue.length ? (
        <View style={styles.steps}>
          <View style={styles.how}>
            <Icon name="clock" size={14} color={C.teal} />
            <Txt size={tokens.font.size.caption} lh={1.4} style={{ flex: 1 }}>
              <Txt weight="700" size={tokens.font.size.caption}>
                Under 2 minutes.{' '}
              </Txt>
              Orbi reads your devices; say “OK” or correct each item.
            </Txt>
          </View>
          <CheckinSteps items={steps} />
        </View>
      ) : null}

      {!queue.length ? (
        <AllCaughtUp name={name} bottom={insets.bottom} />
      ) : (
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.chat} keyboardShouldPersistTaps="handled">
        {items.map((it) =>
          it.kind === 'card' && (it.category === 'meal' || it.category === 'exercise') && !drafts[it.category] ? (
            <DraftCard
              key={it.id}
              category={it.category}
              draft={{} as never}
              assumed={[]}
              source={it.source}
              onChange={() => {}}
              onRemove={() => removePlan(it.category as 'meal' | 'exercise')}>
              {it.category === 'meal' ? <MealChoices choices={meals} onChange={setMeals} /> : <SessionChoices choices={sessions} onChange={setSessions} />}
            </DraftCard>
          ) : it.kind === 'card' ? (
            drafts[it.category] ? (
              <DraftCard
                key={it.id}
                category={it.category}
                draft={drafts[it.category] as DraftMap[typeof it.category]}
                assumed={assumed[it.category] ?? []}
                onChange={(d) => setDrafts((cur) => ({ ...cur, [it.category]: d }))}
                onRemove={() => remove(it.category)}
                initialSlider={it.slider}
                source={it.source}
              />
            ) : null
          ) : (
            <ChatBubble key={it.id} author={it.kind === 'me' ? 'me' : 'other'} text={it.text} />
          ),
        )}
        {pending !== null ? (
          <>
            <ChatBubble author="me" text={pending} />
            <View style={styles.row} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={C.teal} />
              <Txt size={tokens.font.size.caption} color={C.teal}>
                Orbi is checking…
              </Txt>
            </View>
          </>
        ) : null}
        {!ready ? (
          <View style={styles.row}>
            <ActivityIndicator size="small" color={C.teal} />
            <Txt size={tokens.font.size.caption} color={C.teal}>
              Syncing wrist band, dosimeter and plan (simulated)…
            </Txt>
          </View>
        ) : pending === null && !done && current ? (
          <Txt size={tokens.font.size.caption} color={C.muted}>
            {qHint(current)}
          </Txt>
        ) : null}
      </ScrollView>
      )}

      {!queue.length ? null : done ? (
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {count ? (
            <PrimaryButton label={`Confirm & save ${count} log${count === 1 ? '' : 's'}`} reward={coins} onPress={confirm} />
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
          ) : voiceLoading !== null ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={C.teal} />
              <Txt size={tokens.font.size.caption} color={C.teal} accessibilityLiveRegion="polite">
                Getting voice ready (one time only)… {Math.round(voiceLoading * 100)}%
              </Txt>
            </View>
          ) : transcribing ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={C.teal} />
              <Txt size={tokens.font.size.caption} color={C.teal} accessibilityLiveRegion="polite">
                Got it! Writing down what you said…
              </Txt>
            </View>
          ) : listening ? (
            <Txt size={tokens.font.size.caption} color={C.teal} accessibilityLiveRegion="polite">
              {hearing === null ? 'Listening… speak your answer, tap the mic when you finish.' : hearing ? 'Listening… hearing you' : 'Listening… finishing (or tap the mic)'}
            </Txt>
          ) : null}
          <View style={[styles.row, styles.wrap]}>
            {current && AUTO_FILLED.includes(current) ? <Chip label="OK, that's right" onPress={() => answer('ok')} /> : null}
            {current === 'meal' || current === 'exercise' ? <Chip label="OK, as planned" onPress={() => answer('ok')} /> : null}
            {current === 'mood' && !sliderOpen ? MOOD_CHOICES.map((m) => <Chip key={m} label={m} onPress={() => submit(m.toLowerCase())} />) : null}
            <Chip label="Skip" onPress={() => answer('skip')} disabled={!ready} />
            {current === 'mood' && sliderOpen ? <Chip label="Done" onPress={sliderDone} /> : null}
            {current === 'mood' && !sliderOpen ? <Chip label="Use the slider" onPress={useSlider} /> : null}
          </View>
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={transcribing ? 'Writing down what you said…' : voiceLoading !== null ? 'Getting voice ready…' : listening ? 'Listening…' : 'Type your answer…'}
              placeholderTextColor={C.muted}
              accessibilityLabel="Your answer"
              onSubmitEditing={() => submit(text)}
              returnKeyType="send"
              style={styles.input}
            />
            {voice ? <MicButton listening={listening && !transcribing && voiceLoading === null} busy={transcribing || voiceLoading !== null || !gate.ready} onPress={toggleMic} /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Send answer" onPress={() => submit(text)} style={[styles.round, styles.send]}>
              <Icon name="send" size={20} color={C.bg} />
            </Pressable>
          </View>
        </View>
      )}
      <VoiceMode
        visible={voiceMode}
        onClose={() => setVoiceMode(false)}
        title="Daily check-in"
        intro={current ? qText(current) : undefined}
        hint={current ? qHint(current) : undefined}
        normalize={spokenToDigits}
        respond={answer}
        steps={steps}
        summary={summaryOf(current)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  steps: { gap: 10, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  how: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  allDone: { alignItems: 'center', gap: 12, paddingVertical: 28, paddingHorizontal: 20 },
  doneBadge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: X.holoOkSoft, borderWidth: 2, borderColor: C.holoOk, marginBottom: 6 },
  doneList: { alignSelf: 'stretch', marginTop: 8, paddingHorizontal: 14, borderRadius: tokens.radius.card, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  doneSep: { borderTopWidth: 1, borderTopColor: C.border },
  wrap: { flexWrap: 'wrap' },
  soundBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: tokens.size.touch,
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: tokens.radius.item,
    backgroundColor: X.tealSoft,
    borderWidth: 1,
    borderColor: C.teal,
  },
});
