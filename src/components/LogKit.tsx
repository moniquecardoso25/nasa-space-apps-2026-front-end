import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { getLastSaved } from '@/data/api';
import { useData } from '@/data/store';
import type { LogType } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';

import { CoinIcon, PrimaryButton } from './Buttons';
import { Header } from './Header';
import { Icon, type IconName } from './Icon';
import { Screen } from './Screen';
import { Txt } from './Txt';

/** Log screen: header with back + scroll content + sticky footer. */
export function LogScreen({
  title,
  footer,
  children,
  gap = 12,
  backHref = '/home',
}: {
  title: string;
  footer?: ReactNode;
  children: ReactNode;
  gap?: number;
  backHref?: string;
}) {
  return (
    <Screen header={<Header title={title} backHref={backHref} />} footer={footer} padded gap={gap}>
      {children}
    </Screen>
  );
}

/** Back to the screen that opened the form (or the given overview). */
export function goBackTo(href: string) {
  if (router.canGoBack()) router.back();
  else router.replace(href as never);
}

/** Sticky "Save … +10" button for add forms. */
export function SaveButton({ label, onPress, reward = 10, disabled }: { label: string; onPress: () => void; reward?: number; disabled?: boolean }) {
  return <PrimaryButton label={label} reward={reward || undefined} onPress={onPress} disabled={disabled} />;
}

