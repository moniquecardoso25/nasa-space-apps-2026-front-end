import { useEffect, useReducer, useRef, useState } from 'react';
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

import { BOLT_W, BoltFigure, BoltShadow, useBoltRig, type BoltColors, type BoltRig } from '@/components/Astronaut';
import { Txt } from '@/components/Txt';
import { C, tokens } from '@/theme/tokens';

import { GAITS, byId } from './animations';
import { boltReducer, initialBoltState, staticAnimFor, type BoltState } from './machine';
import { NEUTRAL, type AnimationDef, type Channel, type Overlay, type Program, type StatusKey } from './types';

const CHANNELS = Object.keys(NEUTRAL) as Channel[];
const TRANSITION = 280; // ms to blend from the previous pose
const ease = Easing.inOut(Easing.ease);

function channel(rig: BoltRig, c: Channel): SharedValue<number> {
  return rig[c];
}

/** Starts a looping program on every rig channel (smooth blend first). */
export function runProgram(rig: BoltRig, program: Program) {
  for (const c of CHANNELS) {
    const sv = channel(rig, c);
    cancelAnimation(sv);
    const k = program.tracks[c];
    if (!k || !k.length) {
      if (c === 'eyes') {
        // default blink
        sv.set(withSequence(withTiming(1, { duration: TRANSITION }), withRepeat(withSequence(withTiming(1, { duration: 2600 }), withTiming(0.1, { duration: 90 }), withTiming(1, { duration: 90 })), -1)));
      } else sv.set(withTiming(NEUTRAL[c], { duration: TRANSITION, easing: ease }));
      continue;
    }
    if (k.length === 1) {
      sv.set(withTiming(k[0], { duration: TRANSITION, easing: ease }));
      continue;
    }
    const step = Math.max(60, program.period / k.length);
    const loop = [...k.slice(1), k[0]].map((v) => withTiming(v, { duration: step, easing: ease }));
    sv.set(withSequence(withTiming(k[0], { duration: TRANSITION, easing: ease }), withRepeat(withSequence(...loop), -1)));
  }
}

/** Static pose (reduced motion): explicit pose or first keyframe of each track. */
export function applyPose(rig: BoltRig, def: AnimationDef | null) {
  for (const c of CHANNELS) {
    const sv = channel(rig, c);
    cancelAnimation(sv);
    const v = def?.pose?.[c] ?? def?.program.tracks[c]?.[0] ?? NEUTRAL[c];
    sv.set(v);
  }
}

function OverlayMark({ kind }: { kind: Overlay }) {
  const y = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    y.set(withRepeat(withSequence(withTiming(-8, { duration: 700 }), withTiming(0, { duration: 700 })), -1));
    return () => cancelAnimation(y);
  }, [reduced, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  if (!kind) return null;
  const text = kind === 'zzz' ? 'z z Z' : kind === 'sparkles' ? '✦ ✧ ✦' : kind === 'sweat' ? '! !' : '♪ ♫';
  const color = kind === 'sparkles' ? C.gold : kind === 'note' ? C.teal : kind === 'sweat' ? C.warning : C.muted;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -14, left: 48 }, style]}>
      <Txt weight="700" size={tokens.font.size.small} color={color}>
        {text}
      </Txt>
    </Animated.View>
  );
}

export type Spots = { window: number; console: number; plant: number; pet: number };

type Props = {
  /** Width of the walkable floor (px). */
  width: number;
  spots: Spots;
  statuses: StatusKey[];
  colors?: BoltColors;
  hasPet?: boolean;
  /** Dev selector: force one animation (null = automatic). */
  forced?: string | null;
  /** Changes to a new value → short celebration (e.g. lastSaved.at when Home gains focus). */
  celebrateKey?: number;
  bottom?: number;
  scale?: number;
  onState?: (s: BoltState) => void;
};

/**
 * Bolt driven by the animation state machine (src/avatar/machine.ts).
 * Each state: walk to its spot with a gait, then run its looping program for
 * a random duration, then NEXT. Reduced motion → static pose of the top status.
 */
