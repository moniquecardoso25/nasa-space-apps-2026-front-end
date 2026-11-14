import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { SecondaryButton } from '@/components/Buttons';
import { Chip, Field, Rating, Segmented } from '@/components/Inputs';
import { ChipRow, Group, LogScreen, Note, SaveButton, goBackTo } from '@/components/LogKit';
import { Txt } from '@/components/Txt';
import { addLog, getLogs, updateLog } from '@/data/api';
import { INJURY_KIND_LABEL, INJURY_PART_LABEL, injuryTitle } from '@/data/derived';
import { useData } from '@/data/store';
import type { InjuryData, InjuryPart } from '@/data/types';
import { C, tokens } from '@/theme/tokens';

const PARTS = Object.keys(INJURY_PART_LABEL) as InjuryPart[];
const KINDS = Object.keys(INJURY_KIND_LABEL) as InjuryData['kind'][];
const SEVERITY: InjuryData['severity'][] = ['minor', 'moderate', 'severe'];
const STATUS: InjuryData['status'][] = ['active', 'healing', 'resolved'];
const CENTER_PARTS: InjuryPart[] = ['head', 'neck', 'back'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Add to Body · Injury tab. `?id=` opens an existing report to update its
 * status (no coins); otherwise saves a new report (+10). Severe → flagged to ground.
 */
export default function BodyInjury() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useData(() => (id ? getLogs({ type: 'injury' }).find((l) => l.id === id) : undefined), [id]);
  const e = existing?.data;
  const [part, setPart] = useState<InjuryPart>(e?.bodyPart ?? 'hand');
  const [side, setSide] = useState<InjuryData['side']>(e?.side ?? 'left');
  const [kind, setKind] = useState<InjuryData['kind']>(e?.kind ?? 'bruise');
  const [severity, setSeverity] = useState<InjuryData['severity']>(e?.severity ?? 'minor');
  const [pain, setPain] = useState<number | null>(e?.pain ?? null);
  const [desc, setDesc] = useState(e?.description ?? '');
  const [status, setStatus] = useState<InjuryData['status']>(e?.status ?? 'active');
  const [photo, setPhoto] = useState(!!e?.photoUrl);
  const center = CENTER_PARTS.includes(part);
  const valid = pain !== null && desc.trim().length > 2;

  const pickPart = (p: InjuryPart) => {
    setPart(p);
    if (CENTER_PARTS.includes(p)) setSide('center');
    else if (side === 'center') setSide('left');
  };

  const save = () => {
    if (!valid) return;
    const data: InjuryData = {
      bodyPart: part,
      side,
      kind,
      severity,
      pain: pain!,
      description: desc.trim(),
      photoUrl: photo ? 'local://injury-photo.jpg' : null,
      status,
      flaggedToGround: severity === 'severe',
    };
    if (existing) updateLog<'injury'>(existing.id, data);
    else addLog('injury', data);
    goBackTo('/logs/body');
  };

  return (
    <LogScreen
      title={existing ? injuryTitle(existing.data) : 'Add to Body'}
      backHref="/logs/body"
      gap={14}
      footer={<SaveButton label={existing ? 'Update injury' : 'Save injury report'} reward={existing ? 0 : 10} onPress={save} disabled={!valid} />}>
      {!existing ? (
        <Segmented
          items={[
            { value: 'measurement', label: 'Measurement' },
            { value: 'injury', label: 'Injury' },
          ]}
          selected="injury"
          onChange={(v) => v === 'measurement' && router.replace('/logs/body/add')}
        />
      ) : (
        <Group title="Status" strong>
          <ChipRow>
            {STATUS.map((s) => (
              <Chip key={s} label={cap(s)} selected={status === s} onPress={() => setStatus(s)} />
            ))}
          </ChipRow>
        </Group>
      )}
      <Group title="Where?" strong>
        <ChipRow>
          {PARTS.map((p) => (
            <Chip key={p} label={INJURY_PART_LABEL[p]} selected={part === p} onPress={() => pickPart(p)} />
          ))}
        </ChipRow>
        {!center ? (
          <ChipRow>
            <Chip label="Left" selected={side === 'left'} onPress={() => setSide('left')} />
            <Chip label="Right" selected={side === 'right'} onPress={() => setSide('right')} />
          </ChipRow>
        ) : null}
      </Group>
      <Group title="What happened?" strong>
        <ChipRow>
          {KINDS.map((k) => (
            <Chip key={k} label={INJURY_KIND_LABEL[k]} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </ChipRow>
      </Group>
      <Group title="Severity" strong>
        <ChipRow>
          {SEVERITY.map((s) => (
            <Chip key={s} label={cap(s)} selected={severity === s} onPress={() => setSeverity(s)} />
          ))}
        </ChipRow>
      </Group>
      <Group title="Pain right now" strong>
        <Rating value={pain} onChange={setPain} minLabel="No pain" maxLabel="Worst pain" />
      </Group>
      <Field label="How did it happen?" value={desc} onChangeText={setDesc} multiline placeholder="Hit my hand on a cargo bag latch…" />
      <SecondaryButton label={photo ? 'Photo added (simulated)' : 'Add a photo'} icon={photo ? 'check' : 'camera'} onPress={() => setPhoto(!photo)} />
      <Note tone="danger">Severe injuries are flagged to the ground team right away and Orbi shows first-aid steps.</Note>
      {severity === 'severe' ? (
        <Txt weight="700" size={tokens.font.size.caption} color={C.danger}>
          This report will be flagged to the ground team.
        </Txt>
      ) : null}
    </LogScreen>
  );
}
