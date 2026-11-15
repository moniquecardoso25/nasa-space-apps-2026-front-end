/**
 * On-device speech-to-text for browsers without the Web Speech API (Firefox)
 * or when it fails (e.g. no connection to the browser's speech service).
 *
 * Runs Moonshine (base, English, 8-bit, MIT license) with transformers.js on
 * WebAssembly, inside a **Web Worker** so loading and transcribing never
 * freeze the screen. Nothing leaves the device. The library is loaded from
 * jsDelivr and the model (~63 MB) from the Hugging Face hub on first use; the
 * browser caches both, so later sessions start fast.
 *
 * Screens that listen call `prepareWhisper()` as soon as they open and keep
 * their voice controls disabled until `getVoiceState().status === 'ready'`.
 *
 * Why Moonshine and not Whisper: Whisper always encodes a fixed 30 s window, so
 * a 5 s answer took ~8.6 s to transcribe in tests; Moonshine processes only the
 * real length (~1.5 s for the same clip) with the same accuracy on our phrases.
 * (The file keeps its old name; the engine id is still `whisper` in speech.ts.)
 */
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js';
const MODEL = 'onnx-community/moonshine-base-ONNX';
/** Longer recordings (voice notes) are transcribed in pieces of this many seconds. */
const PIECE_S = 20;

type AsrOut = { text: string } | { text: string }[];
type ProgressEvent = { status: string; file?: string; loaded?: number; total?: number };

// ------------------------------------------------------------------ shared state (for the UI)

export type VoiceStatus = 'idle' | 'loading' | 'ready' | 'error';
export type VoiceState = { status: VoiceStatus; progress: number };

let state: VoiceState = { status: 'idle', progress: 0 };
const subs = new Set<() => void>();
function setState(patch: Partial<VoiceState>) {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}
export const getVoiceState = (): VoiceState => state;
export function subscribeVoice(f: () => void): () => void {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}

const files: Record<string, { loaded: number; total: number }> = {};
function onProgressEvent(e: ProgressEvent) {
  if (e.status !== 'progress' || !e.file) return;
  files[e.file] = { loaded: e.loaded ?? 0, total: e.total ?? 0 };
  const all = Object.values(files);
  const total = all.reduce((s, f) => s + f.total, 0);
  setState({ progress: total ? all.reduce((s, f) => s + f.loaded, 0) / total : 0 });
}

export function whisperSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof WebAssembly === 'object' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof OfflineAudioContext !== 'undefined'
  );
}

/** True once the model is downloaded and warmed up. */
export function whisperReady(): boolean {
  return state.status === 'ready';
}

// ------------------------------------------------------------------ backends

interface Backend {
  load(): Promise<void>;
  run(audio: Float32Array): Promise<AsrOut>;
}

/** Preferred: the model lives in a module Web Worker (UI stays smooth). */
function workerBackend(): Backend {
  const code = `
import { pipeline, env } from '${LIB}';
env.allowLocalModels = false;
let asr = null;
self.onmessage = async (e) => {
  const { id, type, audio } = e.data;
  try {
    if (type === 'load') {
      if (!asr) {
        asr = await pipeline('automatic-speech-recognition', '${MODEL}', {
          dtype: 'q8', device: 'wasm',
          progress_callback: (p) => self.postMessage({ type: 'progress', p: { status: p.status, file: p.file, loaded: p.loaded, total: p.total } }),
        });
        await asr(new Float32Array(8000)); // warm-up: compile the kernels now, not on the first answer
      }
      self.postMessage({ id, type: 'done' });
    } else if (type === 'run') {
      const out = await asr(audio);
      self.postMessage({ id, type: 'done', out });
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String((err && err.message) || err) });
  }
};`;
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  const worker = new Worker(url, { type: 'module' });
  let seq = 0;
  const pending = new Map<number, { res: (v: unknown) => void; rej: (e: Error) => void }>();
  worker.onmessage = (e: MessageEvent) => {
    const d = e.data as { id?: number; type: string; p?: ProgressEvent; out?: AsrOut; message?: string };
    if (d.type === 'progress' && d.p) return onProgressEvent(d.p);
    const p = d.id !== undefined ? pending.get(d.id) : undefined;
    if (!p) return;
    pending.delete(d.id!);
    if (d.type === 'error') p.rej(new Error(d.message));
    else p.res(d.out);
  };
  worker.onerror = (e) => {
    pending.forEach((p) => p.rej(new Error(e.message || 'Voice worker failed')));
    pending.clear();
  };
  const call = <T,>(msg: Record<string, unknown>, transfer: Transferable[] = []) =>
    new Promise<T>((res, rej) => {
      const id = ++seq;
      pending.set(id, { res: res as (v: unknown) => void, rej });
      worker.postMessage({ ...msg, id }, transfer);
    });
  return {
    load: () => call<void>({ type: 'load' }),
    run: (audio) => {
      const copy = audio.slice(); // own buffer, transferred to the worker
      return call<AsrOut>({ type: 'run', audio: copy }, [copy.buffer]);
    },
  };
}

