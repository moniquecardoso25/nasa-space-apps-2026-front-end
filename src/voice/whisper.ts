/** Native stub: on the phone, speech-to-text uses the system recognizer (expo-speech-recognition). */
export function whisperSupported(): boolean {
  return false;
}

export function whisperReady(): boolean {
  return false;
}

export async function transcribe(_pcm: Float32Array, _lang: string, _onProgress?: (p: number) => void): Promise<string> {
  throw new Error('On-device Whisper runs only on the web.');
}
