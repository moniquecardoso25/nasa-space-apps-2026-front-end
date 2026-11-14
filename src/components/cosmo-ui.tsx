import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/constants/cosmo';
import { useDesktopLayout } from '@/components/responsive-layout';

export function Screen({ children }: PropsWithChildren) {
  const desktop = useDesktopLayout();
  return <SafeAreaView style={ui.safe} edges={['top']}><ScrollView contentContainerStyle={[ui.content, desktop ? ui.desktopContent : ui.mobileContent]} showsVerticalScrollIndicator={false}>{children}</ScrollView></SafeAreaView>;
}

export function Heading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <View style={ui.heading}>{action ? <View style={ui.actionRow}>{action}</View> : null}{eyebrow ? <Text style={ui.eyebrow}>{eyebrow}</Text> : null}<Text style={ui.title}>{title}</Text>{subtitle ? <Text style={ui.subtitle}>{subtitle}</Text> : null}</View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) { return <View style={[ui.card, style]}>{children}</View>; }
export function Label({ children, style }: PropsWithChildren<{ style?: object }>) { return <Text style={[ui.label, style]}>{children}</Text>; }
export function Muted({ children, style }: PropsWithChildren<{ style?: object }>) { return <Text style={[ui.muted, style]}>{children}</Text>; }

export function Button({ title, onPress, secondary, disabled, style }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; style?: object }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [ui.button, secondary && ui.buttonSecondary, disabled && ui.disabled, pressed && ui.pressed, style]}><Text style={[ui.buttonText, secondary && ui.buttonSecondaryText]}>{title}</Text></Pressable>;
}

export function Chip({ title, active, onPress, disabled }: { title: string; active?: boolean; onPress?: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={disabled} onPress={onPress} style={[ui.chip, active && ui.chipActive, disabled && ui.disabled]}><Text style={[ui.chipText, active && ui.chipTextActive]}>{title}</Text></Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' }) {
  return <View style={ui.fieldWrap}><Text style={ui.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} keyboardType={keyboardType} style={ui.field} /></View>;
}

export function Row({ children, style }: PropsWithChildren<{ style?: object }>) { return <View style={[ui.row, style]}>{children}</View>; }
export function Divider() { return <View style={ui.divider} />; }

const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 1360, alignSelf: 'center', gap: 16 },
  desktopContent: { paddingHorizontal: 48, paddingTop: 32, paddingBottom: 48 },
  mobileContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 152 },
  heading: { gap: 5, paddingTop: 4, paddingBottom: 5 },
  actionRow: { minHeight: 40, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  eyebrow: { color: C.teal, textTransform: 'uppercase', letterSpacing: 1.8, fontWeight: '700', fontSize: 11 },
  title: { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 17, gap: 12 },
  label: { color: C.text, fontSize: 17, fontWeight: '700' },
  muted: { color: C.muted, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: C.purple },
  buttonSecondary: { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  buttonText: { color: C.background, fontWeight: '800', fontSize: 15 },
  buttonSecondaryText: { color: C.text },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.elevated, justifyContent: 'center', paddingHorizontal: 14 },
  chipActive: { borderColor: C.teal, backgroundColor: '#123A45' },
  chipText: { color: C.muted, fontSize: 13, fontWeight: '600' }, chipTextActive: { color: C.text },
  fieldWrap: { flex: 1, gap: 7, minWidth: 120 }, fieldLabel: { color: C.muted, fontSize: 12, fontWeight: '600' },
  field: { backgroundColor: C.background, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 14, minHeight: 48, paddingHorizontal: 13, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }, divider: { height: 1, backgroundColor: C.border },
});
