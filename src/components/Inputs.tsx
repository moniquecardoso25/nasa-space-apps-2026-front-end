import { Pressable, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { fontFamily } from '@/theme/fonts';
import { C, X, tokens } from '@/theme/tokens';

import { Icon } from './Icon';
import { Txt } from './Txt';

// ------------------------------------------------------------------ Chip

type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** teal (default, COMPONENTS.md) or primary (mood tags in AppMoodAdd). */
  tone?: 'teal' | 'primary';
};

/** Pill 36 h. Selected = teal 14% bg + teal border; disabled = dashed muted + ✓. */
export function Chip({ label, selected, disabled, onPress, tone = 'teal' }: ChipProps) {
  const accent = tone === 'teal' ? C.teal : C.primary;
  const soft = tone === 'teal' ? X.tealChip : C.primarySoft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: soft, borderColor: accent },
        disabled && styles.chipDisabled,
      ]}>
      {disabled ? <Icon name="check" size={14} color={C.muted} strokeWidth={2.5} /> : null}
      <Txt size={tokens.font.size.small} weight={selected ? '700' : '500'} color={disabled ? C.muted : C.text}>
        {label}
      </Txt>
    </Pressable>
  );
}

// ------------------------------------------------------------------ Segmented

type SegmentedProps<T extends string> = {
  items: { value: T; label: string }[] | readonly T[];
  selected: T;
  onChange?: (v: T) => void;
  style?: ViewStyle;
};

/** Glass track, selected = lilac bg. */
export function Segmented<T extends string>({ items, selected, onChange, style }: SegmentedProps<T>) {
  const list = (items as (T | { value: T; label: string })[]).map((i) =>
    typeof i === 'string' ? { value: i, label: i } : i,
  );
  return (
    <View accessibilityRole="tablist" style={[styles.seg, style]}>
      {list.map((it) => {
        const on = it.value === selected;
        return (
          <Pressable
            key={it.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange?.(it.value)}
            style={[styles.segItem, on && { backgroundColor: C.primary }]}>
            <Txt size={tokens.font.size.small} weight={on ? '700' : '600'} color={on ? C.onPrimary : C.muted}>
              {it.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------------ Field

type FieldProps = Omit<TextInputProps, 'value'> & {
  label?: string;
  value: string;
  unit?: string;
  readOnly?: boolean;
  style?: ViewStyle;
  multiline?: boolean;
};

/** 48 h input, radius 14. readOnly = dashed border, muted text. */
export function Field({ label, value, unit, readOnly, style, multiline, ...rest }: FieldProps) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Txt size={tokens.font.size.caption} weight="600" color={C.muted}>
          {label}
        </Txt>
      ) : null}
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          {...rest}
          value={value}
          editable={!readOnly}
          multiline={multiline}
          aria-readonly={readOnly}
          placeholderTextColor={C.muted}
          style={[
            styles.input,
            multiline && styles.textarea,
            unit ? { paddingRight: 52 } : null,
            readOnly && styles.readOnly,
          ]}
        />
        {unit ? (
          <Txt size={tokens.font.size.small} color={C.muted} style={styles.unit}>
            {unit}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ Rating

type RatingProps = {
  value: number | null;
  onChange?: (v: number) => void;
  minLabel?: string;
  maxLabel?: string;
  max?: number;
};

/** Five 46 h buttons with min/max labels. */
export function Rating({ value, onChange, minLabel, maxLabel, max = 5 }: RatingProps) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const on = n === value;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${n} of ${max}`}
              onPress={() => onChange?.(n)}
              style={[styles.rate, on && styles.rateOn]}>
              <Txt weight="700" size={tokens.font.size.body} color={on ? C.text : C.muted}>
                {n}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {minLabel || maxLabel ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt size={tokens.font.size.tiny} color={C.muted}>
            {minLabel}
          </Txt>
          <Txt size={tokens.font.size.tiny} color={C.muted}>
            {maxLabel}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ Switch

export function Toggle({ value, onChange, label }: { value: boolean; onChange?: (v: boolean) => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange?.(!value)}
      style={[styles.switch, value && { backgroundColor: C.teal }]}>
      <View style={[styles.knob, value && { transform: [{ translateX: 20 }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: tokens.size.chip,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipDisabled: { borderStyle: 'dashed', borderColor: X.readOnlyBorder, backgroundColor: X.readOnlyBg },
  seg: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: tokens.radius.item,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  segItem: { flex: 1, minHeight: 38, borderRadius: tokens.radius.item, alignItems: 'center', justifyContent: 'center' },
  input: {
    minHeight: tokens.size.input,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.item,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: tokens.font.size.body,
    fontFamily: fontFamily('body', '400'),
  },
  textarea: { minHeight: 70, paddingVertical: 12, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  readOnly: { backgroundColor: X.readOnlyBg, borderStyle: 'dashed', borderColor: X.readOnlyBorder, color: C.muted },
  unit: { position: 'absolute', right: 14 },
  rate: {
    flex: 1,
    minHeight: 46,
    borderRadius: tokens.radius.item,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateOn: { backgroundColor: C.primarySoft, borderWidth: 2, borderColor: C.primary },
  switch: { width: 48, height: 28, borderRadius: tokens.radius.pill, backgroundColor: C.track, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.text },
});
