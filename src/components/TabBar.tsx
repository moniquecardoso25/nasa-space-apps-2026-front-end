import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, X, tokens } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

export const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'status', label: 'Status', icon: 'status' },
  { name: 'orbi', label: 'Orbi AI', icon: 'orbi' },
  { name: 'messages', label: 'Messages', icon: 'send' },
  { name: 'avatar', label: 'Avatar', icon: 'user' },
];

/** Floating glass pill, radius 22, 5 items; active = teal icon/text + underline + teal 12% bg. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  return (
    <View style={[styles.outer, { paddingBottom: 14 + insets.bottom }]}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {TABS.map((t) => {
          const route = state.routes.find((r) => r.name === t.name);
          if (!route) return null;
          const active = activeName === t.name;
          const color = active ? C.teal : C.muted;
          return (
            <Pressable
              key={t.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.label}
              onPress={() => {
                if (!active) navigateToTab(route.key);
              }}
              style={[styles.item, active && styles.active]}>
              <Icon name={t.icon} size={20} color={color} />
              <Txt size={tokens.font.size.tiny} weight={active ? '700' : '500'} color={color}>
                {t.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { backgroundColor: C.bg, paddingHorizontal: 12 },
  bar: {
    flexDirection: 'row',
    gap: 2,
    padding: 6,
    borderRadius: tokens.radius.tabBar,
    backgroundColor: C.surfaceSolid,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: tokens.ext.shadow.tabBar,
  },
  item: { flex: 1, minHeight: 52, borderRadius: tokens.radius.item, alignItems: 'center', justifyContent: 'center', gap: 3 },
  active: { backgroundColor: X.tealSoft, boxShadow: `inset 0 -2px 0 ${C.teal}` },
});
