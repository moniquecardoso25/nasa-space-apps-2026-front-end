import { useEffect, useSyncExternalStore } from 'react';

import { voiceEngine } from './speech';
import { getVoiceState, prepareWhisper, subscribeVoice } from './whisper';

/**
 * For screens that listen: starts the on-device model download as soon as the
 * screen opens and tells whether voice can be used yet. Voice controls stay
 * disabled until `ready` (typing always works). Browser / phone recognizers
 * need nothing, so they are ready at once.
 */
export function useVoiceGate(enabled = true) {
  const engine = voiceEngine();
  const needs = enabled && engine === 'whisper';
  const st = useSyncExternalStore(subscribeVoice, getVoiceState, getVoiceState);
  useEffect(() => {
    if (needs && st.status === 'idle') prepareWhisper().catch(() => {});
  }, [needs, st.status]);
  return {
    engine,
    /** the screen must wait for the on-device model */
    needs,
    ready: engine !== 'none' && (!needs || st.status === 'ready'),
    status: needs ? st.status : ('ready' as const),
    progress: st.progress,
    retry: () => {
      prepareWhisper().catch(() => {});
    },
  };
}

export type VoiceGate = ReturnType<typeof useVoiceGate>;
