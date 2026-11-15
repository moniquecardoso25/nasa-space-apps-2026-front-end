import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cancelAnimation, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { session } from '@/data/session';
import { fontFamily } from '@/theme/fonts';
import { C, tokens } from '@/theme/tokens';
import { startListening, voiceEngine, type StopFn } from '@/voice/speech';
import { speak, stopSpeaking } from '@/voice/tts';

import { OrbiDrone } from './Astronaut';
import { AudioBars } from './AudioBars';
import { Icon } from './Icon';
import { Chip } from './Inputs';
import { LOGIN_STARS, Stars } from './Space';
import { Txt } from './Txt';

export type VoiceReply = { say: string; end?: boolean };
type Phase = 'idle' | 'listening' | 'thinking' | 'loading' | 'speaking';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Tap the mic to talk',
  listening: 'Listening…',
  thinking: 'Thinking…',
  loading: 'Getting voice ready…',
  speaking: 'Orbi is speaking · tap the mic to interrupt',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Spoken first (e.g. greeting or the current question). */
  intro?: string;
  /** Turns what the astronaut said into Orbi's spoken answer. `end` closes the loop after speaking. */
  respond: (text: string) => VoiceReply | Promise<VoiceReply>;
};

/**
 * Hands-free conversation with Orbi: Orbi speaks → listens → answers → listens…
 * An audio bar shows the mic level while listening and moves while Orbi talks.
 * Text input stays available (no mic, unsupported browser, noisy room).
 */
export function VoiceMode(props: Props) {
  return (
    <Modal visible={props.visible} animationType="fade" transparent={false} onRequestClose={props.onClose} statusBarTranslucent>
      {props.visible ? <VoiceSession {...props} /> : null}
    </Modal>
  );
}

