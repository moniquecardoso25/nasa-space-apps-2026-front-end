import { useState } from 'react';
import { View } from 'react-native';

import { Chip } from '@/components/Inputs';
import { ChipRow, Group, LogScreen, SaveButton, goBackTo } from '@/components/LogKit';
import { MOOD_LEVELS, MoodSlider } from '@/components/Mood';
import { Txt } from '@/components/Txt';
import { VoiceNoteRecorder } from '@/components/VoiceNote';
import { firstName, getAstronaut, getTodayLogs, saveDailyLog } from '@/data/api';
import { MOOD_TAGS } from '@/data/derived';
import { useData } from '@/data/store';
import type { VoiceNote } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

/** Daily check-in: vertical drag slider + tags. Edits today's log if it exists. */
export default function MoodAdd() {
  const { me, existing } = useData(() => ({ me: getAstronaut(), existing: getTodayLogs('mood')[0] }));
  const [level, setLevel] = useState<1 | 2 | 3 | 4 | 5>(existing?.data.level ?? 3);
  const [tags, setTags] = useState<string[]>(existing?.data.tags ?? []);
  const [voiceNote, setVoiceNote] = useState<VoiceNote | null>(existing?.data.voiceNote ?? null);
  const m = MOOD_LEVELS.find((x) => x.level === level)!;

  const save = () => {
    saveDailyLog('mood', { level, label: m.label, tags, ...(voiceNote ? { voiceNote } : {}) });
    goBackTo('/logs/mood');
  };

  return (
    <LogScreen title="Daily check-in" backHref="/logs/mood" footer={<SaveButton label={`Save “${m.title}”`} reward={existing ? 0 : 10} onPress={save} />}>
      <Txt heading weight="700" size={tokens.font.size.title} align="center" lh={1.3} style={{ marginHorizontal: 8, marginTop: 6 }}>
        How are you feeling today,{' '}
        <Txt heading weight="700" size={tokens.font.size.title} color={C.primary}>
          {firstName(me)}
        </Txt>
        ?
      </Txt>
      <View style={{ marginHorizontal: -16 }}>
        <MoodSlider value={level} onChange={setLevel} />
      </View>
      <Txt size={tokens.font.size.small} color={C.muted} align="center">
        Drag the slider or tap a level
      </Txt>
      <Group title="What is behind it?">
        <ChipRow>
          {MOOD_TAGS.map((t) => (
            <Chip
              key={t}
              tone="primary"
              label={t.charAt(0).toUpperCase() + t.slice(1)}
              selected={tags.includes(t)}
              onPress={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
            />
          ))}
        </ChipRow>
      </Group>
      <Group title="Anything else? Say it">
        <VoiceNoteRecorder value={voiceNote} onChange={setVoiceNote} />
      </Group>
    </LogScreen>
  );
}
