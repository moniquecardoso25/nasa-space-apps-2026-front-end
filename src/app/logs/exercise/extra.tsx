import { useState } from 'react';

import { Chip, Rating } from '@/components/Inputs';
import { ChipRow, Group, LogScreen, SaveButton, Stepper, goBackTo } from '@/components/LogKit';
import { addLog } from '@/data/api';
import type { ExerciseData } from '@/data/types';

const EQUIPMENT: { v: ExerciseData['equipment']; label: string; modality: ExerciseData['modality'] }[] = [
  { v: 'resistive_device', label: 'Resistive device', modality: 'resistive' },
  { v: 'treadmill', label: 'Treadmill', modality: 'aerobic' },
  { v: 'cycle', label: 'Cycle', modality: 'aerobic' },
];

/** A session that was not in the training plan: type, equipment, duration stepper, effort 1–5. */
export default function ExerciseExtra() {
  const [modality, setModality] = useState<ExerciseData['modality']>('resistive');
  const [equipment, setEquipment] = useState<ExerciseData['equipment']>('resistive_device');
  const [minutes, setMinutes] = useState(30);
  const [effort, setEffort] = useState<number | null>(3);

  const pickType = (m: ExerciseData['modality']) => {
    setModality(m);
    setEquipment(m === 'resistive' ? 'resistive_device' : 'treadmill');
  };

  const save = async () => {
    if (effort === null) return;
    await addLog('exercise', { modality, equipment, durationMin: minutes, effort }, { environmentId: 'gym' });
    goBackTo('/logs/exercise');
  };

  return (
    <LogScreen title="Extra session" backHref="/logs/exercise/add" gap={16} footer={<SaveButton label="Save session" onPress={save} disabled={effort === null} />}>
      <Group title="Type">
        <ChipRow>
          <Chip label="Resistive" selected={modality === 'resistive'} onPress={() => pickType('resistive')} />
          <Chip label="Aerobic" selected={modality === 'aerobic'} onPress={() => pickType('aerobic')} />
        </ChipRow>
      </Group>
      <Group title="Equipment">
        <ChipRow>
          {EQUIPMENT.map((e) => (
            <Chip
              key={e.v}
              label={e.label}
              selected={equipment === e.v}
              onPress={() => {
                setEquipment(e.v);
                setModality(e.modality);
              }}
            />
          ))}
        </ChipRow>
      </Group>
      <Group title="Duration">
        <Stepper value={minutes} onChange={setMinutes} />
      </Group>
      <Group title="How hard was it?">
        <Rating value={effort} onChange={setEffort} minLabel="Very easy" maxLabel="Max effort" />
      </Group>
    </LogScreen>
  );
}
