import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { C, tokens } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

type CardProps = { children: ReactNode; padding?: number; style?: ViewStyle; gap?: number; shadow?: boolean };

/** Glass surface + 1px border, radius 18, card shadow. */
export function Card({ children, padding = 14, style, gap = 8, shadow = true }: CardProps) {
  return <View style={[styles.card, { padding, gap }, shadow && styles.shadow, style]}>{children}</View>;
}

/** Card title row: Sora 14 bold + optional right element. */
export function CardTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <Txt heading weight="700" size={tokens.ext.fontSize.label} style={{ flex: 1 }}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

/** Small stat tile: big value + muted caption. */
export function StatTile({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.tile}>
      <Txt weight="700" size={tokens.ext.fontSize.stat} color={color}>
        {value}
      </Txt>
      <Txt size={tokens.font.size.caption} color={C.muted}>
        {label}
      </Txt>
    </View>
  );
}

/** Lilac-soft info row ("Orbi: ..." tips, read-only notes). */
export function InfoNote({
  children,
  icon = 'orbi',
  iconColor = C.primary,
  size = 13,
  onPress,
}: {
  children: ReactNode;
  icon?: IconName;
  iconColor?: string;
  size?: number;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Icon name={icon} size={size > 12 ? 20 : 16} color={iconColor} />
      <Txt size={size} lh={1.45} style={{ flex: 1 }}>
        {children}
      </Txt>
    </>
  );
  if (onPress)
    return (
      <Pressable onPress={onPress} style={styles.note}>
        {content}
      </Pressable>
    );
  return <View style={styles.note}>{content}</View>;
}

/** Section label above a group of inputs (13 bold muted). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Txt weight="700" size={tokens.font.size.small} color={C.muted}>
      {children}
    </Txt>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: tokens.radius.card,
  },
  shadow: { boxShadow: tokens.shadow.card },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tile: {
    flex: 1,
    padding: 10,
    borderRadius: tokens.radius.item,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 2,
  },
  note: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.item,
    backgroundColor: C.primarySoft,
  },
});
