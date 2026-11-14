import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { C } from '@/constants/cosmo';

const Holo = '#39FF9F';
const Attention = '#FFC94D';

export function AstronautHologram({ desktop = false, compact = false }: { desktop?: boolean; compact?: boolean }) {
  const [showBack, setShowBack] = useState(false);
  const rotation = useSharedValue(0);
  const bob = useSharedValue(0);
  const flipStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }] }));
  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value * 3 }] }));
  useEffect(() => {
    // Keep the hologram breathing motion on the client and out of server rendering.
    bob.value = withRepeat(withSequence(withTiming(-1, { duration: 1600 }), withTiming(1, { duration: 1600 })), -1, true);
    return () => cancelAnimation(bob);
  }, [bob]);
  const flip = () => {
    const next = !showBack;
    setShowBack(next);
    rotation.value = withTiming(next ? 180 : 0, { duration: 520 });
  };

  return <View style={[styles.wrap, desktop && styles.wrapDesktop, compact && styles.wrapCompact]}>
    <Animated.View style={bobStyle}><Animated.View style={[styles.figure, desktop && styles.figureDesktop, compact && styles.figureCompact, flipStyle]}>
      <View style={[styles.face, styles.front]}>
        <View style={styles.antenna}><View style={styles.antennaLight} /></View>
        <View style={styles.helmet}><View style={styles.helmetRim} /><View style={styles.visor}><View style={styles.visorGlint} /><View style={styles.visorEyeLeft} /><View style={styles.visorEyeRight} /></View><View style={styles.helmetSideLeft} /><View style={styles.helmetSideRight} /></View>
        <View style={[styles.signalPoint, styles.signalHead]} /><View style={[styles.signalPoint, styles.signalChest]} /><View style={[styles.signalPoint, styles.signalArm]} /><View style={[styles.signalPoint, styles.signalWrist]} /><View style={[styles.signalPoint, styles.signalLeg]} />
        <View style={styles.neck} />
        <View style={styles.packSideLeft} /><View style={styles.packSideRight} />
        <View style={styles.armLeft}><View style={styles.armStripe} /><View style={styles.glove} /></View>
        <View style={styles.armRight}><View style={[styles.armStripe, styles.goldStripe]} /><View style={[styles.glove, styles.goldGlove]} /></View>
        <View style={styles.torso}><View style={styles.collar} /><View style={styles.chestPanel}><View style={styles.panelDisplay}><View style={styles.panelLine} /><View style={[styles.panelLine, styles.panelLineShort]} /><View style={styles.panelPulse} /></View><View style={styles.panelButtonRow}><View style={styles.panelButton} /><View style={[styles.panelButton, styles.goldButton]} /><View style={styles.panelButton} /></View></View><View style={styles.torsoSeam} /><View style={styles.belt}><View style={styles.beltLatch} /></View></View>
        <View style={styles.legLeft}><View style={styles.thighStripe} /><View style={styles.kneePad} /><View style={styles.boot}><View style={styles.bootSole} /></View></View>
        <View style={styles.legRight}><View style={[styles.thighStripe, styles.goldStripe]} /><View style={[styles.kneePad, styles.goldKnee]} /><View style={[styles.boot, styles.goldBoot]}><View style={styles.bootSole} /></View></View>
        <View style={styles.baseRing} />
      </View>
      <View style={[styles.face, styles.back, styles.backFace]}>
        <View style={styles.antenna}><View style={styles.antennaLight} /></View>
        <View style={styles.helmet}><View style={styles.helmetRim} /><View style={styles.backHelmet}><View style={styles.backPanelLine} /><View style={styles.backPanelLine} /><View style={[styles.backPanelLine, styles.panelLineShort]} /></View><View style={styles.helmetSideLeft} /><View style={styles.helmetSideRight} /></View>
        <View style={[styles.signalPoint, styles.signalHead]} /><View style={[styles.signalPoint, styles.signalChest]} /><View style={[styles.signalPoint, styles.signalArm]} /><View style={[styles.signalPoint, styles.signalWrist]} /><View style={[styles.signalPoint, styles.signalLeg]} />
        <View style={styles.neck} />
        <View style={styles.packSideLeft} /><View style={styles.packSideRight} />
        <View style={styles.armLeft}><View style={styles.armStripe} /><View style={styles.glove} /></View>
        <View style={styles.armRight}><View style={[styles.armStripe, styles.goldStripe]} /><View style={[styles.glove, styles.goldGlove]} /></View>
        <View style={styles.backpack}><View style={styles.packTop} /><View style={styles.packScreen}><View style={styles.panelLine} /><View style={[styles.panelLine, styles.panelLineShort]} /><View style={styles.panelPulse} /></View><View style={styles.packTank} /><View style={[styles.packTank, styles.packTankRight]} /><View style={styles.backCable} /></View>
        <View style={styles.legLeft}><View style={styles.thighStripe} /><View style={styles.kneePad} /><View style={styles.boot}><View style={styles.bootSole} /></View></View>
        <View style={styles.legRight}><View style={[styles.thighStripe, styles.goldStripe]} /><View style={[styles.kneePad, styles.goldKnee]} /><View style={[styles.boot, styles.goldBoot]}><View style={styles.bootSole} /></View></View>
        <View style={styles.baseRing} />
      </View>
    </Animated.View></Animated.View>
    <Pressable accessibilityRole="button" accessibilityLabel={showBack ? 'Girar astronauta para ver a frente' : 'Girar astronauta para ver as costas'} onPress={flip} style={styles.flipButton}>
      <Text style={styles.flipGlyph}>↻</Text><Text style={styles.flipLabel}>{showBack ? 'Ver frente' : 'Ver costas'}</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { width: 228, height: 460, alignItems: 'center', justifyContent: 'flex-start' }, wrapDesktop: { width: 240, height: 370 }, wrapCompact: { width: 190, height: 350 },
  figure: { width: 220, height: 408, alignItems: 'center', position: 'relative' }, figureDesktop: { transform: [{ scale: 0.8 }] }, figureCompact: { transform: [{ scale: 0.72 }] },
  face: { position: 'absolute', width: 220, height: 408, alignItems: 'center' }, front: { backfaceVisibility: 'hidden' }, back: { backfaceVisibility: 'hidden' }, backFace: { transform: [{ rotateY: '180deg' }] },
  antenna: { position: 'absolute', top: -1, width: 3, height: 21, backgroundColor: Holo, alignItems: 'center', zIndex: 2 }, antennaLight: { width: 9, height: 9, borderRadius: 5, backgroundColor: Holo, marginTop: -5, shadowColor: Holo, shadowOpacity: 1, shadowRadius: 8, elevation: 7 },
  helmet: { position: 'absolute', top: 13, width: 106, height: 106, borderRadius: 56, borderWidth: 4, borderColor: Holo, backgroundColor: 'rgba(19, 72, 76, 0.62)', alignItems: 'center', justifyContent: 'center', shadowColor: Holo, shadowOpacity: 0.65, shadowRadius: 17, elevation: 9 }, helmetRim: { position: 'absolute', width: 89, height: 89, borderRadius: 46, borderWidth: 1, borderColor: 'rgba(57,255,159,0.55)' }, visor: { width: 73, height: 58, borderRadius: 32, backgroundColor: '#10243B', borderWidth: 2, borderColor: Holo, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 16 }, visorGlint: { position: 'absolute', width: 29, height: 7, top: 8, left: 10, borderRadius: 7, backgroundColor: 'rgba(57,255,159,0.43)', transform: [{ rotate: '-25deg' }] }, visorEyeLeft: { width: 6, height: 6, borderRadius: 3, backgroundColor: Holo }, visorEyeRight: { width: 6, height: 6, borderRadius: 3, backgroundColor: Holo }, helmetSideLeft: { position: 'absolute', left: -7, width: 9, height: 28, borderWidth: 2, borderColor: Holo, borderRadius: 5 }, helmetSideRight: { position: 'absolute', right: -7, width: 9, height: 28, borderWidth: 2, borderColor: Holo, borderRadius: 5 }, backHelmet: { width: 64, height: 60, borderRadius: 24, backgroundColor: 'rgba(12,32,50,0.85)', borderWidth: 2, borderColor: Holo, alignItems: 'center', justifyContent: 'center', gap: 5, padding: 9 }, backPanelLine: { height: 2, width: '100%', backgroundColor: Holo, opacity: 0.72 },
  signalPoint: { position: 'absolute', zIndex: 4, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#DEFFF1', backgroundColor: Holo, shadowColor: Holo, shadowOpacity: 1, shadowRadius: 8, elevation: 5 }, signalHead: { top: 53, left: 145 }, signalChest: { top: 177, left: 142, backgroundColor: Attention, borderColor: '#FFF0B9', shadowColor: Attention }, signalArm: { top: 215, left: 51 }, signalWrist: { top: 258, left: 48, width: 10, height: 10, backgroundColor: Attention, borderColor: '#FFF0B9', shadowColor: Attention }, signalLeg: { top: 330, left: 147 },
  neck: { position: 'absolute', top: 112, width: 45, height: 22, borderWidth: 3, borderColor: Holo, backgroundColor: '#173342' }, packSideLeft: { position: 'absolute', top: 143, left: 29, width: 24, height: 115, borderRadius: 13, borderWidth: 2, borderColor: Holo, backgroundColor: 'rgba(17,60,66,0.8)' }, packSideRight: { position: 'absolute', top: 143, right: 29, width: 24, height: 115, borderRadius: 13, borderWidth: 2, borderColor: Attention, backgroundColor: 'rgba(72,60,28,0.75)' },
  armLeft: { position: 'absolute', top: 139, left: 21, width: 43, height: 130, borderRadius: 23, borderWidth: 3, borderColor: Holo, backgroundColor: 'rgba(16,70,69,0.7)', alignItems: 'center' }, armRight: { position: 'absolute', top: 139, right: 21, width: 43, height: 130, borderRadius: 23, borderWidth: 3, borderColor: Attention, backgroundColor: 'rgba(78,63,30,0.68)', alignItems: 'center' }, armStripe: { width: 28, height: 12, marginTop: 25, borderRadius: 6, borderWidth: 2, borderColor: Holo }, goldStripe: { borderColor: Attention }, glove: { position: 'absolute', bottom: -8, width: 42, height: 31, borderRadius: 14, borderWidth: 3, borderColor: Holo, backgroundColor: '#133C44' }, goldGlove: { borderColor: Attention, backgroundColor: '#45391F' },
  torso: { position: 'absolute', top: 128, width: 132, height: 137, borderRadius: 37, borderWidth: 4, borderColor: Holo, backgroundColor: 'rgba(13, 67, 67, 0.84)', alignItems: 'center', shadowColor: Holo, shadowOpacity: 0.5, shadowRadius: 15, elevation: 7 }, collar: { position: 'absolute', top: -9, width: 76, height: 19, borderRadius: 10, borderWidth: 3, borderColor: Holo, backgroundColor: '#143E46' }, chestPanel: { marginTop: 24, width: 73, height: 65, borderRadius: 12, borderWidth: 3, borderColor: Holo, backgroundColor: '#102C3E', alignItems: 'center', justifyContent: 'center', gap: 7 }, panelDisplay: { width: 48, height: 31, borderRadius: 4, borderWidth: 2, borderColor: Holo, padding: 4, gap: 4, justifyContent: 'center' }, panelLine: { height: 2, width: '100%', backgroundColor: Holo }, panelLineShort: { width: '60%' }, panelPulse: { position: 'absolute', width: 8, height: 8, borderRadius: 5, right: 4, top: 4, backgroundColor: Attention }, panelButtonRow: { flexDirection: 'row', gap: 5 }, panelButton: { width: 7, height: 7, borderRadius: 5, backgroundColor: Holo }, goldButton: { backgroundColor: Attention }, torsoSeam: { position: 'absolute', width: 2, height: 23, backgroundColor: Holo, opacity: 0.75, bottom: 13 }, belt: { position: 'absolute', bottom: -10, width: 119, height: 25, borderRadius: 10, borderWidth: 3, borderColor: Holo, backgroundColor: '#153D42', alignItems: 'center', justifyContent: 'center' }, beltLatch: { width: 32, height: 16, borderRadius: 5, borderWidth: 2, borderColor: Attention },
  legLeft: { position: 'absolute', top: 256, left: 57, width: 53, height: 126, borderRadius: 22, borderWidth: 3, borderColor: Holo, backgroundColor: 'rgba(15,69,66,0.75)', alignItems: 'center' }, legRight: { position: 'absolute', top: 256, right: 57, width: 53, height: 126, borderRadius: 22, borderWidth: 3, borderColor: Attention, backgroundColor: 'rgba(74,61,30,0.75)', alignItems: 'center' }, thighStripe: { marginTop: 26, width: 33, height: 32, borderRadius: 9, borderWidth: 2, borderColor: Holo }, kneePad: { position: 'absolute', top: 66, width: 37, height: 26, borderRadius: 9, borderWidth: 2, borderColor: Holo, backgroundColor: 'rgba(12,40,46,0.8)' }, goldKnee: { borderColor: Attention }, boot: { position: 'absolute', bottom: -8, right: -11, width: 68, height: 31, borderWidth: 3, borderColor: Holo, borderRadius: 12, backgroundColor: '#143C43' }, goldBoot: { borderColor: Attention, left: -11, right: undefined }, bootSole: { position: 'absolute', bottom: -5, left: 4, right: 4, height: 4, borderRadius: 3, backgroundColor: Holo },
  baseRing: { position: 'absolute', bottom: -11, width: 212, height: 24, borderRadius: 120, borderWidth: 2, borderColor: Holo, shadowColor: Holo, shadowOpacity: 0.9, shadowRadius: 12, elevation: 6 },
  backpack: { position: 'absolute', top: 133, width: 104, height: 119, borderRadius: 18, borderWidth: 3, borderColor: Holo, backgroundColor: 'rgba(11,43,54,0.95)', alignItems: 'center', zIndex: -1 }, packTop: { position: 'absolute', top: -12, width: 76, height: 22, borderWidth: 3, borderColor: Attention, borderRadius: 8, backgroundColor: '#293645' }, packScreen: { marginTop: 18, width: 59, height: 42, borderWidth: 2, borderColor: Holo, borderRadius: 6, padding: 7, justifyContent: 'center', gap: 5 }, packTank: { position: 'absolute', bottom: 8, left: -19, width: 18, height: 57, borderRadius: 10, borderWidth: 2, borderColor: Holo, backgroundColor: '#164C52' }, packTankRight: { left: undefined, right: -19, borderColor: Attention }, backCable: { position: 'absolute', top: 57, right: -23, width: 30, height: 31, borderRightWidth: 3, borderTopWidth: 3, borderColor: Attention, borderTopRightRadius: 12 },
  flipButton: { position: 'absolute', bottom: 0, minHeight: 39, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }, flipGlyph: { color: C.teal, fontSize: 17, fontWeight: '900' }, flipLabel: { color: C.text, fontSize: 11, fontWeight: '800' },
});
