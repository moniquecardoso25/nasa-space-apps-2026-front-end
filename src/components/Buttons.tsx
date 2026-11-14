import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { C, X, tokens } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

const go = (href?: string) => href && router.push(href as never);

type PrimaryProps = {
  label: string;
  reward?: number;
  onPress?: () => void;
  href?: string;
  disabled?: boolean;
  tone?: 'primary' | 'gold';
  icon?: IconName;
  style?: ViewStyle;
  /** sm = 40 h, radius 12, 13 px (inline actions like "Pair"). */
  size?: 'md' | 'sm';
};

/** Lilac CTA, radius 18, min-height 54, glow. `tone="gold"` = daily check-in style. */
export function PrimaryButton({ label, reward, onPress, href, disabled, tone = 'primary', icon, style, size = 'md' }: PrimaryProps) {
  const sm = size === 'sm';
  const gold = tone === 'gold';
  const fg = gold ? C.onGold : C.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress ?? (() => go(href))}
      style={({ pressed }) => [
        styles.primary,
        gold && { backgroundColor: C.gold, boxShadow: tokens.shadow.goldGlow },
        sm && styles.sm,
        disabled && styles.disabled,
        pressed && { opacity: 0.85 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={18} color={fg} strokeWidth={2.5} /> : null}
      <Txt weight="700" size={sm ? tokens.font.size.small : tokens.font.size.body} color={fg}>
        {label}
      </Txt>
      {reward ? <RewardChip amount={reward} color={fg} /> : null}
    </Pressable>
  );
}

type SecondaryProps = {
  label?: string;
  icon?: IconName;
  onPress?: () => void;
  href?: string;
  style?: ViewStyle;
  children?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
};

/** Glass button with 1px border, radius 18. */
export function SecondaryButton({ label, icon, onPress, href, style, children, disabled, compact }: SecondaryProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress ?? (() => go(href))}
      style={({ pressed }) => [
        styles.secondary,
        compact && { minHeight: tokens.size.touch, borderRadius: tokens.radius.item },
        disabled && styles.disabled,
        pressed && { opacity: 0.75 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={18} color={C.text} /> : null}
      {label ? (
        <Txt weight="600" size={14}>
          {label}
        </Txt>
      ) : null}
      {children}
    </Pressable>
  );
}

/** "+10" + gold coin icon (no background). */
export function RewardChip({ amount = 10, color = C.text }: { amount?: number; color?: string }) {
  return (
    <View style={styles.reward}>
      <Txt weight="700" size={tokens.ext.fontSize.label} color={color}>
        +{amount}
      </Txt>
      <CoinIcon size={18} />
    </View>
  );
}

/** Filled gold coin with dark outline (reward chips on buttons, AppSleep footer). */
export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill={C.gold} stroke={C.onGold} strokeWidth={1.5} />
      <Path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" fill="none" stroke={C.onGold} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

type LogStateProps = {
  logged: boolean;
  onLog: () => void;
  onEdit: () => void;
  logLabel?: string;
  loggedText?: string;
  editLabel?: string;
  reward?: number;
};

/**
 * Overview footer. Not logged → PrimaryButton "Log today +10".
 * Logged → green outline "✓ Logged today" + SecondaryButton "Edit" (or "Add").
 */
export function LogStateButton({
  logged,
  onLog,
  onEdit,
  logLabel = 'Log today',
  loggedText = 'Logged today',
  editLabel = 'Edit',
  reward = 10,
}: LogStateProps) {
  if (!logged) return <PrimaryButton label={logLabel} reward={reward} onPress={onLog} />;
  return (
    <View style={styles.logRow}>
      <View accessibilityRole="text" style={styles.logged}>
        <Icon name="check" size={18} color={C.holoOk} strokeWidth={3} />
        <Txt weight="700" size={tokens.font.size.body} color={C.holoOk}>
          {loggedText}
        </Txt>
      </View>
      <SecondaryButton label={editLabel} onPress={onEdit} style={{ paddingHorizontal: 18 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: tokens.size.button,
    borderRadius: tokens.radius.card,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    boxShadow: tokens.shadow.primaryGlow,
  },
  secondary: {
    minHeight: tokens.size.button,
    borderRadius: tokens.radius.card,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  sm: { minHeight: 40, borderRadius: tokens.radius.small, paddingHorizontal: 14, boxShadow: 'none' },
  disabled: { opacity: 0.45 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logRow: { flexDirection: 'row', gap: 8 },
  logged: {
    flex: 1,
    minHeight: tokens.size.button,
    borderRadius: tokens.radius.card,
    backgroundColor: X.holoOkSoft,
    borderWidth: 1,
    borderColor: C.holoOk,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
