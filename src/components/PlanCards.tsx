import { StyleSheet, View } from 'react-native';

import { foodCatalog, SLOT_LABEL, type MealChoice, type SessionChoice } from '@/data/plans';
import { C, tokens } from '@/theme/tokens';

import { Chip } from './Inputs';
import { ChipRow, Stars, Stepper } from './LogKit';
import { Txt } from './Txt';

const MEAL_STATUS: [NonNullable<MealChoice['status']>, string][] = [
  ['followed', 'As planned'],
  ['partial', 'Part'],
  ['swapped', 'Swap'],
  ['skipped', 'Skip'],
];

function Head({ time, title, right }: { time: string; title: string; right: string }) {
  return (
    <View style={styles.head}>
      <Txt size={tokens.font.size.small} color={C.muted} style={{ width: 44 }}>
        {time}
      </Txt>
      <Txt weight="600" size={tokens.font.size.body} style={{ flex: 1 }} numberOfLines={2}>
        {title}
      </Txt>
      <Txt weight="700" size={tokens.font.size.small} color={C.muted}>
        {right}
      </Txt>
    </View>
  );
}

/**
 * Planned meals with the nutrition already filled in: one tap to confirm each one,
 * or say what changed (ate part, swapped for another catalog item, skipped).
 */
export function MealChoices({ choices, onChange }: { choices: MealChoice[]; onChange: (c: MealChoice[]) => void }) {
  const set = (i: number, patch: Partial<MealChoice>) => onChange(choices.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const catalog = foodCatalog();
  return (
    <View style={{ gap: 12 }}>
      {choices.map((c, i) => (
        <View key={c.meal.id} style={[styles.item, i > 0 && styles.sep]}>
          <Head time={c.meal.time} title={`${SLOT_LABEL[c.meal.slot]} · ${c.meal.name}`} right={`${c.meal.kcal} kcal`} />
          <ChipRow>
            {MEAL_STATUS.map(([v, label]) => (
              <Chip
                key={v}
                label={label}
                selected={c.status === v}
                onPress={() => set(i, { status: c.status === v ? null : v, eatenPct: v === 'partial' && c.eatenPct === 100 ? 50 : c.eatenPct })}
              />
            ))}
          </ChipRow>
          {c.status === 'partial' ? (
            <ChipRow>
              {[25, 50, 75].map((p) => (
                <Chip key={p} label={`${p}%`} selected={c.eatenPct === p} onPress={() => set(i, { eatenPct: p })} />
              ))}
            </ChipRow>
          ) : null}
          {c.status === 'swapped' ? (
            <>
              <Txt size={tokens.font.size.caption} color={C.muted}>
                What did you eat instead?
              </Txt>
              <ChipRow>
                {catalog
                  .filter((f) => f.name !== c.meal.name)
                  .slice(0, 8)
                  .map((f) => (
                    <Chip key={f.name} label={f.name} selected={c.swapTo === f.name} onPress={() => set(i, { swapTo: f.name })} />
                  ))}
              </ChipRow>
            </>
          ) : null}
          {c.status !== 'skipped' ? (
            <View style={styles.taste}>
              <Txt size={tokens.font.size.caption} color={C.muted}>
                Taste
              </Txt>
              <Stars value={c.taste} onChange={(v) => set(i, { taste: v })} size={18} gap={0} />
            </View>
          ) : null}
          {c.status === null ? (
            <Txt size={tokens.font.size.caption} color={C.muted}>
              Later today · confirm when you eat it
            </Txt>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Planned training sessions: confirm as planned, change the minutes, or mark skipped. */
export function SessionChoices({ choices, onChange }: { choices: SessionChoice[]; onChange: (c: SessionChoice[]) => void }) {
  const set = (i: number, patch: Partial<SessionChoice>) => onChange(choices.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <View style={{ gap: 12 }}>
      {choices.map((c, i) => (
        <View key={c.session.id} style={[styles.item, i > 0 && styles.sep]}>
          <Head time={c.session.time} title={c.session.label} right={`${c.session.minutes} min`} />
          <ChipRow>
            {(
              [
                ['done', 'Done as planned'],
                ['changed', 'Changed'],
                ['skipped', 'Skipped'],
              ] as const
            ).map(([v, label]) => (
              <Chip key={v} label={label} selected={c.status === v} onPress={() => set(i, { status: c.status === v ? null : v })} />
            ))}
          </ChipRow>
          {c.status === 'changed' ? <Stepper value={c.minutes} onChange={(m) => set(i, { minutes: m })} /> : null}
          {c.status === null ? (
            <Txt size={tokens.font.size.caption} color={C.muted}>
              Later today · confirm after the session
            </Txt>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Taste in a clause: "lunch was a 2", "3 stars", "didn't like the stew" (2), "loved the curry" (5). */
function tasteOf(part: string): number | null {
  const n = part.match(/\b([1-5])\s*(?:stars?|out of (?:5|five)|\/\s*5)|\b(?:was (?:a|an)?|taste|rated?|give it)\s*([1-5])\b/);
  if (n) return Number(n[1] ?? n[2]);
  if (/\b(didn'?t like|did not like|hated|disgusting|awful|bland|boring|tired of)\b/.test(part)) return 2;
  if (/\b(loved|delicious|amazing|tasty|really good)\b/.test(part)) return 5;
  return null;
}

/** Rule-based reading of a spoken/typed answer about the meal plan ("yes", "half the lunch", "skipped dinner", "soup instead of lunch"). */
export function applyMealAnswer(text: string, choices: MealChoice[]): { choices: MealChoice[]; understood: boolean } {
  const t = text.toLowerCase();
  if (/\b(yes|yeah|yep|ok|okay|sure|correct|all|everything|as planned|followed)\b/.test(t) && !/\b(but|except|half|skip|missed|instead|swap|stars?|taste|rated?|was an? \d|didn'?t like|did not like|hated|loved|bland|boring|tired of)/.test(t)) {
    return { choices: choices.map((c) => (c.status === null ? c : { ...c, status: 'followed' })), understood: true };
  }
  let understood = false;
  let next = choices;
  // each clause changes its own meal: "half the lunch, skipped the snack"
  for (const part of t.split(/,|;|\band\b|\bbut\b|\bthen\b/)) {
    // a meal is named by its slot ("lunch") or a word of its dish ("the stew")
    const named = (c: MealChoice) =>
      part.includes(c.meal.slot) ||
      c.meal.name
        .toLowerCase()
        .split(/[^a-z]+/)
        .some((w) => w.length > 3 && part.includes(w));
    const slots = choices.filter(named).map((c) => c.meal.slot);
    if (!slots.length) continue;
    const taste = tasteOf(part);
    const pctMatch = part.match(/(\d{1,3})\s*%|\b(half|quarter|three quarters)\b/);
    const pct = pctMatch ? (pctMatch[1] ? Math.min(100, Number(pctMatch[1])) : pctMatch[2] === 'half' ? 50 : pctMatch[2] === 'quarter' ? 25 : 75) : null;
    const skip = /\b(skip|skipped|missed|didn'?t eat|did not eat|no)\b/.test(part);
    const food = foodCatalog().find((f) => part.includes(f.name.toLowerCase().split(' + ')[0]));
    next = next.map((c) => {
      if (!slots.includes(c.meal.slot as never)) return c;
      understood = true;
      if (taste !== null) c = { ...c, taste };
      if (pct !== null) return { ...c, status: 'partial' as const, eatenPct: pct };
      if (food && /\b(instead|swap|swapped|replaced|had)\b/.test(part)) return { ...c, status: 'swapped' as const, swapTo: food.name };
      if (skip) return { ...c, status: 'skipped' as const };
      // only a taste was said ("lunch was a 3"): keep what it already was
      return { ...c, status: taste !== null && c.status ? c.status : ('followed' as const) };
    });
  }
  // the rest of the due meals stay "as planned"
  return { choices: next, understood };
}

/** Same idea for the training plan ("yes", "skipped the treadmill", "only 20 minutes on the cycle"). */
export function applySessionAnswer(text: string, choices: SessionChoice[]): { choices: SessionChoice[]; understood: boolean } {
  const t = text.toLowerCase();
  if (/\b(yes|yeah|yep|ok|okay|sure|correct|all|everything|as planned|done)\b/.test(t) && !/\b(but|except|only|skip|missed)/.test(t)) {
    return { choices: choices.map((c) => (c.status === null ? c : { ...c, status: 'done' })), understood: true };
  }
  const mins = t.match(/(\d{1,3})\s*(min|minutes)/);
  const skip = /\b(skip|skipped|missed|didn'?t|did not|no)\b/.test(t);
  const pickAll = !/(resist|ared|weights|aerobic|treadmill|cycle|bike|run)/.test(t);
  let understood = false;
  const next = choices.map((c) => {
    const hit = pickAll || (c.session.modality === 'resistive' ? /(resist|ared|weights)/.test(t) : /(aerobic|treadmill|cycle|bike|run)/.test(t));
    if (!hit) return c;
    if (mins) {
      understood = true;
      return { ...c, status: 'changed' as const, minutes: Number(mins[1]) };
    }
    if (skip) {
      understood = true;
      return { ...c, status: 'skipped' as const };
    }
    return c;
  });
  return { choices: next, understood };
}

const styles = StyleSheet.create({
  taste: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: { gap: 8 },
  sep: { borderTopWidth: 1, borderTopColor: C.track, paddingTop: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
