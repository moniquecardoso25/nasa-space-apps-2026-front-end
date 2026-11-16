import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { C, X, tokens } from '@/theme/tokens';

import { WINDOW_SPEC } from '@/data/shopArt';

import { EarthScene, Surface, WindowView, floorSpec, wallSpec } from './ShopArt';
import { Stars, useLoop, useSway } from './Space';

/** Window frame in AppHome: 334×340, 8px track border, radius 44. */
export const WINDOW = { left: 28, top: 84, width: 334, height: 340 };

const WINDOW_STARS: [number, number, number, number][] = [
  [24, 30, 2, 0.9],
  [70, 60, 3, 0.8],
  [140, 26, 2, 0.7],
  [200, 80, 2, 0.9],
  [110, 120, 2, 0.6],
  [44, 160, 2, 0.7],
  [250, 20, 3, 0.8],
  [290, 140, 2, 0.7],
  [180, 170, 2, 0.8],
];
// [left, top, width, height, color, opacity, rotate] inside the 480×480 Earth box
const LAND: [number, number, number, number, string, number, number][] = [
  [90, 30, 120, 46, X.land, 0.9, -12],
  [190, 70, 70, 34, X.sand, 0.8, 20],
  [40, 90, 80, 30, X.land, 0.85, 15],
  [250, 20, 90, 40, X.landLight, 0.8, -25],
  [160, 120, 110, 40, X.land, 0.75, 8],
];
const CLOUDS: [number, number, number, number][] = [
  [70, 22, 90, -8],
  [200, 50, 120, 6],
  [120, 84, 70, -4],
  [280, 96, 60, 10],
  [30, 60, 50, 12],
];
const CITY: [number, number][] = [
  [330, 60],
  [350, 80],
  [372, 50],
  [340, 104],
  [390, 90],
  [360, 128],
  [400, 70],
];

const EARTH = 480;

/** A strip two Earths wide (the art drawn twice) that scrolls sideways forever inside the round clip. */
function SpinStrip({ t, children }: { t: SharedValue<number>; children: (dx: number) => React.ReactNode }) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (t.value - 1) * EARTH }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: EARTH * 2, height: EARTH }, style]}>
      <Svg width={EARTH * 2} height={EARTH}>
        {children(0)}
        {children(EARTH)}
      </Svg>
    </Animated.View>
  );
}

/**
 * Earth seen from the window (gradient planet, land, clouds, night side, city lights).
 * Animated: the planet turns (land drifts), clouds move faster with the wind,
 * and the whole planet floats a little (parallax against the drifting stars).
 * Reduced motion → static.
 */
export function WindowEarth({ innerW, innerH }: { innerW: number; innerH: number }) {
  // Earth box (480) at left -70, top 196 of the 334×340 window; keep it anchored to the window bottom.
  const ox = -70 + (innerW - 318) / 2;
  const oy = 196 + (innerH - 324);
  const land = useLoop(90000);
  const wind = useLoop(50000);
  const float = useSway(9000);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: float.value * 4 }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: innerW, height: innerH }, bob]}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: ox, top: oy, width: EARTH, height: EARTH, borderRadius: EARTH / 2, boxShadow: `0 -8px 40px 10px ${X.earthGlowHome}` }}
      />
      <View style={{ position: 'absolute', left: ox, top: oy, width: EARTH, height: EARTH, borderRadius: EARTH / 2, overflow: 'hidden' }}>
        <Svg width={EARTH} height={EARTH} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs>
            <RadialGradient id="earth" cx="40%" cy="15%" r="100%" fx="40%" fy="15%">
              <Stop offset="0" stopColor={X.earthLight} />
              <Stop offset="0.26" stopColor={X.earthMid} />
              <Stop offset="0.55" stopColor={X.earthDeep} />
              <Stop offset="0.75" stopColor={X.earthEdge} />
            </RadialGradient>
          </Defs>
          <Circle cx={240} cy={240} r={240} fill="url(#earth)" />
        </Svg>
        <SpinStrip t={land}>
          {(dx) =>
            LAND.map(([l, t, w, h, c, o, r], i) => (
              <Ellipse key={`${dx}-${i}`} cx={dx + l + w / 2} cy={t + h / 2} rx={w / 2} ry={h / 2} fill={c} opacity={o} transform={`rotate(${r} ${dx + l + w / 2} ${t + h / 2})`} />
            ))
          }
        </SpinStrip>
        <SpinStrip t={wind}>
          {(dx) =>
            CLOUDS.map(([l, t, w, r], i) => (
              <Rect key={`${dx}-${i}`} x={dx + l} y={t} width={w} height={10} rx={5} fill={X.white} opacity={0.55} transform={`rotate(${r} ${dx + l + w / 2} ${t + 5})`} />
            ))
          }
        </SpinStrip>
        <Svg width={EARTH} height={EARTH} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id="night" x1="0" y1="0.41" x2="1" y2="0.59">
              <Stop offset="0.55" stopColor={X.space} stopOpacity={0} />
              <Stop offset="0.72" stopColor={X.space} stopOpacity={0.75} />
            </LinearGradient>
          </Defs>
          <Circle cx={240} cy={240} r={240} fill="url(#night)" />
          {CITY.map(([x, y], i) => (
            <Circle key={i} cx={x + 1.5} cy={y + 1.5} r={1.5} fill={C.gold} />
          ))}
        </Svg>
      </View>
    </Animated.View>
  );
}

