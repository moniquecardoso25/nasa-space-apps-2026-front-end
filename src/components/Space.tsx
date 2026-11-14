import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { C, X } from '@/theme/tokens';

type Star = [x: number, y: number, size: number, opacity: number];

const ease = Easing.inOut(Easing.ease);
const FILL = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } as const;

/** 0 → 1 linear, forever (continuous drift / rotation). Stays at 0 with reduced motion. */
export function useLoop(duration: number): SharedValue<number> {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    t.set(0);
    if (reduced) return;
    t.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [reduced, duration, t]);
  return t;
}

/** Smooth -1 … 1 back-and-forth, forever (parallax sway / float). Stays at 0 with reduced motion. */
export function useSway(duration: number, delay = 0): SharedValue<number> {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    t.set(0);
    if (reduced) return;
    t.set(
      withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: duration / 2, easing: ease }),
          withRepeat(withSequence(withTiming(-1, { duration, easing: ease }), withTiming(1, { duration, easing: ease })), -1),
        ),
      ),
    );
    return () => cancelAnimation(t);
  }, [reduced, duration, delay, t]);
  return t;
}

/** One twinkling dot. */
function StarDot({ star: [x, y, s, o], i }: { star: Star; i: number }) {
  const reduced = useReducedMotion();
  const op = useSharedValue(o);
  useEffect(() => {
    cancelAnimation(op);
    op.set(o);
    if (reduced) return;
    const d = 1400 + ((i * 677) % 1800);
    op.set(withDelay((i * 397) % 1500, withRepeat(withSequence(withTiming(o * 0.3, { duration: d, easing: ease }), withTiming(o, { duration: d, easing: ease })), -1)));
    return () => cancelAnimation(op);
  }, [reduced, o, i, op]);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s, backgroundColor: X.white }, style]}
    />
  );
}

/**
 * One depth layer. With `width` the layer scrolls sideways forever and wraps
 * (stars are drawn twice, `width` apart; the parent clips). Without it, it sways.
 */
function StarLayer({ stars, near, width, offset }: { stars: Star[]; near: boolean; width?: number; offset: number }) {
  const drift = useLoop(near ? 60000 : 120000);
  const sway = useSway(near ? 7000 : 11000, near ? 0 : 900);
  const amp = near ? 10 : 4;
  const style = useAnimatedStyle(() =>
    width
      ? { transform: [{ translateX: (drift.value - 1) * width }] } // same direction as the turning Earth, slower = farther
      : { transform: [{ translateX: sway.value * amp }, { translateY: sway.value * amp * 0.4 }] },
  );
  return (
    <Animated.View pointerEvents="none" style={[FILL, style]}>
      {stars.map((st, i) => (
        <StarDot key={i} star={st} i={i + offset} />
      ))}
      {width ? stars.map((st, i) => <StarDot key={`w${i}`} star={[st[0] + width, st[1], st[2], st[3]]} i={i + offset} />) : null}
    </Animated.View>
  );
}

/**
 * Twinkling stars (positions taken from the design sources) in two parallax
 * layers: big stars are "near" and move more than small "far" ones.
 * `driftWidth` → continuous sideways drift that wraps (e.g. inside the window).
 * Reduced motion → static dots.
 */
export function Stars({ stars, driftWidth }: { stars: Star[]; driftWidth?: number }) {
  const far = stars.filter((s) => s[2] < 3);
  const near = stars.filter((s) => s[2] >= 3);
  return (
    <>
      <StarLayer stars={far} near={false} width={driftWidth} offset={0} />
      <StarLayer stars={near} near width={driftWidth} offset={far.length} />
    </>
  );
}

export const LOGIN_STARS: Star[] = [
  [30, 60, 2, 0.8],
  [90, 120, 3, 0.9],
  [300, 80, 2, 0.7],
  [340, 180, 3, 0.8],
  [180, 40, 2, 0.6],
  [60, 220, 2, 0.7],
  [250, 250, 2, 0.8],
];

/** Login Earth: big planet with teal atmosphere glow (AppLogin). Floats slowly (parallax vs. the stars). */
export function LoginEarth({ size = 630, left = -120, top = 520 }: { size?: number; left?: number; top?: number }) {
  const float = useSway(10000);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: float.value * 6 }, { translateX: float.value * -3 }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          boxShadow: `0 -10px 60px 12px ${X.earthGlow}`,
        },
        style,
      ]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="le" cx="45%" cy="12%" r="100%" fx="45%" fy="12%">
            <Stop offset="0" stopColor={X.loginEarth1} />
            <Stop offset="0.28" stopColor={X.loginEarth2} />
            <Stop offset="0.58" stopColor={X.loginEarth3} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#le)" />
      </Svg>
    </Animated.View>
  );
}

/** Orbi app logo (white head, dark visor, teal eyes). */
export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={17} fill={X.suit} />
      <Rect x={9} y={13} width={22} height={14} rx={7} fill={C.surfaceSolid} />
      <Circle cx={16} cy={20} r={2} fill={C.teal} />
      <Circle cx={24} cy={20} r={2} fill={C.teal} />
    </Svg>
  );
}
