import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { BoltMascot } from '@/components/bolt-mascot';
import { Button, Card, Label, Muted, Screen } from '@/components/cosmo-ui';
import { useCrewProfile } from '@/components/crew-profile-context';
import { useDesktopLayout } from '@/components/responsive-layout';
import { C, LOGS, LOG_PATH } from '@/constants/cosmo';

export default function HomeScreen() {
  const [logOpen, setLogOpen] = useState(false);
  const { profile } = useCrewProfile();
  const desktop = useDesktopLayout();
  const { width: screenWidth } = useWindowDimensions();
  const walkDistance = Math.max(80, Math.min(screenWidth - (desktop ? 500 : 170), 760));
  const walk = useSharedValue(0);
  const walkStyle = useAnimatedStyle(() => ({ transform: [{ translateX: walk.value }] }));
  useEffect(() => {
    // Reanimated shared values start on the client after SSR; keep the walking loop out of server rendering.
    // eslint-disable-next-line react-hooks/immutability
    walk.value = withRepeat(withSequence(withTiming(walkDistance, { duration: 8400 }), withTiming(0, { duration: 8400 })), -1, false);
    return () => cancelAnimation(walk);
  }, [walk, walkDistance]);

  return <Screen>
    <View style={styles.topline}>
      <View style={styles.topActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir registros diários" accessibilityState={{ expanded: logOpen }} onPress={() => setLogOpen((open) => !open)} style={styles.logMenuButton}>
          <View style={styles.logRing}><Text style={styles.logMenuCount}>3/7</Text></View><Text style={styles.logMenuText}>Log</Text><Text style={styles.logMenuArrow}>{logOpen ? '⌃' : '⌄'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir calendário da missão" onPress={() => router.push('/calendar')} style={styles.calendarButton}><Text style={styles.calendarGlyph}>▦</Text></Pressable>
      </View>
      <View style={styles.coins}><Text style={{ color: C.gold }}>⊕</Text><Text style={styles.coinText}>1,250</Text></View>
    </View>

    <View style={styles.sceneWrap}>
      <View style={[styles.station, desktop && styles.stationDesktop]}>
        <View style={styles.windowFrame}><View style={styles.window}><View style={styles.earthGlow} /><View style={styles.earth}><View style={styles.earthLandOne} /><View style={styles.earthLandTwo} /><View style={styles.earthCloud} /></View><View style={[styles.star, { left: '14%', top: '18%' }]} /><View style={[styles.star, { left: '35%', top: '31%' }]} /><View style={[styles.star, { right: '19%', top: '15%' }]} /><View style={[styles.star, { right: '33%', top: '45%' }]} /></View></View>
        <View style={styles.leftConsole}><View style={styles.consoleScreen}><View style={styles.consoleLine} /><View style={[styles.consoleLine, { width: '64%' }]} /><View style={[styles.consoleLine, { width: '82%', backgroundColor: C.purple }]} /><View style={styles.consoleReadout}><Text style={styles.consoleText}>LIFE SUPPORT</Text><Text style={styles.consoleValue}>NOMINAL</Text></View></View><View style={styles.consoleBase} /></View>
        <View style={styles.plant}><View style={[styles.leaf, styles.leafLeft]} /><View style={[styles.leaf, styles.leafRight]} /><View style={[styles.leaf, styles.leafTop]} /><View style={styles.plantStem} /><View style={styles.plantPot} /></View>
        <View style={styles.floorLine} /><View style={styles.floor} />
        <Animated.View style={[styles.walkingBolt, walkStyle]}><BoltMascot /></Animated.View>
        <View style={styles.orbiDrone}><View style={styles.droneAntenna} /><View style={styles.droneBody}><View style={styles.droneEye} /><View style={styles.droneEye} /></View></View>
        <View style={styles.orbiBubble}><Text style={styles.orbiText}><Text style={{ color: C.teal, fontWeight: '900' }}>Orbi:</Text> sleep was short last night. Wind down at 21:00?</Text></View>
        <View style={styles.greeting}><Text style={styles.greetingText}>Hi, Commander <Text style={{ color: C.purple }}>{profile?.name.split(' ')[0] || 'Ana'}</Text></Text><View style={styles.missionProgress}><Text style={styles.missionText}>{profile?.mission || 'Orbit-3'} · Day 12 of {profile?.missionDays || '30'}</Text><View style={styles.progressTrack}><View style={styles.progressFill} /></View></View></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/status')} style={styles.health}><Text style={{ color: C.teal }}>▮▮▮</Text><Text style={styles.healthText}>Stable 72</Text></Pressable>
      </View>
      {logOpen ? <Card style={[styles.logDropdown, desktop && styles.logDropdownDesktop]}>
        {LOGS.map((log, i) => <Pressable key={log.key} accessibilityRole="button" onPress={() => { setLogOpen(false); router.push(LOG_PATH[log.key] as never); }} style={({ pressed }) => [styles.logRow, i < LOGS.length - 1 && styles.logBorder, pressed && { opacity: 0.7 }]}>
          <View style={styles.logIcon}><Text style={styles.logGlyph}>{log.icon}</Text></View><Text style={styles.logTitle}>{log.title.replace(' check-in', '')}</Text><Text style={[styles.logStatus, log.status === 'Done' ? styles.done : styles.pending]}>{log.status === 'Done' ? '✓ Done' : log.key === 'relax' ? '›' : 'Log now'}</Text>
        </Pressable>)}
      </Card> : null}
    </View>

    <Card style={styles.orbiHint}><View style={styles.orbiBadge}><Text style={styles.orbiBadgeText}>O</Text></View><View style={{ flex: 1, gap: 3 }}><Label>Orbi noticed a pattern</Label><Muted>Your sleep was short last night. Want to wind down at 21:00?</Muted></View><Pressable accessibilityRole="button" onPress={() => router.push('/orbi')}><Text style={{ color: C.teal, fontWeight: '800' }}>›</Text></Pressable></Card>
    <View style={styles.actions}><Button title="View crew status" secondary onPress={() => router.push('/status')} /><Button title="Open mission calendar  ›" secondary onPress={() => router.push('/calendar')} /></View>
  </Screen>;
}

const styles = StyleSheet.create({
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, zIndex: 5 }, topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, logMenuButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderRadius: 25, borderWidth: 1, borderColor: C.border, backgroundColor: C.background }, logRing: { width: 30, height: 30, borderRadius: 16, borderWidth: 4, borderColor: C.teal, alignItems: 'center', justifyContent: 'center' }, logMenuCount: { color: C.text, fontSize: 9, fontWeight: '900' }, logMenuText: { color: C.text, fontSize: 14, fontWeight: '800' }, logMenuArrow: { color: C.muted, fontSize: 17 }, calendarButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: C.background, borderColor: C.border, borderWidth: 1 }, calendarGlyph: { color: C.text, fontSize: 21 }, coins: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 30, backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }, coinText: { color: C.text, fontWeight: '800', fontSize: 15 },
  sceneWrap: { position: 'relative', zIndex: 2 }, station: { height: 590, borderRadius: 26, borderWidth: 2, borderColor: '#34326F', backgroundColor: '#111036', overflow: 'hidden', position: 'relative' }, stationDesktop: { height: 660 },
  windowFrame: { position: 'absolute', top: 26, left: '11%', right: '7%', height: '57%', borderRadius: 90, borderWidth: 14, borderColor: '#29265D', padding: 4, backgroundColor: '#161447' }, window: { flex: 1, overflow: 'hidden', borderRadius: 75, backgroundColor: '#050617' }, earthGlow: { position: 'absolute', right: -40, bottom: -78, width: '92%', height: '78%', borderRadius: 220, backgroundColor: 'rgba(57,255,159,0.12)', shadowColor: C.teal, shadowOpacity: 0.7, shadowRadius: 30 }, earth: { position: 'absolute', right: -45, bottom: -116, width: '90%', height: '83%', borderRadius: 260, backgroundColor: '#2468D0', borderTopWidth: 8, borderColor: '#4B9DDE', overflow: 'hidden' }, earthLandOne: { position: 'absolute', width: '43%', height: '26%', top: '18%', left: '15%', borderRadius: 90, backgroundColor: '#36B18E', transform: [{ rotate: '-18deg' }] }, earthLandTwo: { position: 'absolute', width: '50%', height: '22%', top: '40%', right: '7%', borderRadius: 90, backgroundColor: '#359C7C', transform: [{ rotate: '12deg' }] }, earthCloud: { position: 'absolute', width: '82%', height: 4, top: '53%', left: '8%', borderRadius: 8, backgroundColor: 'rgba(230,247,255,0.45)', transform: [{ rotate: '-14deg' }] }, star: { position: 'absolute', width: 4, height: 4, borderRadius: 3, backgroundColor: C.text, shadowColor: C.text, shadowOpacity: 0.8, shadowRadius: 5 },
  leftConsole: { position: 'absolute', left: 18, bottom: 118, width: 145, height: 116, alignItems: 'center' }, consoleScreen: { width: 145, height: 100, borderRadius: 17, borderWidth: 2, borderColor: '#47438E', backgroundColor: '#1D1B4E', padding: 14, gap: 7 }, consoleLine: { height: 8, width: '88%', borderRadius: 5, backgroundColor: C.teal }, consoleReadout: { marginTop: 4, gap: 1 }, consoleText: { color: C.muted, fontSize: 7, letterSpacing: 1, fontWeight: '800' }, consoleValue: { color: C.green, fontSize: 9, fontWeight: '900' }, consoleBase: { width: 104, height: 8, backgroundColor: '#8275E7', borderRadius: 5 },
  plant: { position: 'absolute', right: '7%', bottom: 110, width: 92, height: 195, alignItems: 'center' }, leaf: { position: 'absolute', width: 50, height: 75, borderRadius: 38, backgroundColor: '#43D59E' }, leafLeft: { top: 44, left: 0, transform: [{ rotate: '-36deg' }] }, leafRight: { top: 26, right: 0, transform: [{ rotate: '36deg' }] }, leafTop: { top: 0, left: 25, width: 43, height: 83, transform: [{ rotate: '5deg' }] }, plantStem: { position: 'absolute', top: 38, width: 4, height: 90, backgroundColor: '#9AF5C2' }, plantPot: { position: 'absolute', bottom: 0, width: 88, height: 64, borderRadius: 15, borderWidth: 2, borderColor: '#5B55B1', backgroundColor: '#3D3A83' },
  floorLine: { position: 'absolute', left: 0, right: 0, bottom: 127, height: 4, backgroundColor: C.teal, shadowColor: C.teal, shadowOpacity: 0.9, shadowRadius: 12, elevation: 8 }, floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 127, backgroundColor: '#1A174B' }, walkingBolt: { position: 'absolute', bottom: 145, left: 26, zIndex: 3 },
  orbiDrone: { position: 'absolute', right: '18%', bottom: 255, alignItems: 'center' }, droneAntenna: { width: 2, height: 13, backgroundColor: C.purple }, droneBody: { width: 58, height: 50, borderRadius: 27, backgroundColor: '#171642', borderWidth: 4, borderColor: C.purple, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, droneEye: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.teal }, orbiBubble: { position: 'absolute', right: 16, bottom: 310, maxWidth: 300, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: C.teal, backgroundColor: '#18163E' }, orbiText: { color: C.text, fontSize: 12, lineHeight: 18 },
  greeting: { position: 'absolute', left: 20, bottom: 22, gap: 8, zIndex: 4 }, greetingText: { color: C.text, fontSize: 25, fontWeight: '900' }, missionProgress: { flexDirection: 'row', alignItems: 'center', gap: 12 }, missionText: { color: C.muted, fontSize: 13 }, progressTrack: { width: 100, height: 7, borderRadius: 6, backgroundColor: '#312E69', overflow: 'hidden' }, progressFill: { width: '42%', height: '100%', borderRadius: 6, backgroundColor: C.teal }, health: { position: 'absolute', right: 20, bottom: 24, flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#4A438B', borderRadius: 16, backgroundColor: '#1E1B4E', zIndex: 4 }, healthText: { color: C.text, fontWeight: '800', fontSize: 13 },
  logDropdown: { position: 'absolute', left: 0, top: 0, width: '88%', padding: 0, borderRadius: 21, zIndex: 20, backgroundColor: 'rgba(17,16,54,0.97)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 }, logDropdownDesktop: { width: 590 }, logRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14 }, logBorder: { borderBottomWidth: 1, borderBottomColor: C.border }, logIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#29265D' }, logGlyph: { color: C.purple, fontSize: 18 }, logTitle: { color: C.text, fontWeight: '700', fontSize: 14, flex: 1 }, logStatus: { fontSize: 13, fontWeight: '800' }, done: { color: C.green }, pending: { color: C.gold },
  orbiHint: { flexDirection: 'row', alignItems: 'center', gap: 11, borderColor: '#2C7D79' }, orbiBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' }, orbiBadgeText: { color: C.background, fontWeight: '900', fontSize: 18 }, actions: { gap: 9 },
});
