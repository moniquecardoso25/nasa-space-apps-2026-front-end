import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { C, X } from '@/theme/tokens';

/** Bolt artwork is drawn in a 100×140 box (same as docs/design/source/AppHome). */
export const BOLT_W = 100;
export const BOLT_H = 140;

export type BoltColors = { suit: string; shade: string; boot: string; visor: string; accent: string; helmet?: string };
export const DEFAULT_BOLT: BoltColors = {
  suit: X.suit,
  shade: X.suitShade,
  boot: X.boot,
  visor: X.visor,
  accent: C.primary,
};

/** Shared values that drive each body part (degrees / px). */
export type BoltRig = {
  head: SharedValue<number>; // rotation
  headY: SharedValue<number>;
  armF: SharedValue<number>; // front arm rotation
  armB: SharedValue<number>; // back arm (behind the backpack side) rotation
  legL: SharedValue<number>;
  legR: SharedValue<number>;
  body: SharedValue<number>; // whole-body bob (translateY)
  lean: SharedValue<number>; // whole-body rotation
  squash: SharedValue<number>; // vertical scale (sit / jump)
  eyes: SharedValue<number>; // 1 open … 0 closed
};

export function useBoltRig(): BoltRig {
  return {
    head: useSharedValue(0),
    headY: useSharedValue(0),
    armF: useSharedValue(0),
    armB: useSharedValue(0),
    legL: useSharedValue(0),
    legR: useSharedValue(0),
    body: useSharedValue(0),
    lean: useSharedValue(0),
    squash: useSharedValue(1),
    eyes: useSharedValue(1),
  };
}

const layer = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } as const;

