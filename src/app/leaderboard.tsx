import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { LogScreen } from '@/components/LogKit';
import { Txt } from '@/components/Txt';
import { getAchievements, getAstronaut } from '@/data/api';
import { formatCoins } from '@/data/format';
import { useData } from '@/data/store';
import { C, X, tokens } from '@/theme/tokens';

/**
 * Achievements (route kept as /leaderboard): personal and private progress.
 * No public ranking of health logs: competing on medical records invites over-reporting
 * or hiding symptoms, and a small crew is easy to re-identify.
 */
export default function Achievements() {
  const { list, me } = useData(() => ({ list: getAchievements(), me: getAstronaut() }));
  const got = list.filter((a) => a.done).length;

  return (
    <LogScreen title="Achievements" backHref="/avatar" gap={14}>
      <Card gap={6}>
        <Txt heading weight="700" size={tokens.ext.fontSize.stat}>
          {got} of {list.length} unlocked
        </Txt>
        <Txt size={tokens.font.size.small} color={C.muted}>
          Level {me.avatar.level} · {formatCoins(me.avatar.coins)} coins to spend in the shop
        </Txt>
      </Card>
      <Card gap={0} padding={14} shadow={false}>
        {list.map((a, i) => (
          <View key={a.id} style={[styles.row, i > 0 && styles.sep]} accessibilityLabel={`${a.title}: ${a.done ? 'unlocked' : 'locked'}. ${a.text}`}>
            <View style={[styles.badge, a.done && styles.badgeOn]}>
              <Icon name={a.done ? a.icon : 'lock'} size={18} color={a.done ? C.gold : C.muted} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt weight="700" size={tokens.font.size.body} color={a.done ? C.text : C.muted}>
                {a.title}
              </Txt>
              <Txt size={tokens.font.size.caption} color={C.muted}>
                {a.text}
              </Txt>
            </View>
            {a.done ? <Icon name="check" size={16} color={C.holoOk} strokeWidth={2.5} /> : null}
          </View>
        ))}
      </Card>
      <View style={styles.note}>
        <Icon name="lock" size={14} color={C.teal} />
        <Txt size={tokens.font.size.small} lh={1.45} style={{ flex: 1 }}>
          Private: only you see this. There is no crew ranking of health logs, and missing a day never costs you anything.
        </Txt>
      </View>
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderTopColor: C.track },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: X.mutedSoft },
  badgeOn: { backgroundColor: X.goldSoft, borderWidth: 1, borderColor: C.gold },
  note: { flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: tokens.radius.item, backgroundColor: C.primarySoft },
});
