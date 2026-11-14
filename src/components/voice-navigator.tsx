import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { C, VOICE_OPTIONS } from '@/constants/cosmo';

export function VoiceNavigator({ bottomOffset = 82 }: { bottomOffset?: number }) {
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(0);
  const [transcript, setTranscript] = useState('');

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const phrase = event.results[0]?.transcript?.toLocaleLowerCase('pt-BR').trim();
    if (!phrase) return;
    setTranscript(phrase);
    if (/pr[oó]xim[ao]|next|avan[cç]ar/.test(phrase)) {
      const next = (focused + 1) % VOICE_OPTIONS.length;
      setFocused(next);
      setTranscript(`Opção ${next + 1}: ${VOICE_OPTIONS[next].label}`);
      Speech.speak(`Opção ${next + 1}: ${VOICE_OPTIONS[next].label}`, { language: 'pt-BR' });
      return;
    }
    if (/anterior|voltar|previous/.test(phrase)) {
      const next = (focused - 1 + VOICE_OPTIONS.length) % VOICE_OPTIONS.length;
      setFocused(next);
      setTranscript(`Opção ${next + 1}: ${VOICE_OPTIONS[next].label}`);
      Speech.speak(`Opção ${next + 1}: ${VOICE_OPTIONS[next].label}`, { language: 'pt-BR' });
      return;
    }
    if (/abrir|selecionar|confirmar|open|select/.test(phrase)) { router.push(VOICE_OPTIONS[focused].route as never); return; }
    const normalized = phrase.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const aliases = [
      { words: ['inicio', 'casa'], index: 0 }, { words: ['humor', 'sentimento'], index: 6 },
      { words: ['sono', 'dormir'], index: 7 }, { words: ['radiacao', 'dosimetro'], index: 8 },
      { words: ['corpo', 'medidas', 'lesao', 'ferimento'], index: 9 }, { words: ['refeicao', 'comida', 'alimentacao'], index: 10 },
      { words: ['exercicio', 'treino'], index: 11 }, { words: ['relaxamento', 'respiracao', 'meditacao'], index: 12 },
      { words: ['calendario', 'agenda'], index: 4 }, { words: ['classificacao', 'pontuacao'], index: 13 },
      { words: ['orbi', 'assistente'], index: 2 }, { words: ['status', 'saude'], index: 1 },
      { words: ['mensagem', 'mensagens'], index: 3 }, { words: ['avatar', 'loja', 'personalizar'], index: 5 },
    ];
    const direct = VOICE_OPTIONS.findIndex((option) => normalized.includes(option.label.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
    const alias = aliases.find((item) => item.words.some((word) => normalized.includes(word)))?.index;
    const match = direct >= 0 ? direct : alias ?? -1;
    if (match >= 0) { setFocused(match); router.push(VOICE_OPTIONS[match].route as never); }
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    if (event.error !== 'aborted') setTranscript('Não consegui ouvir. Toque no microfone e tente novamente.');
  });

  useEffect(() => () => { ExpoSpeechRecognitionModule.abort(); Speech.stop(); }, []);

  const toggleListening = async () => {
    if (listening) { ExpoSpeechRecognitionModule.stop(); return; }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setTranscript(Platform.OS === 'web' ? 'Libere o microfone nas permissões do navegador.' : 'Ative a permissão do microfone para usar a voz.');
      return;
    }
    setTranscript(`Opção ${focused + 1} de ${VOICE_OPTIONS.length}: ${VOICE_OPTIONS[focused].label}`);
    const startRecognition = () => ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: false, maxAlternatives: 1 });
    Speech.speak(`Navegação por voz. Diga próxima opção, anterior, ou o nome de uma tela. Opção atual: ${VOICE_OPTIONS[focused].label}.`, {
      language: 'pt-BR', rate: 0.94, onDone: startRecognition, onError: startRecognition,
    });
  };

  const next = () => { const value = (focused + 1) % VOICE_OPTIONS.length; setFocused(value); setTranscript(`Opção ${value + 1}: ${VOICE_OPTIONS[value].label}`); Speech.speak(VOICE_OPTIONS[value].label, { language: 'pt-BR' }); };

  return <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
    {transcript ? <Text accessibilityLiveRegion="polite" style={styles.caption}>{transcript}</Text> : null}
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Parar navegação por voz' : 'Iniciar navegação por voz'} accessibilityHint="Diga próxima opção, anterior ou o nome de uma tela" onPress={toggleListening} style={[styles.mic, listening && styles.micOn]}>
        <Text style={styles.micIcon}>{listening ? '■' : '🎙'}</Text>
      </Pressable>
      {listening ? <Pressable accessibilityRole="button" accessibilityLabel="Próxima opção de navegação" onPress={next} style={styles.next}><Text style={styles.nextText}>Próxima opção ›</Text></Pressable> : null}
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
