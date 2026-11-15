/**
 * Web microphone helpers (getUserMedia + Web Audio):
 * - live input level 0…1 for the audio bars and voice-activity detection;
 * - optional capture of the clip, decoded to 16 kHz mono PCM for on-device Whisper.
 * Works in every modern browser, including Firefox.
 */

export type MicSession = {
  /** Current input level 0…1 (≈ −55 dBFS → 0, ≈ −15 dBFS → 1). */
  level: () => number;
  /** Stops the mic; with capture, resolves the recorded clip as 16 kHz mono PCM. */
  stop: () => Promise<Float32Array | null>;
};

type AC = typeof AudioContext;
const AudioCtx = (): AC | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AC; webkitAudioContext?: AC };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
};

export function micAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!AudioCtx();
}

export function dbToLevel(db: number): number {
  return Math.max(0, Math.min(1, (db + 55) / 40));
}

/** Decodes any recorded audio (webm/ogg/mp4…) to 16 kHz mono Float32 PCM. */
export async function decodeTo16k(data: Blob | ArrayBuffer): Promise<Float32Array> {
  const Ctx = AudioCtx();
  if (!Ctx) throw new Error('Web Audio is not available.');
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    const frames = Math.max(1, Math.ceil(decoded.duration * 16000));
    const off = new OfflineAudioContext(1, frames, 16000);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const out = await off.startRendering();
    return out.getChannelData(0);
  } finally {
    ctx.close().catch(() => {});
  }
}

export async function openMic({ capture }: { capture: boolean }): Promise<MicSession> {
  const Ctx = AudioCtx();
  if (!Ctx || !navigator.mediaDevices?.getUserMedia) throw new Error('Microphone is not available in this browser.');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch {
    throw new Error('Microphone permission was denied.');
  }
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  let recorder: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  if (capture && typeof MediaRecorder !== 'undefined') {
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.start();
  }

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
  };

  return {
    level: () => {
      if (closed) return 0;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      return dbToLevel(20 * Math.log10(rms || 1e-8));
    },
    stop: async () => {
      if (!recorder) {
        close();
        return null;
      }
      const r = recorder;
      recorder = null;
      const done = new Promise<void>((res) => (r.onstop = () => res()));
      if (r.state !== 'inactive') r.stop();
      await done;
      close();
      if (!chunks.length) return null;
      return decodeTo16k(new Blob(chunks, { type: r.mimeType }));
    },
  };
}
