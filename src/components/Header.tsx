import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, tokens } from '@/theme/tokens';

import { Icon } from './Icon';
import { Txt } from './Txt';

type Props = { title: string; onBack?: () => void; right?: ReactNode; backHref?: string };

/** 44×44 glass back button + centered Sora title. */
export function Header({ title, onBack, right, backHref }: Props) {
  const back = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace((backHref ?? '/home') as never);
  };
  return (
    <View style={styles.row}>
      <BackButton onPress={back} />
      <Txt heading weight="700" size={tokens.font.size.screenTitle} align="center" style={styles.title} numberOfLines={1}>
        {title}
      </Txt>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
      <Icon name="chevronLeft" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 4 },
  title: { flex: 1 },
  right: { width: tokens.size.touch, alignItems: 'flex-end' },
  back: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    borderRadius: tokens.radius.item,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