/** Clouds sliding across a day scene (beach, countryside); wraps around. Same shapes as EarthScene, in window pixels. */
function DriftClouds({ width, height }: { width: number; height: number }) {
  const t = useLoop(70000);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (t.value - 1) * width }] }));
  // EarthScene uses a 100×100 slice canvas: map its cloud coordinates to the window
  const s = Math.max(width, height) / 100;
  const ox = (width - 100 * s) / 2;
  const oy = (height - 100 * s) / 2;
  const CLOUD: [number, number, number][] = [
    [16, 14, 10],
    [52, 10, 14],
    [88, 30, 9],
  ];
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: width * 2, height }, style]}>
      <Svg width={width * 2} height={height}>
        {[0, width].map((dx) =>
          CLOUD.map(([x, y, w], i) => <Ellipse key={`${dx}-${i}`} cx={dx + ox + x * s} cy={oy + y * s} rx={w * s} ry={w * 0.32 * s} fill={X.white} opacity={0.85} />),
        )}
      </Svg>
    </Animated.View>
  );
}

/** Station window with stars and Earth (or the equipped window view). */
export function StationWindow({
  height = WINDOW.height,
  width = WINDOW.width,
  view = 'window-earth-day',
  top = WINDOW.top,
}: {
  height?: number;
  width?: number;
  view?: string;
  /** distance from the top of the scene (Home moves it down under the Orbi card) */
  top?: number;
}) {
  const innerW = width - 16;
  const innerH = height - 16;
  const spec = WINDOW_SPEC[view];
  const scene = spec?.kind === 'scene' ? spec.scene : null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left: WINDOW.left,
        width,
        height,
        borderRadius: 44,
        borderWidth: 8,
        borderColor: C.track,
        backgroundColor: X.space,
        overflow: 'hidden',
        boxShadow: `0 0 0 1px ${X.windowRing}, inset 0 0 40px ${X.windowInset}`,
      }}>
      {view === 'window-earth-day' ? (
        <>
          <Stars stars={WINDOW_STARS} driftWidth={innerW} />
          <WindowEarth innerW={innerW} innerH={innerH} />
        </>
      ) : scene ? (
        <>
          <EarthScene scene={scene} width={innerW} height={innerH} clouds={false} />
          {scene === 'beach' || scene === 'field' ? <DriftClouds width={innerW} height={innerH} /> : <Stars stars={WINDOW_STARS.filter((st) => st[1] < innerH * 0.3)} driftWidth={innerW} />}
        </>
      ) : (
        <>
          <WindowView id={view} width={innerW} height={innerH} />
          <Stars stars={WINDOW_STARS} driftWidth={innerW} />
        </>
      )}
    </View>
  );
}

/** Wall pattern behind the scene (equipped wall). Lilac panels = plain bgScene like AppHome. */
export function StationWall({ wall, width, height }: { wall: string; width: number; height: number }) {
  if (wall === 'wall-lilac') return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Surface spec={wallSpec(wall)} width={width} height={height} />
    </View>
  );
}

/** Floor (teal edge + glow, or the equipped floor), console, plant. */
export function StationProps({ floor = 'floor-teal', width = 430 }: { floor?: string; width?: number }) {
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 210,
          backgroundColor: C.floor,
          borderTopWidth: 2,
          borderTopColor: C.teal,
          boxShadow: `0 -4px 18px ${X.floorGlow}`,
          overflow: 'hidden',
        }}>
        {floor !== 'floor-teal' ? <Surface spec={floorSpec(floor)} width={width} height={210} /> : null}
      </View>
      {/* console */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 18,
          bottom: 210,
          width: 88,
          height: 74,
          borderTopLeftRadius: tokens.radius.small,
          borderTopRightRadius: tokens.radius.small,
          backgroundColor: X.console,
          borderWidth: 1,
          borderColor: X.windowRing,
          gap: 7,
          padding: 12,
        }}>
        <View style={{ height: 6, width: '70%', borderRadius: 3, backgroundColor: C.teal, boxShadow: `0 0 8px ${C.teal}` }} />
        <View style={{ height: 6, width: '45%', borderRadius: 3, backgroundColor: C.primary }} />
        <View style={{ height: 6, width: '85%', borderRadius: 3, backgroundColor: X.consoleBar }} />
      </View>
      {/* plant */}
      <View pointerEvents="none" style={{ position: 'absolute', right: 24, bottom: 210, width: 70, height: 96 }}>
        <View style={{ position: 'absolute', left: 10, top: 4, width: 26, height: 52, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomLeftRadius: 26, backgroundColor: X.plantDark, transform: [{ rotate: '-22deg' }] }} />
        <View style={{ position: 'absolute', left: 32, top: 10, width: 24, height: 46, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomRightRadius: 24, backgroundColor: X.plantMid, transform: [{ rotate: '18deg' }] }} />
        <View style={{ position: 'absolute', left: 22, top: 0, width: 18, height: 40, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: C.success }} />
        <View
          style={{
            position: 'absolute',
            left: 14,
            bottom: 0,
            width: 42,
            height: 40,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            borderBottomLeftRadius: 14,
            borderBottomRightRadius: 14,
            backgroundColor: X.consoleBar,
            borderWidth: 1,
            borderColor: X.potBorder,
          }}
        />
      </View>
    </>
  );
}
