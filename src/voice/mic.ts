/**
 * Native stub of the web mic helpers (see mic.web.ts). On the phone, input
 * levels come from expo-speech-recognition's `volumechange` events and
 * recordings from expo-audio, so these are never used.
 */
export type MicSession = { level: () => number; stop: () => Promise<Float32Array | null> };

export function micAvailable(): boolean {
  return false;
}

export function dbToLevel(db: number): number {
  return Math.max(0, Math.min(1, (db + 55) / 40));
}

export async function decodeTo16k(_data: Blob | ArrayBuffer): Promise<Float32Array> {
  throw new Error('Not available on this platform.');
}

export async function openMic(_opts: { capture: boolean }): Promise<MicSession> {
  throw new Error('Not available on this platform.');
}