export function BoltActor({ width, spots, statuses, colors, hasPet = false, forced = null, celebrateKey = 0, bottom = 110, scale = 1, onState }: Props) {
  const reduced = useReducedMotion();
  const rig = useBoltRig();
  const x = useSharedValue(10);
  const facing = useSharedValue(1);
  const [state, dispatch] = useReducer(boltReducer, initialBoltState);
  const [actSeq, setActSeq] = useState(-1);
  const phase: 'move' | 'act' = actSeq === state.seq ? 'act' : 'move';
  const latest = useRef({ statuses, hasPet });
  const celebrated = useRef(0);
  const maxX = Math.max(20, width - BOLT_W * scale - 10);

  useEffect(() => {
    latest.current = { statuses, hasPet };
  }, [statuses, hasPet]);

  useEffect(() => {
    onState?.(state);
  }, [state, onState]);

  // A new top status interrupts an idle animation (status has priority over idle).
  const topStatus = statuses.find((s) => s !== 'saved') ?? null;
  const reason = state.reason;
  useEffect(() => {
    if (!topStatus || reason !== 'idle' || forced) return;
    const t = setTimeout(() => dispatch({ type: 'NEXT', statuses: latest.current.statuses, hasPet: latest.current.hasPet, rand: Math.random() }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topStatus]);

  // dev selector
  useEffect(() => {
    if (forced) dispatch({ type: 'FORCE', anim: forced });
    else dispatch({ type: 'RELEASE', statuses: latest.current.statuses, hasPet: latest.current.hasPet, rand: Math.random() });
  }, [forced]);

  // celebrate once per new key
  useEffect(() => {
    if (celebrateKey && celebrateKey !== celebrated.current) {
      celebrated.current = celebrateKey;
      dispatch({ type: 'SAVED' });
    }
  }, [celebrateKey]);

  // reduced motion: static pose of the current state
  const staticId = reduced ? (forced ?? staticAnimFor(statuses)) : null;
  useEffect(() => {
    if (!reduced) return;
    cancelAnimation(x);
    const def = staticId ? byId(staticId) : null;
    const spot = def?.spot;
    x.set(spot === 'window' ? spots.window : spot === 'console' ? spots.console : spot === 'plant' ? spots.plant : 10);
    facing.set(1);
    applyPose(rig, def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, staticId]);

  // run the current state
  useEffect(() => {
    if (reduced) return;
    const def = byId(state.anim);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    const next = () => dispatch({ type: 'NEXT', statuses: latest.current.statuses, hasPet: latest.current.hasPet, rand: Math.random() });
    const [dMin, dMax] = def.duration;
    const actMs = dMin + Math.random() * (dMax - dMin);
    const gait = GAITS[def.gait ?? 'normal'];

    const walkTo = (target: number, after: () => void) => {
      const t = Math.max(0, Math.min(maxX, target));
      const dist = Math.abs(t - x.get());
      if (dist < 6) return later(after, 0);
      facing.set(t > x.get() ? 1 : -1);
      runProgram(rig, gait.program);
      const ms = (dist / gait.speed) * 1000;
      x.set(withTiming(t, { duration: ms, easing: Easing.linear }));
      later(after, ms);
    };

    const act = () => {
      setActSeq(state.seq);
      if (def.spot === 'pace') {
        // back and forth around the current point
        const a = Math.max(0, Math.min(maxX - 70, x.get() - 35));
        const legMs = (70 / gait.speed) * 1000;
        runProgram(rig, { period: gait.program.period, tracks: { ...gait.program.tracks, ...def.program.tracks } });
        let to = a + 70;
        const leg = () => {
          facing.set(to > x.get() ? 1 : -1);
          x.set(withTiming(to, { duration: legMs, easing: Easing.linear }));
          to = to === a ? a + 70 : a;
        };
        leg();
        const iv = setInterval(leg, legMs);
        later(() => clearInterval(iv), actMs);
        later(next, actMs);
        return;
      }
      if (def.gait && def.spot === 'random') {
        // walking-style status (slow walk, limp, guard): keep walking around
        let left = actMs;
        const hop = () => {
          if (left <= 0) return next();
          const target = Math.random() * maxX;
          const ms = (Math.abs(target - x.get()) / gait.speed) * 1000;
          left -= ms;
          walkTo(target, hop);
        };
        runProgram(rig, { period: gait.program.period, tracks: { ...gait.program.tracks, ...def.program.tracks } });
        hop();
        return;
      }
      if (def.id === 'walk') return next();
      if (def.id === 'spin') facing.set(withSequence(withTiming(-1, { duration: 300 }), withTiming(1, { duration: 300 }), withTiming(-1, { duration: 300 }), withTiming(1, { duration: 300 })));
      // face the thing we came to use
      if (def.spot === 'console') facing.set(-1);
      else if (def.spot === 'window' || def.spot === 'plant' || def.spot === 'pet') facing.set(1);
      runProgram(rig, def.program);
      later(next, actMs);
    };

    const target =
      def.spot === 'random'
        ? Math.random() * maxX
        : def.spot === 'window'
          ? spots.window
          : def.spot === 'console'
            ? spots.console
            : def.spot === 'plant'
              ? spots.plant
              : def.spot === 'pet'
                ? spots.pet
                : x.get();
    if (def.gait && def.spot === 'random') later(act, 0);
    else walkTo(target, act);

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(x);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.seq, reduced]);

  const pos = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const flip = useAnimatedStyle(() => ({ transform: [{ scaleX: facing.value }] }));
  const def = byId(reduced ? (staticId ?? 'walk') : state.anim);
  const holding = reduced ? (staticId ? (def.prop ?? null) : null) : phase === 'act' || def.spot === 'stay' ? (def.prop ?? null) : null;
  const overlay = (reduced ? staticId !== null : phase === 'act') ? (def.overlay ?? null) : null;

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, bottom, width: BOLT_W * scale, alignItems: 'center' }, pos]}>
      <Animated.View style={flip}>
        <BoltFigure rig={rig} colors={colors} scale={scale} holding={holding} />
      </Animated.View>
      <BoltShadow width={70 * scale} />
      <OverlayMark kind={overlay} />
      <View accessibilityLabel={`Bolt: ${def.label}`} />
    </Animated.View>
  );
}