/** "Saved · +10" banner shown on an overview right after a save (5 s). */
export function SavedBanner({ types }: { types: LogType[] }) {
  const [info, setInfo] = useState<{ coins: number } | null>(null);
  const saved = useData(() => getLastSaved());
  const at = saved?.at;
  useEffect(() => {
    const s = getLastSaved();
    if (s && types.includes(s.type) && Date.now() - s.at < 5000) {
      setInfo({ coins: s.coins });
      const t = setTimeout(() => setInfo(null), 5000 - (Date.now() - s.at));
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  if (!info) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.saved}>
      <Icon name="check" size={16} color={C.holoOk} strokeWidth={3} />
      <Txt weight="700" size={tokens.font.size.small} color={C.holoOk} style={{ flex: 1 }}>
        {info.coins ? 'Saved · logged today' : 'Changes saved'}
      </Txt>
      {info.coins ? (
        <View style={styles.row4}>
          <Txt weight="700" size={tokens.font.size.small}>
            +{info.coins}
          </Txt>
          <CoinIcon size={16} />
        </View>
      ) : null}
    </View>
  );
}

/** 36×36 icon tile + title (+ inline small) + subtitle + right content. */
export function ListRow({
  icon,
  iconColor = C.primary,
  iconBg = C.primarySoft,
  title,
  titleSmall,
  sub,
  subColor = C.muted,
  subIcon,
  right,
  first,
  onPress,
}: {
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
  title: string;
  titleSmall?: string;
  sub?: string;
  subColor?: string;
  subIcon?: IconName;
  right?: ReactNode;
  first?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={[styles.tile, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="700" size={tokens.ext.fontSize.label} numberOfLines={1}>
          {title}
          {titleSmall ? (
            <Txt weight="500" size={tokens.font.size.tiny} color={C.muted}>
              {' '}
              {titleSmall}
            </Txt>
          ) : null}
        </Txt>
        {sub ? (
          <View style={styles.row4}>
            {subIcon ? <Icon name={subIcon} size={12} color={subColor} strokeWidth={2.5} /> : null}
            <Txt weight={subIcon ? '600' : '400'} size={tokens.font.size.caption} color={subColor} numberOfLines={1} style={{ flexShrink: 1 }}>
              {sub}
            </Txt>
          </View>
        ) : null}
      </View>
      {right}
    </>
  );
  const style = [styles.listRow, !first && styles.sep];
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={style}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

/** Small glass tile: icon + label, big value (ARCHeR band data). */
export function MetricTile({ icon, label, value, color = C.text }: { icon: IconName; label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.row4, { gap: 6 }]}>
        <Icon name={icon} size={14} color={C.primary} />
        <Txt size={tokens.font.size.tiny} color={C.muted}>
          {label}
        </Txt>
      </View>
      <Txt weight="700" size={tokens.font.size.body} color={color}>
        {value}
      </Txt>
    </View>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/** Star rating (display or input). */
export function Stars({ value, size = 13, onChange, gap = 2 }: { value: number; size?: number; onChange?: (v: number) => void; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap }} accessibilityLabel={`Taste ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        const star = (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill={on ? C.gold : 'none'} stroke={on ? C.gold : onChange ? C.track : C.gold} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
          </Svg>
        );
        return onChange ? (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} stars`}
            accessibilityState={{ selected: n === value }}
            onPress={() => onChange(n)}
            style={styles.starBtn}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

/** Colored note box (warning = menu fatigue, danger = severe injury, info = lilac). */
export function Note({ tone = 'info', icon, children }: { tone?: 'info' | 'warning' | 'danger' | 'muted'; icon?: IconName; children: ReactNode }) {
  const map = {
    info: { bg: C.primarySoft, border: 'transparent', color: C.teal, icon: 'orbi' as IconName },
    warning: { bg: X.warningSoft, border: 'transparent', color: C.warning, icon: 'alert' as IconName },
    danger: { bg: X.dangerNote, border: X.dangerNoteBorder, color: C.danger, icon: 'alert' as IconName },
    muted: { bg: C.primarySoft, border: 'transparent', color: C.gold, icon: 'alert' as IconName },
  }[tone];
  return (
    <View style={[styles.note, { backgroundColor: map.bg, borderColor: map.border, borderWidth: tone === 'danger' ? 1 : 0 }]}>
      <Icon name={icon ?? map.icon} size={16} color={map.color} />
      <Txt size={tokens.font.size.caption} lh={1.45} style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  );
}

/** "Coming soon" banner for greyed screens. */
export function ComingSoon({ children }: { children: ReactNode }) {
  return (
    <View style={[styles.note, { backgroundColor: C.surface, alignItems: 'center' }]}>
      <Icon name="lock" size={16} color={C.muted} />
      <Txt size={tokens.font.size.small} lh={1.35} style={{ flex: 1 }}>
        <Txt weight="700" size={tokens.font.size.small}>
          Coming soon.{' '}
        </Txt>
        {children}
      </Txt>
    </View>
  );
}

/** Greyed, non-interactive wrapper (opacity 0.4 + grayscale). */
export function Greyed({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View aria-disabled pointerEvents="none" style={[{ opacity: 0.4, filter: 'grayscale(1)' } as ViewStyle, style]}>
      {children}
    </View>
  );
}

/** Duration stepper (− 30 min +). */
export function Stepper({ value, onChange, step = 5, min = 5, max = 240, unit = 'min' }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string }) {
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Minus ${step} ${unit}`} onPress={() => onChange(Math.max(min, value - step))} style={styles.stepBtn}>
        <Icon name="minus" size={20} />
      </Pressable>
      <Txt heading weight="700" size={tokens.font.size.display} accessibilityLiveRegion="polite">
        {value} {unit}
      </Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={`Plus ${step} ${unit}`} onPress={() => onChange(Math.min(max, value + step))} style={styles.stepBtn}>
        <Icon name="plus" size={20} />
      </Pressable>
    </View>
  );
}

/** Labeled group of controls (title 13 bold muted or 14 bold white). */
export function Group({ title, strong, right, children }: { title: string; strong?: boolean; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt weight="700" size={strong ? tokens.ext.fontSize.label : tokens.font.size.small} color={strong ? C.text : C.muted}>
          {title}
        </Txt>
        {right}
      </View>
      {children}
    </View>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>;
}

const styles = StyleSheet.create({
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.item,
    backgroundColor: X.holoOkSoft,
    borderWidth: 1,
    borderColor: C.holoOk,
  },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tile: { width: 36, height: 36, borderRadius: tokens.radius.small, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  sep: { borderTopWidth: 1, borderTopColor: C.track },
  metric: {
    flexBasis: '45%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.item,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  starBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: tokens.radius.item },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.item,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
