import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/cosmo';

type MenuItem = { label: string; icon: string; route: string };

const main: MenuItem[] = [
  { label: 'Home', icon: 'H', route: '/home' },
  { label: 'Status', icon: 'S', route: '/status' },
  { label: 'Orbi AI', icon: 'O', route: '/orbi' },
  { label: 'Messages', icon: 'M', route: '/messages' },
];
const logs: MenuItem[] = [
  { label: 'Mood check-in', icon: '☺', route: '/log/mood' },
  { label: 'Sleep', icon: '☾', route: '/log/sleep' },
  { label: 'Radiation', icon: '☼', route: '/log/radiation' },
  { label: 'Meals', icon: '◒', route: '/log/meals' },
  { label: 'Exercise', icon: '⌁', route: '/log/exercise' },
  { label: 'Body & injuries', icon: '♡', route: '/log/body' },
  { label: 'Relax', icon: '◌', route: '/log/relax' },
];
const crew: MenuItem[] = [
  { label: 'Calendar', icon: '▦', route: '/calendar' },
  { label: 'Avatar & shop', icon: 'A', route: '/avatar' },
  { label: 'Leaderboard', icon: '♜', route: '/leaderboard' },
];

export function AppNavigation({ desktop }: { desktop: boolean }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (route: string) => {
    setMenuOpen(false);
    if (pathname !== route) router.replace(route as never);
  };

  return <>
    {desktop ? <View style={styles.sidebar}>
      <View style={styles.brandBlock}><View style={styles.brandMark}><Text style={styles.brandMarkText}>C</Text></View><View><Text style={styles.brand}>CosmoMedic</Text><Text style={styles.mission}>ORBIT-3 · DAY 12</Text></View></View>
      <ScrollView contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>MISSION</Text>{main.map((item) => <MenuRow key={item.route} item={item} active={pathname === item.route} onPress={() => navigate(item.route)} />)}
        <Text style={styles.section}>DAILY LOGS</Text>{logs.map((item) => <MenuRow key={item.route} item={item} active={pathname === item.route} onPress={() => navigate(item.route)} compact />)}
        <Text style={styles.section}>CREW</Text>{crew.map((item) => <MenuRow key={item.route} item={item} active={pathname === item.route} onPress={() => navigate(item.route)} />)}
      </ScrollView>
      <Text style={styles.footer}>MISSION DATA · DEMO</Text>
    </View> : <View style={[styles.mobileBar, { height: 72 + insets.bottom, paddingBottom: insets.bottom + 5 }]}>
      {main.map((item) => <Pressable key={item.route} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => navigate(item.route)} style={styles.mobileItem}>
        <View style={[styles.mobileIcon, pathname === item.route && styles.mobileIconActive]}><Text style={[styles.mobileGlyph, pathname === item.route && styles.mobileGlyphActive]}>{item.icon}</Text></View>
        <Text numberOfLines={1} style={[styles.mobileLabel, pathname === item.route && styles.mobileLabelActive]}>{item.label}</Text>
      </Pressable>)}
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir menu de navegação" accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen(true)} style={styles.mobileItem}>
        <View style={[styles.mobileIcon, menuOpen && styles.mobileIconActive]}><Text style={[styles.mobileGlyph, menuOpen && styles.mobileGlyphActive]}>☰</Text></View>
        <Text style={[styles.mobileLabel, menuOpen && styles.mobileLabelActive]}>Menu</Text>
      </Pressable>
    </View>}
    <Modal visible={menuOpen} transparent animationType={desktop ? 'fade' : 'slide'} onRequestClose={() => setMenuOpen(false)}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" style={styles.backdrop} onPress={() => setMenuOpen(false)} />
        <View style={styles.sheet}>
          {!desktop ? <View style={styles.sheetHandle} /> : null}
          <View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>CosmoMedic menu</Text><Text style={styles.sheetSubtitle}>Choose a screen</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" onPress={() => setMenuOpen(false)} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <Text style={styles.section}>MISSION</Text><View style={styles.menuGrid}>{main.map((item) => <GridItem key={item.route} item={item} active={pathname === item.route} onPress={() => navigate(item.route)} />)}</View>
            <Text style={styles.section}>DAILY LOGS</Text><View style={styles.menuGrid}>{logs.map((item) => <GridItem key={item.route} item={item} active={pathname === item.route} onPress={() => navigate(item.route)} />)}</View>
            <Text style={styles.section}>CREW</Text><View style={styles.menuGrid}>{crew.map((item) => <GridItem key={item.route} item={item} active={pathname === item.route} onPress={() => navigate(item.route)} />)}</View>
            <Text style={styles.section}>ACCOUNT</Text><View style={styles.menuGrid}><GridItem item={{ label: 'Sign in / switch crew', icon: '↪', route: '/login' }} active={pathname === '/login'} onPress={() => navigate('/login')} /></View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