/** Fallback for browsers without module workers: same model on the main thread. */
function mainThreadBackend(): Backend {
  type Asr = (audio: Float32Array) => Promise<AsrOut>;
  let asr: Asr | null = null;
  return {
    load: async () => {
      if (asr) return;
      const importer = new Function('u', 'return import(u)') as (u: string) => Promise<Record<string, unknown>>;
      const tf = (await importer(LIB)) as {
        env: { allowLocalModels: boolean };
        pipeline: (task: string, model: string, opts: Record<string, unknown>) => Promise<Asr>;
      };
      tf.env.allowLocalModels = false;
      asr = await tf.pipeline('automatic-speech-recognition', MODEL, { dtype: 'q8', device: 'wasm', progress_callback: onProgressEvent });
      await asr(new Float32Array(8000));
    },
    run: (audio) => asr!(audio),
  };
}

let backend: Backend | null = null;
let loading: Promise<void> | null = null;

/**
 * Downloads + warms up the model once (in the worker). Safe to call many times;
 * screens call it on open. Progress / readiness are in `getVoiceState()`.
 */
export function prepareWhisper(onProgress?: (p: number) => void): Promise<void> {
  if (state.status === 'ready') return Promise.resolve();
  let unsub: (() => void) | null = null;
  if (onProgress) unsub = subscribeVoice(() => onProgress(state.progress));
  if (!loading) {
    setState({ status: 'loading' });
    loading = (async () => {
      try {
        backend = backend ?? workerBackend();
        await backend.load();
      } catch {
        // module workers unavailable / blocked → main thread (may stutter while loading)
        backend = mainThreadBackend();
        await backend.load();
      }
      setState({ status: 'ready', progress: 1 });
    })().catch((e) => {
      loading = null;
      backend = null;
      setState({ status: 'error' });
      throw e;
    });
  }
  return loading.finally(() => unsub?.());
}

// ------------------------------------------------------------------ transcription

/**
 * Cuts silence at both ends (20 ms frames, keeps 0.3 s margins) and normalizes
 * the peak to 0.9. Moonshine sometimes returned nothing for clips with a long
 * silent start or clipped peaks; trimmed + normalized clips were reliable.
 */
function clean(pcm: Float32Array): Float32Array {
  const F = 320;
  const n = Math.floor(pcm.length / F);
  if (n < 3) return pcm;
  const rms = new Float32Array(n);
  let top = 0;
  for (let f = 0; f < n; f++) {
    let s = 0;
    for (let i = f * F; i < (f + 1) * F; i++) s += pcm[i] * pcm[i];
    rms[f] = Math.sqrt(s / F);
    top = Math.max(top, rms[f]);
  }
  const th = Math.max(0.005, top * 0.08);
  let a = 0;
  while (a < n && rms[a] < th) a++;
  let b = n - 1;
  while (b > a && rms[b] < th) b--;
  const from = Math.max(0, (a - 15) * F);
  const to = Math.min(pcm.length, (b + 16) * F);
  const out = pcm.slice(from, to);
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) {
    const g = 0.9 / peak;
    for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, out[i] * g));
  }
  return out;
}

const textOf = (out: AsrOut) => (Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text).trim();

// Models sometimes "hear" these on near-silence (the VAD already drops silent clips); treat them as nothing said.
const NOISE = /^(\[.*\]|\(.*\)|thanks for watching!?|\.+)$/i;

/** Lets the browser paint (e.g. the "Writing down…" loader) before work starts. */
const nextPaint = () =>
  new Promise<void>((res) => {
    if (typeof requestAnimationFrame === 'undefined') return void setTimeout(res, 30);
    requestAnimationFrame(() => setTimeout(res, 30));
  });

export async function transcribe(pcm: Float32Array, _lang: string, onProgress?: (p: number) => void): Promise<string> {
  await prepareWhisper(onProgress);
  await nextPaint();
  const audio = clean(pcm);
  const step = PIECE_S * 16000;
  const parts: string[] = [];
  for (let i = 0; i < audio.length; i += step) {
    const piece = audio.subarray(i, Math.min(audio.length, i + step));
    if (piece.length < 16000 * 0.3) continue;
    let text = textOf(await backend!.run(piece));
    if (!text) {
      // rare empty result on real speech: retry once with a short lead-in of silence
      const padded = new Float32Array(piece.length + 4800);
      padded.set(piece, 4800);
      text = textOf(await backend!.run(padded));
    }
    parts.push(text);
  }
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return NOISE.test(text) ? '' : text;
}
