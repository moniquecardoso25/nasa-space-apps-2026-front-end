import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, X, tokens } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

export type LogMenuItem = {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  /** done → "✓ Done", todo → "Log now", soon → chevron (Relax) */
  state: 'done' | 'todo' | 'soon' | 'special';
  /** optional right text for `special` rows */
  hint?: string;
};

/** Dropdown under the Log button; rows with Done / Log now. */
export function LogMenu({ items, open, onNavigate }: { items: LogMenuItem[]; open: boolean; onNavigate?: () => void }) {
  if (!open) return null;
  return (
    <View nativeID="logmenu" style={styles.menu}>
      {items.map((it, i) => (
        <Pressable
          key={it.key}
          accessibilityRole="link"
          accessibilityLabel={`${it.label}, ${it.state === 'done' ? 'done' : it.state === 'todo' ? 'log now' : ''}`}
          onPress={() => {
            onNavigate?.();
            router.push(it.href as never);
          }}
          style={({ pressed }) => [styles.row, i > 0 && styles.sep, pressed && { backgroundColor: C.primarySoft }]}>
          <View style={[styles.iconWrap, it.state === 'special' && { backgroundColor: X.tealSoft }]}>
            <Icon name={it.icon} size={16} color={it.state === 'special' ? C.teal : C.primary} />
          </View>
          <Txt weight="600" size={tokens.ext.fontSize.label} style={{ flex: 1 }}>
            {it.label}
          </Txt>
          {it.state === 'done' ? (
            <View style={styles.done}>
              <Icon name="check" size={14} color={C.holoOk} strokeWidth={3} />
              <Txt weight="700" size={tokens.font.size.caption} color={C.holoOk}>
                Done
              </Txt>
            </View>
          ) : it.state === 'todo' ? (
            <Txt weight="700" size={tokens.font.size.caption} color={C.gold}>
              Log now
            </Txt>
          ) : it.state === 'special' ? (
            <Txt weight="700" size={tokens.font.size.caption} color={C.teal}>
              {it.hint}
            </Txt>
          ) : (
            <Icon name="chevronRight" size={16} color={C.muted} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    width: 276,
    borderRadius: tokens.radius.card,
    backgroundColor: X.menu,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: tokens.ext.shadow.menu,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 12 },
  sep: { borderTopWidth: 1, borderTopColor: C.track },
  iconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
