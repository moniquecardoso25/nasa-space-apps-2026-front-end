import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Segmented } from '@/components/Inputs';
import { LogScreen } from '@/components/LogKit';
import { HelmetIcon } from '@/components/ShopArt';
import { Txt } from '@/components/Txt';
import { getCurrentAstronautId, getLeaderboard, type LeaderboardMode } from '@/data/api';
import { formatCoins } from '@/data/format';
import { HELMET_COLOR } from '@/data/shopArt';
import { useData } from '@/data/store';
import { C, X, tokens } from '@/theme/tokens';

const PODIUM_H = [120, 150, 95]; // 2nd, 1st, 3rd (AppLeaderboard)

/** Leaderboard: Daily logs / Coins, podium top 3, list, how it counts. */
export default function Leaderboard() {
  const [mode, setMode] = useState<LeaderboardMode>('logs');
  const { rows, me } = useData(() => ({ rows: getLeaderboard(mode), me: getCurrentAstronautId() }), [mode]);
  const unit = (v: number) => (mode === 'logs' ? `${v} logs` : `${formatCoins(v)} coins`);
  const name = (r: (typeof rows)[number]) => `${r.astronaut.name.split(' ')[0]}${r.astronaut.id === me ? ' (you)' : ''}`;
  const podium = [rows[1], rows[0], rows[2]];

  return (
    <LogScreen title="Leaderboard" backHref="/avatar" gap={16}>
      <Segmented
        items={[
          { value: 'logs', label: 'Daily logs' },
          { value: 'coins', label: 'Coins' },
        ]}
        selected={mode}
        onChange={setMode}
      />
      <View style={styles.podium}>
        {podium.map((r, i) =>
          r ? (
            <View key={r.astronaut.id} style={styles.col} accessibilityLabel={`#${r.rank} ${name(r)}, ${unit(r.value)}`}>
              <HelmetIcon color={HELMET_COLOR[r.astronaut.avatar.equipped.helmet]} size={r.rank === 1 ? 44 : 38} />
              <Txt weight="700" size={tokens.ext.fontSize.label} numberOfLines={1}>
                {name(r)}
              </Txt>
              <View style={styles.row4}>
                <Icon name={mode === 'logs' ? 'check' : 'coin'} size={14} color={mode === 'logs' ? C.teal : C.gold} strokeWidth={mode === 'logs' ? 2.5 : 2} />
                <Txt size={tokens.font.size.small} color={C.muted}>
                  {unit(r.value)}
                </Txt>
              </View>
              <View style={[styles.block, { height: PODIUM_H[i] }, r.rank === 1 && styles.first]}>
                <Txt heading weight="700" size={tokens.font.size.title} color={r.rank === 1 ? C.gold : C.text}>
                  {r.rank}
                </Txt>
              </View>
            </View>
          ) : (
            <View key={i} style={styles.col} />
          ),
        )}
      </View>
      {rows.length > 3 ? (
        <Card gap={0} padding={14} shadow={false}>
          {rows.slice(3).map((r, i) => (
            <View key={r.astronaut.id} style={[styles.listRow, i > 0 && styles.sep]}>
              <Txt weight="700" size={tokens.font.size.body} color={C.muted} style={{ width: 22 }}>
                {r.rank}
              </Txt>
              <HelmetIcon color={HELMET_COLOR[r.astronaut.avatar.equipped.helmet]} size={28} />
              <Txt weight="600" size={tokens.font.size.body} style={{ flex: 1 }}>
                {name(r)}
              </Txt>
              <Icon name={mode === 'logs' ? 'check' : 'coin'} size={14} color={mode === 'logs' ? C.teal : C.gold} />
              <Txt size={tokens.font.size.small} color={C.muted}>
                {unit(r.value)}
              </Txt>
            </View>
          ))}
        </Card>
      ) : null}
      <View style={styles.note}>
        <Icon name="coin" size={12} color={C.gold} />
        <Txt size={tokens.font.size.small} lh={1.45} style={{ flex: 1 }}>
          {mode === 'logs'
            ? 'Ranked by logs completed (mood, sleep, radiation, body, meals, exercise). Every log also earns coins to spend in the shop.'
            : 'Ranked by coins you have now. Every saved log earns +10; shop purchases spend them.'}
        </Txt>
      </View>
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  block: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 10,
    borderTopLeftRadius: tokens.radius.card,
    borderTopRightRadius: tokens.radius.card,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.border,
  },
  first: { backgroundColor: X.podiumGold, borderColor: C.gold },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderTopColor: C.track },
  note: { flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: tokens.radius.item, backgroundColor: C.primarySoft },
});
