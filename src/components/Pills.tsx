import { StyleSheet, View } from 'react-native';

import type { Level } from '@/data/types';
import { formatCoins } from '@/data/format';
import { C, X, tokens } from '@/theme/tokens';

import { Icon } from './Icon';
import { Txt } from './Txt';

export const levelColor = (l: Level) => (l === 'ok' ? C.holoOk : l === 'warn' ? C.holoWarn : C.holoAlert);

/** Glass pill with gold coin icon. */
export function CoinsPill({ amount }: { amount: number }) {
  return (
    <View accessibilityLabel={`${formatCoins(amount)} coins`} style={styles.coins}>
      <Icon name="coin" size={18} color={C.gold} />
      <Txt weight="700" size={tokens.ext.fontSize.label}>
        {formatCoins(amount)}
      </Txt>
    </View>
  );
}

/** ok green, warn yellow, alert pink. */
export function StatusDot({ state, size = 10 }: { state: Level; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: levelColor(state) }} />;
}

/** Outline pill with a level color (e.g. "Healing", "Due today"). */
export function TodayChip({ state, label }: { state: Level | 'muted'; label: string }) {
  const color = state === 'muted' ? C.muted : levelColor(state);
  return (
    <View style={[styles.today, { borderColor: color }]}>
      <Txt weight="700" size={tokens.font.size.caption} color={color}>
        {label}
      </Txt>
    </View>
  );
}

/** Status tag shown instead of an overall score: dot + "Doing well" / "Attention" / "Alert". */
export function HealthTag({ level, label }: { level: Level; label: string }) {
  const color = levelColor(level);
  return (
    <View accessibilityLabel={`Status: ${label}`} style={[styles.today, styles.tag, { borderColor: color }]}>
      <StatusDot state={level} size={8} />
      <Txt weight="700" size={tokens.font.size.small} color={color}>
        {label}
      </Txt>
    </View>
  );
}

/** "Temporary" notice wherever the app listens: today's speech-recognition model is provisional; a better one will replace it. */
export function PrototypeTag({ label = 'Temporary speech recognition · a better model will replace it' }: { label?: string }) {
  return (
    <View accessibilityLabel={label} style={[styles.badge, styles.proto]}>
      <Txt weight="600" size={tokens.font.size.tiny} color={C.gold}>
        {label}
      </Txt>
    </View>
  );
}

/** Small muted badge ("Prefilled by ARCHeR wrist band", "Coming soon"). */
export function Badge({ label, color = C.muted, bg = X.mutedSoft }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Txt size={tokens.font.size.tiny} color={color}>
        {label}
      </Txt>
    </View>
  );
}

export function Legend({ note }: { note?: string }) {
  const items: [Level, string][] = [
    ['ok', 'OK'],
    ['warn', 'Attention'],
    ['alert', 'Alert'],
  ];
  return (
    <View style={styles.legend}>
      {items.map(([l, t]) => (
        <View key={l} style={styles.legendItem}>
          <StatusDot state={l} />
          <Txt size={tokens.font.size.caption} color={C.muted}>
            {t}
          </Txt>
        </View>
      ))}
      {note ? (
        <Txt size={tokens.font.size.caption} color={C.muted}>
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  today: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: tokens.radius.pill, borderWidth: 1 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  proto: { alignSelf: 'flex-start', backgroundColor: X.goldSoft, borderWidth: 1, borderColor: X.goldBannerBorder },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: tokens.radius.pill },
  legend: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
