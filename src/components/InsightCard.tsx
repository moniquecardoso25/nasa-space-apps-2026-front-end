import { StyleSheet, View } from 'react-native';

import { getInsight } from '@/data/api';
import { useData } from '@/data/store';
import type { InsightCategory } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';

import { Icon } from './Icon';
import { Txt } from './Txt';

/** Generic line when there is no insight yet (new crew member, no logs). */
export const NO_INSIGHT = 'Not enough data yet. After a few days of check-ins Orbi will point out patterns here.';

/**
 * Orbi's insight for an area, last item of the Sleep / Mood / Body / Meals screens.
 * Text comes from the data (backend later); `fallback` is used when there is none.
 */
export function InsightCard({ category, fallback = NO_INSIGHT }: { category: InsightCategory; fallback?: string }) {
  const insight = useData(() => getInsight(category));
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon name="orbi" size={18} color={C.teal} />
        </View>
        <Txt heading weight="700" size={tokens.font.size.body}>
          Orbi insight
        </Txt>
      </View>
      <Txt size={tokens.font.size.small} lh={1.45}>
        {insight?.text ?? fallback}
      </Txt>
      <Txt size={tokens.font.size.tiny} color={C.muted}>
        Based on your recent logs · not a diagnosis
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 14, borderRadius: tokens.radius.card, borderWidth: 1, borderColor: C.teal, backgroundColor: X.tealSoft },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
});