function GridItem({ item, active, onPress }: { item: MenuItem; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.gridItem, active && styles.gridItemActive]}><Text style={[styles.gridIcon, active && styles.menuIconActive]}>{item.icon}</Text><Text numberOfLines={1} style={[styles.gridLabel, active && styles.menuLabelActive]}>{item.label}</Text></Pressable>;
}

function MenuRow({ item, active, onPress, compact }: { item: MenuItem; active: boolean; onPress: () => void; compact?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.menuRow, compact && styles.menuRowCompact, active && styles.menuRowActive, pressed && { opacity: 0.72 }]}>
    <Text style={[styles.rowIcon, active && styles.menuIconActive]}>{item.icon}</Text><Text style={[styles.rowLabel, active && styles.menuLabelActive]}>{item.label}</Text>{active ? <View style={styles.activeDot} /> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  sidebar: { width: 248, backgroundColor: '#100F31', borderRightWidth: 1, borderRightColor: C.border, paddingTop: 26, paddingHorizontal: 15, paddingBottom: 14 }, brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 8, paddingBottom: 23 }, brandMark: { width: 38, height: 38, borderRadius: 14, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' }, brandMarkText: { color: C.background, fontWeight: '900', fontSize: 20 }, brand: { color: C.text, fontWeight: '900', fontSize: 17 }, mission: { color: C.muted, fontSize: 9, letterSpacing: 1.1, marginTop: 4, fontWeight: '700' },
  sidebarContent: { gap: 5, paddingBottom: 12 }, section: { color: C.muted, fontSize: 10, letterSpacing: 1.4, fontWeight: '800', paddingHorizontal: 10, paddingTop: 15, paddingBottom: 5 }, menuRow: { minHeight: 43, paddingHorizontal: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 11 }, menuRowCompact: { minHeight: 39 }, menuRowActive: { backgroundColor: C.elevated }, rowIcon: { width: 24, textAlign: 'center', color: C.muted, fontWeight: '800', fontSize: 15 }, rowLabel: { color: C.muted, fontSize: 13, fontWeight: '600', flex: 1 }, activeDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: C.teal }, footer: { color: C.muted, fontSize: 9, letterSpacing: 1.1, paddingHorizontal: 10, paddingTop: 10 },
  mobileBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: C.surface, borderTopColor: C.border, borderTopWidth: 1, paddingHorizontal: 4 }, mobileItem: { minWidth: 54, flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  mobileIcon: { width: 40, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, mobileIconActive: { backgroundColor: '#18394B' }, mobileGlyph: { color: C.muted, fontSize: 17, fontWeight: '800' }, mobileGlyphActive: { color: C.teal }, mobileLabel: { color: C.muted, fontSize: 9, fontWeight: '600' }, mobileLabelActive: { color: C.teal, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' }, backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4,4,20,0.74)' },
  sheet: { maxHeight: '84%', minHeight: 330, backgroundColor: C.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderWidth: 1, borderColor: C.border, paddingTop: 9, paddingHorizontal: 18, paddingBottom: 15 },
  sheetHandle: { width: 38, height: 4, borderRadius: 3, alignSelf: 'center', backgroundColor: C.border, marginBottom: 11 }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }, sheetTitle: { color: C.text, fontSize: 20, fontWeight: '800' }, sheetSubtitle: { color: C.muted, fontSize: 12, marginTop: 3 }, close: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }, closeText: { color: C.text, fontSize: 25, lineHeight: 28 },
  sheetContent: { paddingBottom: 25 }, menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, gridItem: { flexGrow: 1, flexBasis: '30%', minWidth: 100, minHeight: 72, paddingHorizontal: 7, paddingVertical: 8, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', gap: 5 }, gridItemActive: { borderColor: C.teal, backgroundColor: '#123A45' }, gridIcon: { color: C.purple, fontWeight: '800', fontSize: 18 }, gridLabel: { color: C.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' }, menuIconActive: { color: C.teal }, menuLabelActive: { color: C.text, fontWeight: '800' },
});
