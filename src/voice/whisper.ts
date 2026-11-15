/** Native stub: on the phone, speech-to-text uses the system recognizer (expo-speech-recognition). */
export type VoiceStatus = 'idle' | 'loading' | 'ready' | 'error';
export type VoiceState = { status: VoiceStatus; progress: number };

const READY: VoiceState = { status: 'ready', progress: 1 };

export function whisperSupported(): boolean {
  return false;
}

export const getVoiceState = (): VoiceState => READY;

export function subscribeVoice(_f: () => void): () => void {
  return () => {};
}

export async function prepareWhisper(_onProgress?: (p: number) => void): Promise<void> {}

export function whisperReady(): boolean {
  return true;
}

export async function transcribe(_pcm: Float32Array, _lang: string, _onProgress?: (p: number) => void): Promise<string> {
  throw new Error('On-device speech recognition runs only on the web.');
}
