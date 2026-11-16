import { router } from 'expo-router';
import { useState } from 'react';

import { SecondaryButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { LogScreen, SaveButton, goBackTo } from '@/components/LogKit';
import { SessionChoices } from '@/components/PlanCards';
import { Badge } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { openSessionChoices, saveSessionChoices, type SessionChoice } from '@/data/plans';
import { C, tokens, X } from '@/theme/tokens';

/** Confirm today's planned training sessions (from the schedule): done, changed minutes, or skipped. */
export default function ExerciseAdd() {
  const [choices, setChoices] = useState<SessionChoice[]>(() => openSessionChoices());
  const toSave = choices.filter((c) => c.status === 'done' || c.status === 'changed').length;
  const answered = choices.filter((c) => c.status).length;

  const save = () => {
    if (!answered) return;
    saveSessionChoices(choices);
    goBackTo('/logs/exercise');
  };

  return (
    <LogScreen
      title="Today's training"
      backHref="/logs/exercise"
      gap={14}
      footer={<SaveButton label={toSave ? `Confirm ${toSave} session${toSave === 1 ? '' : 's'}` : 'Confirm'} reward={toSave * 10} onPress={save} disabled={!answered} />}>
      <Card gap={12}>
        <CardTitle title="Training schedule" right={<Badge label="From your calendar · demo" color={C.gold} bg={X.goldSoft} />} />
        {choices.length ? (
          <SessionChoices choices={choices} onChange={setChoices} />
        ) : (
          <Txt size={tokens.font.size.small} color={C.muted}>
            Nothing left on today&apos;s schedule.
          </Txt>
        )}
      </Card>
      <SecondaryButton label="Log a session not in the plan" icon="plus" onPress={() => router.push('/logs/exercise/extra')} />
    </LogScreen>
  );
}