function Part({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <Animated.View pointerEvents="none" style={[layer, style]}>
      <Svg width={BOLT_W} height={BOLT_H} viewBox={`0 0 ${BOLT_W} ${BOLT_H}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

type BoltProps = {
  rig: BoltRig;
  colors?: BoltColors;
  scale?: number;
  /** Optional prop held in the front hand (cup, tablet…). */
  holding?: 'cup' | 'tablet' | 'can' | 'tray' | null;
};

/**
 * Bolt, the two-eyed side astronaut (visor, backpack). Pure rendering:
 * the rig's shared values decide the pose. See src/avatar for behaviour.
 */
export function BoltFigure({ rig, colors = DEFAULT_BOLT, scale = 1, holding = null }: BoltProps) {
  const k = colors;

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rig.body.value }, { rotate: `${rig.lean.value}deg` }, { scaleY: rig.squash.value }],
  }));
  const legLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rig.legL.value}deg` }] }));
  const legRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rig.legR.value}deg` }] }));
  const armFStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rig.armF.value}deg` }] }));
  const armBStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rig.armB.value}deg` }] }));
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rig.headY.value }, { rotate: `${rig.head.value}deg` }],
  }));
  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.max(0.12, rig.eyes.value) }] }));

  const origin = (x: number, y: number) => ({ transformOrigin: `${x}px ${y}px` });

  return (
    <View style={{ width: BOLT_W * scale, height: BOLT_H * scale }}>
      <View style={{ width: BOLT_W, height: BOLT_H, transform: [{ scale }], transformOrigin: 'top left' }}>
        <Animated.View style={[layer, origin(56, 134), bodyStyle]}>
          {/* back arm (mostly hidden behind the backpack) */}
          <Part style={[origin(40, 56), armBStyle]}>
            <Rect x={34} y={56} width={12} height={32} rx={6} fill={k.shade} />
          </Part>
          {/* backpack */}
          <Part>
            <Rect x={18} y={44} width={26} height={44} rx={8} fill={k.shade} />
          </Part>
          {/* legs */}
          <Part style={[origin(46, 92), legLStyle]}>
            <Rect x={38} y={92} width={16} height={38} rx={7} fill={k.suit} />
            <Rect x={34} y={122} width={24} height={12} rx={5} fill={k.boot} />
          </Part>
          <Part style={[origin(64, 92), legRStyle]}>
            <Rect x={56} y={92} width={16} height={38} rx={7} fill={k.suit} />
            <Rect x={54} y={122} width={24} height={12} rx={5} fill={k.boot} />
          </Part>
          {/* torso + chest panel */}
          <Part>
            <Rect x={34} y={50} width={44} height={50} rx={14} fill={k.suit} />
            <Rect x={44} y={62} width={22} height={14} rx={3} fill={k.visor} />
            <Circle cx={50} cy={69} r={2.5} fill={C.primary} />
            <Circle cx={58} cy={69} r={2.5} fill={C.gold} />
          </Part>
          {/* head */}
          <Animated.View style={[layer, origin(60, 52), headStyle]}>
            <Part>
              <Circle cx={60} cy={30} r={26} fill={k.helmet ?? k.suit} />
              <Rect x={42} y={18} width={36} height={24} rx={11} fill={k.visor} />
              <Path d="M46 23q4-3 9-3" stroke={k.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
              <Line x1={60} y1={4} x2={60} y2={-6} stroke={k.accent} strokeWidth={3} />
            </Part>
            <Animated.View style={[layer, origin(60, 31), eyesStyle]}>
              <Part>
                <Circle cx={53} cy={31} r={3} fill={C.teal} />
                <Circle cx={67} cy={31} r={3} fill={C.teal} />
              </Part>
            </Animated.View>
          </Animated.View>
          {/* front arm + band (+ held prop) */}
          <Part style={[origin(73, 58), armFStyle]}>
            <Rect x={66} y={56} width={14} height={36} rx={7} fill={k.suit} />
            <Rect x={66} y={64} width={14} height={5} fill={k.accent} />
            {holding === 'cup' && (
              <>
                <Rect x={68} y={86} width={12} height={12} rx={2} fill={C.teal} />
                <Path d="M80 89q4 0 4 3t-4 3" stroke={C.teal} strokeWidth={2} fill="none" />
              </>
            )}
            {holding === 'tablet' && <Rect x={64} y={84} width={20} height={14} rx={2} fill={X.consoleBar} stroke={C.teal} strokeWidth={1.5} />}
            {holding === 'can' && (
              <>
                <Rect x={68} y={84} width={12} height={14} rx={2} fill={C.teal} />
                <Path d="M80 87l8 4" stroke={C.teal} strokeWidth={2.5} strokeLinecap="round" />
              </>
            )}
            {holding === 'tray' && (
              <>
                <Rect x={62} y={88} width={26} height={5} rx={2} fill={X.suitShade} />
                <Circle cx={70} cy={86} r={4} fill={C.warning} />
                <Circle cx={78} cy={86} r={3.5} fill={X.plantMid} />
              </>
            )}
          </Part>
        </Animated.View>
      </View>
    </View>
  );
}

/** Floor shadow under Bolt. */
export function BoltShadow({ width = 70 }: { width?: number }) {
  return <View style={{ width, height: 10, marginTop: -5, borderRadius: width, backgroundColor: X.overlay }} />;
}

/**
 * Simple Astronaut: walking = legs/arm swing + bob; idle = gentle bob.
 * Respects reduced motion (static pose). Home uses the full state machine
 * (src/avatar) — this is the lightweight version for previews.
 */
export function Astronaut({
  state = 'idle',
  colors,
  scale = 1,
}: {
  state?: 'idle' | 'walking';
  colors?: BoltColors;
  scale?: number;
}) {
  const rig = useBoltRig();
  const reduced = useReducedMotion();
  useEffect(() => {
    const all = [rig.legL, rig.legR, rig.armF, rig.body];
    all.forEach((v) => cancelAnimation(v));
    if (reduced) {
      all.forEach((v) => v.set(0));
      return;
    }
    const ease = Easing.inOut(Easing.ease);
    if (state === 'walking') {
      const swing = (from: number) =>
        withRepeat(withSequence(withTiming(-from, { duration: 250, easing: ease }), withTiming(from, { duration: 250, easing: ease })), -1);
      rig.legL.set(14);
      rig.legL.set(swing(14));
      rig.legR.set(-14);
      rig.legR.set(swing(-14));
      rig.armF.set(-14);
      rig.armF.set(swing(-14));
      rig.body.set(withRepeat(withSequence(withTiming(-3, { duration: 250 }), withTiming(0, { duration: 250 })), -1));
    } else {
      rig.legL.set(0);
      rig.legR.set(0);
      rig.armF.set(0);
      rig.body.set(withRepeat(withSequence(withTiming(-2, { duration: 1200, easing: ease }), withTiming(0, { duration: 1200, easing: ease })), -1));
    }
    return () => all.forEach((v) => cancelAnimation(v));
  }, [state, reduced, rig.legL, rig.legR, rig.armF, rig.body]);
  return <BoltFigure rig={rig} colors={colors} scale={scale} />;
}

/** Small floating drone with two eyes (Orbi). */
export function OrbiDrone({ size = 42, float = true }: { size?: number; float?: boolean }) {
  const y = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !float) {
      y.set(0);
      return;
    }
    y.set(withRepeat(withSequence(withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })), -1));
    return () => cancelAnimation(y);
  }, [reduced, float, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={style} accessibilityLabel="Orbi">
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Line x1={20} y1={2} x2={20} y2={8} stroke={C.primary} strokeWidth={2} />
        <Circle cx={20} cy={2} r={2} fill={C.teal} />
        <Circle cx={20} cy={22} r={14} fill={C.track} stroke={C.primary} strokeWidth={2} />
        <Rect x={11} y={17} width={18} height={10} rx={5} fill={C.bg} />
        <Circle cx={16} cy={22} r={2.2} fill={C.teal} />
        <Circle cx={24} cy={22} r={2.2} fill={C.teal} />
      </Svg>
    </Animated.View>
  );
}
