import { router } from 'expo-router';
import { useState } from 'react';

import { SecondaryButton } from '@/components/Buttons';
import { Card, CardTitle } from '@/components/Card';
import { LogScreen, Note, SaveButton, goBackTo } from '@/components/LogKit';
import { MealChoices } from '@/components/PlanCards';
import { Badge } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { openMealChoices, saveMealChoices, type MealChoice } from '@/data/plans';
import { C, tokens, X } from '@/theme/tokens';

/**
 * Confirm today's meal plan. The medical team planned each meal with its nutrition,
 * so the astronaut only taps "As planned" (default for meals already due) or says what changed.
 */
export default function MealsAdd() {
  const [choices, setChoices] = useState<MealChoice[]>(() => openMealChoices());
  const answered = choices.filter((c) => c.status && (c.status !== 'swapped' || c.swapTo)).length;

  const save = () => {
    if (!answered) return;
    saveMealChoices(choices.filter((c) => c.status !== 'swapped' || c.swapTo));
    goBackTo('/logs/meals');
  };

  return (
    <LogScreen
      title="Today's meals"
      backHref="/logs/meals"
      gap={14}
      footer={<SaveButton label={`Confirm ${answered} meal${answered === 1 ? '' : 's'}`} reward={answered * 10} onPress={save} disabled={!answered} />}>
      <Card gap={12}>
        <CardTitle title="Meal plan" right={<Badge label="From your medical team · demo" color={C.gold} bg={X.goldSoft} />} />
        {choices.length ? (
          <MealChoices choices={choices} onChange={setChoices} />
        ) : (
          <Txt size={tokens.font.size.small} color={C.muted}>
            Every planned meal is confirmed for today.
          </Txt>
        )}
      </Card>
      <Note tone="muted">Nutrition comes from the plan. Only what you confirm is counted: a planned meal is not a meal eaten.</Note>
      <SecondaryButton label="Ate something not in the plan" icon="plus" onPress={() => router.push('/logs/meals/extra')} />
    </LogScreen>
  );
}
