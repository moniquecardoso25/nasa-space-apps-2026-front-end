import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { C, X, tokens } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

export type StepState = 'done' | 'now' | 'reading' | 'todo' | 'skipped';
export type StepItem = { key: string; label: string; icon: IconName; state: StepState; value?: string };

/**
 * Daily check-in progress: one dot per log (6), connected by a line, filling in
 * as Orbi reads the devices and as you answer (✓ + value under the label).
 */
export function CheckinSteps({ items, compact }: { items: StepItem[]; compact?: boolean }) {
  const done = items.filter((i) => i.state === 'done').length;
  return (
    <View style={{ gap: 6 }} accessibilityLabel={`Check-in progress: ${done} of ${items.length} filled`}>
      <View style={styles.row}>
        {items.map((it, i) => {
          const on = it.state === 'done';
          const now = it.state === 'now';
          return (
            <View key={it.key} style={styles.col}>
              {i > 0 ? <View style={[styles.line, styles.lineLeft, (on || now) && styles.lineOn]} /> : null}
              {i < items.length - 1 ? <View style={[styles.line, styles.lineRight, on && styles.lineOn]} /> : null}
              <View style={[styles.dot, on && styles.dotOn, now && styles.dotNow, it.state === 'skipped' && styles.dotSkip]}>
                {on ? (
                  <Icon name="check" size={14} color={C.bg} strokeWidth={3} />
                ) : it.state === 'reading' ? (
                  <ActivityIndicator size="small" color={C.teal} />
                ) : (
                  <Icon name={it.icon} size={13} color={now ? C.teal : C.muted} />
                )}
              </View>
              <Txt size={tokens.font.size.tiny} weight={now || on ? '700' : '400'} color={now ? C.text : on ? C.teal : C.muted} align="center" numberOfLines={1}>
                {it.label}
              </Txt>
              {!compact ? (
                <Txt size={10} color={it.state === 'skipped' ? C.muted : C.text} align="center" numberOfLines={1}>
                  {it.state === 'skipped' ? 'skipped' : it.state === 'reading' ? 'reading…' : (it.value ?? ' ')}
                </Txt>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${(done / Math.max(1, items.length)) * 100}%` }]} />
      </View>
    </View>
  );
}

const D = 28;
const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  col: { flex: 1, alignItems: 'center', gap: 3 },
  line: { position: 'absolute', top: D / 2 - 1, height: 2, backgroundColor: C.track },
  lineLeft: { left: 0, right: '50%' },
  lineRight: { left: '50%', right: 0 },
  lineOn: { backgroundColor: C.teal },
  dot: {
    width: D,
    height: D,
    borderRadius: D / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.track,
  },
  dotOn: { backgroundColor: C.teal, borderColor: C.teal },
  dotNow: { borderColor: C.teal, backgroundColor: X.tealSoft, boxShadow: `0 0 10px ${C.teal}` },
  dotSkip: { borderStyle: 'dashed', borderColor: C.muted },
  bar: { height: 4, borderRadius: tokens.radius.pill, backgroundColor: C.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: tokens.radius.pill, backgroundColor: C.teal },
});
