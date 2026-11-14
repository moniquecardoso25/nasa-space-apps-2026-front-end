import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { useAuth } from '@/components/auth-context';
import { C, VOICE_OPTIONS } from '@/constants/cosmo';

export function VoiceNavigator({ bottomOffset = 82 }: { bottomOffset?: number }) {
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(0);
  const [transcript, setTranscript] = useState('');
  const { session } = useAuth();
  const options = useMemo(
    () => VOICE_OPTIONS.filter((option) => option.route !== '/care' || (session && session.user.role !== 'astronaut')),
    [session],
  );

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const phrase = event.results[0]?.transcript?.toLocaleLowerCase('en-US').trim();
    if (!phrase) return;
    setTranscript(phrase);
    if (/\b(next|next option)\b/.test(phrase)) {
      const nextIndex = (focused + 1) % options.length;
      setFocused(nextIndex);
      setTranscript(`Option ${nextIndex + 1}: ${options[nextIndex].label}`);
      Speech.speak(`Option ${nextIndex + 1}: ${options[nextIndex].label}`, { language: 'en-US' });
      return;
    }
    if (/\b(previous|go back|back)\b/.test(phrase)) {
      const nextIndex = (focused - 1 + options.length) % options.length;
      setFocused(nextIndex);
      setTranscript(`Option ${nextIndex + 1}: ${options[nextIndex].label}`);
      Speech.speak(`Option ${nextIndex + 1}: ${options[nextIndex].label}`, { language: 'en-US' });
      return;
    }
    if (/\b(open|select|confirm)\b/.test(phrase)) { router.push(options[focused].route as never); return; }
    const normalized = phrase.replace(/[^a-z0-9 ]/g, ' ');
    const direct = options.findIndex((option) => normalized.includes(option.label.toLocaleLowerCase('en-US').replace(/[^a-z0-9 ]/g, ' ')));
    const aliases = [
      { words: ['start', 'mission home'], route: '/home' }, { words: ['health status', 'crew status'], route: '/status' },
      { words: ['assistant', 'journal', 'orbi'], route: '/orbi' }, { words: ['messages', 'mission control'], route: '/messages' },
      { words: ['calendar', 'schedule'], route: '/calendar' }, { words: ['avatar', 'shop'], route: '/avatar' },
      { words: ['mood', 'check in'], route: '/log/mood' }, { words: ['sleep'], route: '/log/sleep' },
      { words: ['radiation', 'dosimeter'], route: '/log/radiation' }, { words: ['body', 'injury', 'measurement'], route: '/log/body' },
      { words: ['meal', 'food'], route: '/log/meals' }, { words: ['exercise', 'workout'], route: '/log/exercise' },
      { words: ['relax', 'breathing', 'meditation'], route: '/log/relax' }, { words: ['leaderboard', 'scores'], route: '/leaderboard' },
      { words: ['research', 'nasa data', 'science data'], route: '/research' }, { words: ['medical care', 'care queue'], route: '/care' },
    ];
    const alias = aliases.find((item) => item.words.some((word) => normalized.includes(word)) && options.some((option) => option.route === item.route));
    const match = direct >= 0 ? direct : alias ? options.findIndex((option) => option.route === alias.route) : -1;
    if (match >= 0) { setFocused(match); router.push(options[match].route as never); }
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    if (event.error !== 'aborted') setTranscript('I could not hear that. Tap the microphone and try again.');
  });

  useEffect(() => () => { ExpoSpeechRecognitionModule.abort(); Speech.stop(); }, []);

  const toggleListening = async () => {
    if (listening) { ExpoSpeechRecognitionModule.stop(); return; }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setTranscript(Platform.OS === 'web' ? 'Allow microphone access in your browser settings.' : 'Allow microphone access to use voice navigation.');
      return;
    }
    const selected = Math.min(focused, options.length - 1);
    setFocused(selected);
    setTranscript(`Option ${selected + 1} of ${options.length}: ${options[selected].label}`);
    const startRecognition = () => ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false, maxAlternatives: 1 });
    Speech.speak(`Voice navigation. Say next option, previous, or the name of a screen. Current option: ${options[selected].label}.`, {
      language: 'en-US', rate: 0.94, onDone: startRecognition, onError: startRecognition,
    });
  };

  const next = () => {
    const value = (focused + 1) % options.length;
    setFocused(value);
    setTranscript(`Option ${value + 1}: ${options[value].label}`);
    Speech.speak(options[value].label, { language: 'en-US' });
  };

  return <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
    {transcript ? <Text accessibilityLiveRegion="polite" style={styles.caption}>{transcript}</Text> : null}
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop voice navigation' : 'Start voice navigation'} accessibilityHint="Say next option, previous, or a screen name" onPress={toggleListening} style={[styles.mic, listening && styles.micOn]}>
        <Text style={styles.micIcon}>{listening ? '■' : '🎙'}</Text>
      </Pressable>
      {listening ? <Pressable accessibilityRole="button" accessibilityLabel="Next navigation option" onPress={next} style={styles.next}><Text style={styles.nextText}>Next option ›</Text></Pressable> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 14, bottom: 82, alignItems: 'flex-end', gap: 8 },
  caption: { maxWidth: 250, color: C.text, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mic: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: C.teal, borderWidth: 3, borderColor: C.background, elevation: 6 },
  micOn: { backgroundColor: C.pink }, micIcon: { color: C.background, fontSize: 22, fontWeight: '800' },
  next: { backgroundColor: C.surface, borderColor: C.teal, borderWidth: 1, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14 }, nextText: { color: C.text, fontWeight: '700', fontSize: 13 },
});
