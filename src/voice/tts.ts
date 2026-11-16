import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Orbi's voice (text-to-speech) via expo-speech.
 * - Phone: the system TTS voice.
 * - Web: the browser's speechSynthesis (Chrome, Edge, Safari and Firefox all have it;
 *   the voices come from the OS). We pick the most natural voice available.
 * Every call has a safety timer so a browser that never fires `onend`
 * (no voices, headless, blocked audio) can't freeze a conversation.
 */

const voiceCache: Record<string, string | undefined> = {};

async function pickVoice(lang: string): Promise<string | undefined> {
  if (lang in voiceCache) return voiceCache[lang];
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices.length) return undefined; // web voices load lazily; try again next time
    const base = lang.slice(0, 2).toLowerCase();
    const norm = (l?: string) => (l ?? '').toLowerCase().replace('_', '-');
    const rank = (v: Speech.Voice) =>
      (/natural|neural|online|enhanced|premium/i.test(v.name) ? 4 : 0) +
      (/google/i.test(v.name) ? 2 : 0) +
      (norm(v.language) === lang.toLowerCase() ? 1 : 0);
    const list = voices.filter((v) => norm(v.language).startsWith(base)).sort((a, b) => rank(b) - rank(a));
    voiceCache[lang] = list[0]?.identifier;
  } catch {
    voiceCache[lang] = undefined;
  }
  return voiceCache[lang];
}

export function ttsAvailable(): boolean {
  if (Platform.OS !== 'web') return true;
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Strip things that sound bad when read aloud (emoji, symbols, curly quotes). */
function forSpeech(text: string) {
  return text
    // read units and numbers the way people say them
    .replace(/(\d+)h (\d+)m\b/g, (_, h, m) => `${h} hours ${Number(m)} minutes`)
    .replace(/(\d+)h\b/g, '$1 hours')
    .replace(/µSv\/h/g, 'microsieverts per hour')
    .replace(/µSv/g, 'microsieverts')
    .replace(/\bmSv\b/g, 'millisieverts')
    .replace(/\bkcal\b/g, 'calories')
    .replace(/(\d{2,3})\/(\d{2,3})/g, '$1 over $2')
    .replace(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g, '$1 to $2')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}\p{P}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type SpeakHandlers = { lang?: string; onStart?: () => void; onDone: () => void };

/** Speaks `text`; calls onDone when finished (or after a safety timeout). Returns a cancel function. */
export function speak(text: string, h: SpeakHandlers): () => void {
  const lang = h.lang ?? 'en-US';
  const clean = forSpeech(text);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(safety);
    h.onDone();
  };
  const safety = setTimeout(finish, 2500 + clean.length * 90);
  if (!clean || !ttsAvailable()) {
    // nothing to say aloud: give the reader a moment, then continue
    clearTimeout(safety);
    const t = setTimeout(finish, Math.min(2500, 600 + clean.length * 25));
    return () => {
      finished = true;
      clearTimeout(t);
    };
  }
  pickVoice(lang).then((voice) => {
    if (finished) return;
    Speech.stop();
    Speech.speak(clean, { language: lang, voice, rate: 1, pitch: 1.05, onStart: h.onStart, onDone: finish, onStopped: finish, onError: finish });
  });
  return () => {
    finished = true;
    clearTimeout(safety);
    Speech.stop();
  };
}

export function stopSpeaking() {
  Speech.stop();
}
