import { Platform } from 'react-native';

import { micAvailable, openMic, type MicSession } from './mic';
import { transcribe, whisperSupported } from './whisper';

/**
 * Speech-to-text with the best engine available:
 * - `native`  phone dev build: system recognizer via expo-speech-recognition;
 * - `browser` Chrome / Edge / Safari: Web Speech API (via the same module);
 * - `whisper` Firefox, or when the browser engine fails (no network, blocked):
 *             record → voice-activity detection → on-device Whisper (whisper.web.ts);
 * - `none`    Expo Go / very old browsers → text only.
 */
type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let mod: SpeechModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule as SpeechModule;
} catch {
  mod = null; // native module missing (e.g. Expo Go)
}

/** Set when the browser engine reported a service/network error: use Whisper from then on. */
let browserBroken = false;

export type VoiceEngine = 'native' | 'browser' | 'whisper' | 'none';

function hasWebSpeech(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function voiceEngine(): VoiceEngine {
  try {
    if (Platform.OS === 'web') {
      if (hasWebSpeech() && mod && !browserBroken) return 'browser';
      return whisperSupported() ? 'whisper' : 'none';
    }
    return mod?.isRecognitionAvailable() ? 'native' : 'none';
  } catch {
    return 'none';
  }
}

export function speechAvailable(): boolean {
  return voiceEngine() !== 'none';
}

export type ListenStatus = 'listening' | 'loading' | 'transcribing';

export type ListenHandlers = {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  /** Always called once when the session is over (after onFinal, if any). */
  onEnd?: () => void;
  onError?: (message: string) => void;
  /** Input level 0…1, ~15 times a second (for the audio bars). */
  onLevel?: (level: number) => void;
  /** Whisper engine: loading the model (progress 0…1) / transcribing. */
  onStatus?: (status: ListenStatus, progress?: number) => void;
};

export type ListenOptions = { lang?: string; continuous?: boolean };

/** Stop = "I'm done talking" (transcribe what was said). abort = drop it. */
export type StopFn = (() => void) & { abort: () => void };

const noop: StopFn = Object.assign(() => {}, { abort: () => {} });

/** Starts one listening session. */
export async function startListening(h: ListenHandlers, opts: ListenOptions | string = {}): Promise<StopFn> {
  const o: ListenOptions = typeof opts === 'string' ? { lang: opts } : opts;
  const lang = o.lang ?? 'en-US';
  const engine = voiceEngine();
  if (engine === 'none') {
    h.onError?.('Voice input is not available here.');
    h.onEnd?.();
    return noop;
  }
  if (engine === 'whisper') return listenWhisper(h, lang, !!o.continuous);
  return listenRecognizer(h, lang, !!o.continuous, engine);
}

// ------------------------------------------------------------ system / browser recognizer

async function listenRecognizer(h: ListenHandlers, lang: string, continuous: boolean, engine: VoiceEngine): Promise<StopFn> {
  const m = mod!;
  const perm = await m.requestPermissionsAsync();
  if (!perm.granted) {
    h.onError?.('Microphone permission was denied.');
    h.onEnd?.();
    return noop;
  }
  let finalText = '';
  let lastPartial = '';
  let aborted = false;
  let fellBack = false;
  // Level meter: native → recognizer volume events; web → a parallel Web Audio meter.
  let meter: MicSession | null = null;
  let meterTimer: ReturnType<typeof setInterval> | null = null;
  if (h.onLevel && engine === 'browser' && micAvailable()) {
    openMic({ capture: false })
      .then((mic) => {
        if (aborted || ended) return void mic.stop();
        meter = mic;
        meterTimer = setInterval(() => h.onLevel?.(mic.level()), 66);
      })
      .catch(() => {});
  }
  let ended = false;
  const cleanupMeter = () => {
    if (meterTimer) clearInterval(meterTimer);
    meter?.stop();
    meter = null;
  };

  const subs = [
    m.addListener('result', (e: { isFinal: boolean; results: { transcript: string }[] }) => {
      const text = e.results?.[0]?.transcript ?? '';
      if (e.isFinal) {
        finalText = continuous ? `${finalText} ${text}`.trim() : text;
        if (continuous) h.onPartial?.(finalText);
      } else {
        lastPartial = continuous ? `${finalText} ${text}`.trim() : text;
        h.onPartial?.(lastPartial);
      }
    }),
    m.addListener('volumechange', (e: { value: number }) => h.onLevel?.(Math.max(0, Math.min(1, (e.value + 2) / 12)))),
    m.addListener('error', (e: { error: string; message?: string }) => {
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      if (engine === 'browser' && (e.error === 'network' || e.error === 'service-not-allowed' || e.error === 'language-not-supported')) {
        // The browser's cloud recognizer isn't usable here: switch to on-device Whisper for good.
        if (whisperSupported()) {
          browserBroken = true;
          fellBack = true;
          return;
        }
      }
      h.onError?.(e.message || e.error);
    }),
    m.addListener('end', () => {
      ended = true;
      subs.forEach((s) => s.remove());
      cleanupMeter();
      if (fellBack && !aborted) {
        // retry this same turn with Whisper
        listenWhisper(h, lang, continuous).then((stop) => (retryStop = stop));
        return;
      }
      // Some browsers end (e.g. on stop) without a final result: keep what was heard.
      const text = finalText || lastPartial;
      if (text && !aborted) h.onFinal(text);
      h.onEnd?.();
    }),
  ];
  let retryStop: StopFn | null = null;
  m.start({
    lang,
    interimResults: true,
    continuous,
    addsPunctuation: true,
    volumeChangeEventOptions: h.onLevel && engine === 'native' ? { enabled: true, intervalMillis: 80 } : undefined,
  });
  return Object.assign(() => (retryStop ? retryStop() : m.stop()), {
    abort: () => {
      aborted = true;
      if (retryStop) retryStop.abort();
      else m.abort();
    },
  });
}

// ------------------------------------------------------------ on-device Whisper (web)

async function listenWhisper(h: ListenHandlers, lang: string, continuous: boolean): Promise<StopFn> {
  let mic: MicSession;
  try {
    mic = await openMic({ capture: true });
  } catch (e) {
    h.onError?.((e as Error).message);
    h.onEnd?.();
    return noop;
  }
  h.onStatus?.('listening');
  const start = Date.now();
  const maxMs = continuous ? 60000 : 15000;
  const silenceMs = continuous ? 2500 : 1300;
  let floor = 0;
  let floorN = 0;
  let spokeMs = 0;
  let lastLoud = 0;
  let finished = false;

  const finalize = async (keep: boolean) => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    const pcm = await mic.stop().catch(() => null);
    h.onLevel?.(0);
    if (!keep || !pcm || spokeMs < 250) {
      h.onEnd?.();
      return;
    }
    try {
      h.onStatus?.('transcribing');
      const text = await transcribe(pcm, lang, (p) => h.onStatus?.('loading', p));
      h.onStatus?.('transcribing');
      if (text) h.onFinal(text);
    } catch {
      h.onError?.('Could not load the on-device voice model. Check your connection and try again, or type instead.');
    }
    h.onEnd?.();
  };

  // Voice-activity detection: calibrate the noise floor, then stop after a pause.
  const timer = setInterval(() => {
    const lvl = mic.level();
    h.onLevel?.(lvl);
    const t = Date.now() - start;
    if (t < 300) {
      floor = (floor * floorN + lvl) / ++floorN;
      return;
    }
    const threshold = Math.max(0.28, floor + 0.15);
    if (lvl > threshold) {
      spokeMs += 66;
      lastLoud = Date.now();
    }
    const spoke = spokeMs >= 250;
    if ((spoke && Date.now() - lastLoud > silenceMs) || t > maxMs || (!spoke && t > 8000)) finalize(true);
  }, 66);

  return Object.assign(() => void finalize(true), { abort: () => void finalize(false) });
}
