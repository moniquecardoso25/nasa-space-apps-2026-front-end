/**
 * On-device speech-to-text for browsers without the Web Speech API (Firefox)
 * or when it fails (e.g. no connection to the browser's speech service).
 *
 * Runs OpenAI Whisper (base, multilingual, 8-bit) in the browser with
 * transformers.js on WebAssembly. Nothing leaves the device. The library is
 * loaded on first use from jsDelivr and the model (~77 MB) from the Hugging Face
 * hub; the browser caches both, so later sessions start fast.
 * (whisper-tiny is half the size but misheard numbers like "118 over 76" in tests.)
 */
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js';
const MODEL = 'Xenova/whisper-base';

type Asr = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string } | { text: string }[]>;
type Progress = { status: string; file?: string; loaded?: number; total?: number };

let asrPromise: Promise<Asr> | null = null;
let ready = false;
const listeners = new Set<(p: number) => void>();
const files: Record<string, { loaded: number; total: number }> = {};

export function whisperSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof WebAssembly === 'object' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof OfflineAudioContext !== 'undefined'
  );
}

export function whisperReady(): boolean {
  return ready;
}

/** Loads (once) the Whisper pipeline. `onProgress` gets 0…1 while the model downloads. */
export function loadWhisper(onProgress?: (p: number) => void): Promise<Asr> {
  if (onProgress) listeners.add(onProgress);
  if (!asrPromise) {
    asrPromise = (async () => {
      // Bypass the bundler: load the ES module straight from the CDN at runtime.
      const importer = new Function('u', 'return import(u)') as (u: string) => Promise<Record<string, unknown>>;
      const tf = (await importer(LIB)) as {
        env: { allowLocalModels: boolean };
        pipeline: (task: string, model: string, opts: Record<string, unknown>) => Promise<Asr>;
      };
      tf.env.allowLocalModels = false;
      const asr = await tf.pipeline('automatic-speech-recognition', MODEL, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (e: Progress) => {
          if (e.status !== 'progress' || !e.file) return;
          files[e.file] = { loaded: e.loaded ?? 0, total: e.total ?? 0 };
          const all = Object.values(files);
          const total = all.reduce((s, f) => s + f.total, 0);
          const p = total ? all.reduce((s, f) => s + f.loaded, 0) / total : 0;
          listeners.forEach((l) => l(p));
        },
      });
      ready = true;
      return asr;
    })().catch((e) => {
      asrPromise = null;
      throw e;
    });
  }
  return asrPromise.finally(() => {
    if (onProgress) listeners.delete(onProgress);
  });
}

// Whisper "hears" these on near-silence (the VAD already drops silent clips); treat them as nothing said.
const NOISE = /^(\[.*\]|\(.*\)|thanks for watching!?|legendas.*|\.+)$/i;

export async function transcribe(pcm: Float32Array, lang: string, onProgress?: (p: number) => void): Promise<string> {
  const asr = await loadWhisper(onProgress);
  const out = await asr(pcm, {
    language: lang.startsWith('pt') ? 'portuguese' : 'english',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  const text = (Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text).replace(/\s+/g, ' ').trim();
  return NOISE.test(text) ? '' : text;
}
