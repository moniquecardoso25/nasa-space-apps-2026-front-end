/**
 * Thin wrapper around expo-speech-recognition with a safe fallback.
 * - Native (dev build): uses the native module.
 * - Web: uses the Web Speech API when the browser has it.
 * - Expo Go / unsupported browser: `speechAvailable()` is false → text only.
 */
type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let mod: SpeechModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule as SpeechModule;
} catch {
  mod = null; // native module missing (e.g. Expo Go)
}

export function speechAvailable(): boolean {
  try {
    if (!mod) return false;
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const w = window as unknown as Record<string, unknown>;
      if (!w.SpeechRecognition && !w.webkitSpeechRecognition) return false;
    }
    return mod.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export type ListenHandlers = {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

/** Starts one listening session. Returns a stop function. */
export async function startListening(h: ListenHandlers, lang = 'en-US'): Promise<() => void> {
  if (!mod) {
    h.onError?.('Voice input is not available here.');
    return () => {};
  }
  const perm = await mod.requestPermissionsAsync();
  if (!perm.granted) {
    h.onError?.('Microphone permission was denied.');
    return () => {};
  }
  let finalText = '';
  const subs = [
    mod.addListener('result', (e: { isFinal: boolean; results: { transcript: string }[] }) => {
      const text = e.results?.[0]?.transcript ?? '';
      if (e.isFinal) finalText = text;
      else h.onPartial?.(text);
    }),
    mod.addListener('error', (e: { error: string; message?: string }) => {
      if (e.error !== 'aborted') h.onError?.(e.message || e.error);
    }),
    mod.addListener('end', () => {
      subs.forEach((s) => s.remove());
      if (finalText) h.onFinal(finalText);
      h.onEnd?.();
    }),
  ];
  mod.start({ lang, interimResults: true, continuous: false, addsPunctuation: true });
  return () => mod?.stop();
}
