import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, X, tokens } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Rendered above the scroll area (e.g. <Header/>). */
  header?: ReactNode;
  /** Sticky footer (bg `bg`, top border, shadow). */
  footer?: ReactNode;
  /** Set false for screens that manage their own layout (Home scene). */
  scroll?: boolean;
  gap?: number;
  padded?: boolean;
  contentStyle?: ViewStyle;
  /** Extra bottom space when a floating tab bar sits over the content. */
  tabBar?: boolean;
};

export function Screen({ children, header, footer, scroll = true, gap = 12, padded = false, contentStyle, tabBar }: Props) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        { gap, paddingTop: 8, paddingBottom: tabBar ? 16 : 18 },
        padded && { paddingHorizontal: tokens.space.screenX },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {header}
      {body}
      {footer ? <Footer bottomInset={insets.bottom}>{footer}</Footer> : null}
    </View>
  );
}

export function Footer({ children, bottomInset = 0 }: { children: ReactNode; bottomInset?: number }) {
  return <View style={[styles.footer, { paddingBottom: 16 + bottomInset }]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  footer: {
    paddingTop: 10,
    paddingHorizontal: tokens.space.screenX,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: X.borderSoft,
    boxShadow: tokens.shadow.footer,
  },
});