function VoiceSession({ onClose, title, intro, respond }: Props) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState('');
  const [said, setSaid] = useState(intro ?? '');
  const [note, setNote] = useState<string | null>(null);
  const [lang, setLang] = useState(session.voiceLang);
  const [typed, setTyped] = useState('');
  const engine = voiceEngine();
  const level = useSharedValue(0.06);

  const alive = useRef(true);
  const stopRef = useRef<StopFn | null>(null);
  const cancelSpeak = useRef<() => void>(() => {});
  const speakTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const empties = useRef(0);
  const respondRef = useRef(respond);
  const langRef = useRef(lang);
  useEffect(() => {
    respondRef.current = respond;
    langRef.current = lang;
  });

  // audio bar behaviour per phase (listening is driven by the mic level)
  useEffect(() => {
    if (speakTimer.current) clearInterval(speakTimer.current);
    speakTimer.current = null;
    cancelAnimation(level);
    if (phase === 'speaking') {
      speakTimer.current = setInterval(() => level.set(withTiming(0.35 + Math.random() * 0.6, { duration: 110 })), 120);
    } else if (phase === 'thinking' || phase === 'loading') {
      level.set(withRepeat(withSequence(withTiming(0.32, { duration: 600 }), withTiming(0.1, { duration: 600 })), -1));
    } else if (phase === 'idle') level.set(withTiming(0.06, { duration: 200 }));
    return () => {
      if (speakTimer.current) clearInterval(speakTimer.current);
    };
  }, [phase, level]);

  const stopAll = () => {
    stopRef.current?.abort();
    stopRef.current = null;
    cancelSpeak.current();
    stopSpeaking();
  };

  const say = (text: string, then: () => void) => {
    if (!alive.current) return;
    setPhase('speaking');
    setSaid(text);
    cancelSpeak.current = speak(text, {
      lang: 'en-US',
      onDone: () => {
        if (alive.current) then();
      },
    });
  };

  const handle = async (text: string) => {
    setHeard(text);
    setPhase('thinking');
    const r = await respondRef.current(text);
    if (!alive.current) return;
    say(r.say, () => {
      if (!r.end) listen();
      else {
        setPhase('idle');
        setTimeout(() => alive.current && onClose(), 900);
      }
    });
  };

  const listen = async () => {
    if (!alive.current) return;
    if (engine === 'none') {
      setPhase('idle');
      setNote('Voice input is not supported here. Type below and Orbi will still answer out loud.');
      return;
    }
    setNote(null);
    setPhase('listening');
    setHeard('');
    let got = false;
    stopRef.current = await startListening(
      {
        onPartial: (t) => setHeard(t),
        onLevel: (v) => level.set(withTiming(Math.max(0.06, v), { duration: 90 })),
        onStatus: (s, p) => {
          if (s === 'transcribing') {
            setPhase('thinking');
            setNote(null);
          } else if (s === 'loading') {
            setPhase('loading');
            setNote(`Downloading the on-device voice model (one time only)… ${Math.round((p ?? 0) * 100)}%`);
          }
        },
        onFinal: (t) => {
          got = true;
          empties.current = 0;
          handle(t);
        },
        onError: (m) => {
          got = true;
          setNote(`${m} You can type instead.`);
          setPhase('idle');
        },
        onEnd: () => {
          stopRef.current = null;
          if (got || !alive.current) return;
          empties.current += 1;
          if (empties.current >= 2) {
            setPhase('idle');
            setNote('I didn’t hear anything. Tap the mic when you’re ready.');
          } else listen();
        },
      },
      { lang: langRef.current },
    );
  };

  useEffect(() => {
    alive.current = true;
    if (intro) say(intro, listen);
    else listen();
    return () => {
      alive.current = false;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMic = () => {
    empties.current = 0;
    if (phase === 'listening') {
      stopRef.current?.(); // done talking → transcribe now
      return;
    }
    if (phase === 'speaking') {
      cancelSpeak.current();
      stopSpeaking();
    }
    if (phase === 'thinking' || phase === 'loading') return;
    listen();
  };

  const sendTyped = () => {
    const t = typed.trim();
    if (!t || phase === 'thinking') return;
    setTyped('');
    stopRef.current?.abort();
    stopRef.current = null;
    cancelSpeak.current();
    handle(t);
  };

  const pickLang = (l: typeof lang) => {
    setLang(l);
    session.voiceLang = l;
  };

  const barColor = phase === 'speaking' ? C.primary : phase === 'listening' ? C.teal : C.muted;
  const micOn = phase === 'listening';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <Stars stars={LOGIN_STARS} />
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt heading weight="700" size={tokens.font.size.screenTitle} accessibilityRole="header">
            {title}
          </Txt>
          <Txt size={tokens.font.size.caption} color={C.teal}>
            Voice mode · I speak = {lang === 'en-US' ? 'English' : 'Português'}
          </Txt>
        </View>
        <Chip label="EN" selected={lang === 'en-US'} onPress={() => pickLang('en-US')} />
        <Chip label="PT" selected={lang === 'pt-BR'} onPress={() => pickLang('pt-BR')} />
        <Pressable accessibilityRole="button" accessibilityLabel="End voice mode" onPress={onClose} style={styles.close}>
          <Icon name="close" size={20} />
        </Pressable>
      </View>

      <View style={styles.center}>
        <OrbiDrone size={110} />
        <View style={{ marginTop: 26 }}>
          <AudioBars level={level} color={barColor} bars={26} height={64} barWidth={6} />
        </View>
        <Txt weight="600" size={tokens.font.size.small} color={barColor} accessibilityLiveRegion="polite" style={{ marginTop: 14 }}>
          {PHASE_LABEL[phase]}
        </Txt>
      </View>

      <View style={styles.transcript}>
        {heard ? (
          <Txt size={tokens.font.size.small} color={C.muted} align="center" numberOfLines={3}>
            “{heard}”
          </Txt>
        ) : null}
        {said ? (
          <Txt weight="600" size={tokens.font.size.body} align="center" lh={1.45} numberOfLines={6} accessibilityLiveRegion="polite">
            {said}
          </Txt>
        ) : null}
        {note ? (
          <Txt size={tokens.font.size.caption} color={C.warning} align="center">
            {note}
          </Txt>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <View style={styles.typeRow}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder="Or type here…"
            placeholderTextColor={C.muted}
            accessibilityLabel="Type to Orbi"
            onSubmitEditing={sendTyped}
            returnKeyType="send"
            style={styles.input}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={sendTyped} style={[styles.small, { backgroundColor: C.primary }]}>
            <Icon name="send" size={18} color={C.bg} />
          </Pressable>
        </View>
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={micOn ? 'Done talking' : 'Talk'}
            accessibilityState={{ selected: micOn, disabled: engine === 'none' }}
            disabled={engine === 'none'}
            onPress={onMic}
            style={[styles.mic, micOn && styles.micOn, engine === 'none' && { opacity: 0.35 }]}>
            <Icon name={micOn ? 'stop' : 'mic'} size={28} color={micOn ? C.bg : C.teal} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="End" onPress={onClose} style={styles.end}>
            <Icon name="close" size={24} color={C.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  transcript: { gap: 10, minHeight: 120, justifyContent: 'flex-end', paddingHorizontal: 8, marginBottom: 16 },
  bottom: { gap: 14 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: tokens.ext.radius.panel,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: tokens.font.size.body,
    fontFamily: fontFamily('body', '400'),
  },
  small: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28 },
  mic: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft, borderWidth: 2, borderColor: C.teal },
  micOn: { backgroundColor: C.teal },
  end: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
});
