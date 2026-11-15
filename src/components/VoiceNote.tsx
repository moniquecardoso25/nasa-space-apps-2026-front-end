import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { session } from '@/data/session';
import type { VoiceNote } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';
import { dbToLevel, decodeTo16k } from '@/voice/mic';
import { startListening, voiceEngine, type StopFn } from '@/voice/speech';
import { transcribe, whisperSupported } from '@/voice/whisper';

import { AudioBars } from './AudioBars';
import { ProgressBar } from './Charts';
import { Icon } from './Icon';
import { Chip } from './Inputs';
import { Txt } from './Txt';

const MAX_SEC = 60;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Plays a recorded voice note (play/pause + progress). */
export function VoiceNotePlayer({ note }: { note: VoiceNote }) {
  const player = useAudioPlayer(note.uri);
  const st = useAudioPlayerStatus(player);
  const dur = st.duration && isFinite(st.duration) ? st.duration : note.durationSec;
  const playing = st.playing;
  const toggle = () => {
    if (playing) player.pause();
    else {
      if (st.didJustFinish || (dur && st.currentTime >= dur - 0.05)) player.seekTo(0);
      player.play();
    }
  };
  return (
    <View style={styles.player}>
      <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause voice note' : 'Play voice note'} onPress={toggle} style={styles.play}>
        <Icon name={playing ? 'pause' : 'play'} size={18} color={C.bg} fill={playing ? 'none' : C.bg} />
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <ProgressBar value={dur ? Math.min(1, st.currentTime / dur) : 0} color={C.teal} height={6} />
        <Txt size={tokens.font.size.caption} color={C.muted}>
          Voice note · {mmss(playing || st.currentTime > 0 ? st.currentTime : dur)}
          {playing || st.currentTime > 0 ? ` / ${mmss(dur)}` : ''}
        </Txt>
      </View>
    </View>
  );
}

/**
 * Optional spoken comment for the mood check-in: record (≤ 60 s, live bars),
 * listen back, re-record or delete. A transcript is added when possible:
 * browser speech recognition while recording, or on-device Whisper afterwards
 * (Firefox). On the phone the audio is kept without a transcript.
 */
export function VoiceNoteRecorder({ value, onChange }: { value: VoiceNote | null; onChange: (v: VoiceNote | null) => void }) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const rs = useAudioRecorderState(recorder, 80);
  const level = useSharedValue(0.06);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState('');
  const sttStop = useRef<StopFn | null>(null);
  const sttText = useRef('');
  const engine = voiceEngine();

  useEffect(() => {
    if (recording && rs.metering !== undefined) level.set(withTiming(Math.max(0.06, dbToLevel(rs.metering)), { duration: 80 }));
  }, [recording, rs.metering, level]);

  const secs = (rs.durationMillis ?? 0) / 1000;

  const start = async () => {
    setError(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission was denied.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      setLive('');
      sttText.current = '';
      // Chrome / Edge / Safari: transcribe live while recording.
      if (engine === 'browser') {
        sttStop.current = await startListening(
          {
            onPartial: (t) => setLive(t),
            onFinal: (t) => (sttText.current = t),
          },
          { lang: session.voiceLang, continuous: true },
        );
      }
    } catch {
      setError('Could not start recording on this device.');
      setRecording(false);
    }
  };

  const stop = async () => {
    const durationSec = Math.max(1, Math.round(secs));
    setRecording(false);
    level.set(withTiming(0.06, { duration: 150 }));
    sttStop.current?.();
    sttStop.current = null;
    try {
      await recorder.stop();
      if (Platform.OS !== 'web') await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      setError('Recording failed. Try again.');
      return;
    }
    const uri = recorder.uri;
    if (!uri) {
      setError('Recording failed. Try again.');
      return;
    }
    let transcript = (sttText.current || live).trim() || undefined;
    onChange({ uri, durationSec, transcript });
    // Firefox (or the browser recognizer failed): on-device Whisper after the fact.
    if (!transcript && Platform.OS === 'web' && whisperSupported()) {
      try {
        setBusy('Transcribing on this device…');
        const pcm = await decodeTo16k(await (await fetch(uri)).blob());
        transcript = (await transcribe(pcm, session.voiceLang, (p) => setBusy(`Downloading the voice model (one time only)… ${Math.round(p * 100)}%`))) || undefined;
        if (transcript) onChange({ uri, durationSec, transcript });
      } catch {
        // keep the audio without a transcript
      } finally {
        setBusy(null);
      }
    }
  };

  // auto-stop at the limit
  useEffect(() => {
    if (!recording || secs < MAX_SEC) return;
    const t = setTimeout(stop, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, secs]);

  // never leave the mic on when leaving the screen
  useEffect(
    () => () => {
      sttStop.current?.abort();
    },
    [],
  );

  if (recording) {
    return (
      <View style={[styles.box, styles.boxRec]}>
        <View style={styles.recHead}>
          <View style={styles.recDot} />
          <Txt weight="700" size={tokens.font.size.small}>
            Recording · {mmss(secs)} / {mmss(MAX_SEC)}
          </Txt>
        </View>
        <View style={{ alignItems: 'center' }}>
          <AudioBars level={level} color={C.teal} bars={28} height={44} barWidth={4} />
        </View>
        {live ? (
          <Txt size={tokens.font.size.caption} color={C.muted} numberOfLines={3}>
            “{live}”
          </Txt>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Stop recording" onPress={stop} style={styles.stopBtn}>
          <Icon name="stop" size={18} color={C.bg} />
          <Txt weight="700" size={tokens.font.size.body} color={C.bg}>
            Stop
          </Txt>
        </Pressable>
      </View>
    );
  }

  if (value) {
    return (
      <View style={styles.box}>
        <VoiceNotePlayer note={value} />
        {busy ? (
          <Txt size={tokens.font.size.caption} color={C.teal}>
            {busy}
          </Txt>
        ) : value.transcript ? (
          <Txt size={tokens.font.size.small} color={C.muted} lh={1.45}>
            “{value.transcript}”
          </Txt>
        ) : null}
        <View style={styles.row}>
          <Chip label="Re-record" onPress={start} />
          <Chip label="Delete" onPress={() => onChange(null)} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Record a voice note" onPress={start} style={styles.recordBtn}>
        <Icon name="mic" size={20} color={C.teal} />
        <Txt weight="600" size={tokens.font.size.body} color={C.teal}>
          Record a voice note
        </Txt>
      </Pressable>
      <Txt size={tokens.font.size.caption} color={C.muted}>
        Optional · up to 1 min · say anything about how you feel
      </Txt>
      {error ? (
        <Txt size={tokens.font.size.caption} color={C.warning}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, padding: 12, borderRadius: tokens.radius.item, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  boxRec: { borderColor: C.teal },
  recHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.danger },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: tokens.size.touch, borderRadius: tokens.radius.item, backgroundColor: C.teal },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: tokens.size.touch,
    borderRadius: tokens.radius.item,
    backgroundColor: X.tealSoft,
    borderWidth: 1,
    borderColor: C.teal,
    borderStyle: 'dashed',
  },
  player: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.teal },
  row: { flexDirection: 'row', gap: 6 },
});
