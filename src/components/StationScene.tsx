import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { C, X, tokens } from '@/theme/tokens';

import { Stars } from './Space';

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

/** Earth seen from the window (gradient planet, land, clouds, night side, city lights). */
export function WindowEarth({ innerW, innerH }: { innerW: number; innerH: number }) {
  // Earth box (480) at left -70, top 196 of the 334×340 window; keep it anchored to the window bottom.
  const ox = -70 + (innerW - 318) / 2;
  const oy = 196 + (innerH - 324);
  return (
    <>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: ox, top: oy, width: 480, height: 480, borderRadius: 240, boxShadow: `0 -8px 40px 10px ${X.earthGlowHome}` }}
      />
      <Svg width={innerW} height={innerH} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <RadialGradient id="earth" cx="40%" cy="15%" r="100%" fx="40%" fy="15%">
            <Stop offset="0" stopColor={X.earthLight} />
            <Stop offset="0.26" stopColor={X.earthMid} />
            <Stop offset="0.55" stopColor={X.earthDeep} />
            <Stop offset="0.75" stopColor={X.earthEdge} />
          </RadialGradient>
          <LinearGradient id="night" x1="0" y1="0.41" x2="1" y2="0.59">
            <Stop offset="0.55" stopColor={X.space} stopOpacity={0} />
            <Stop offset="0.72" stopColor={X.space} stopOpacity={0.75} />
          </LinearGradient>
        </Defs>
        <G transform={`translate(${ox} ${oy})`}>
          <Circle cx={240} cy={240} r={240} fill="url(#earth)" />
          {LAND.map(([l, t, w, h, c, o, r], i) => (
            <Ellipse key={i} cx={l + w / 2} cy={t + h / 2} rx={w / 2} ry={h / 2} fill={c} opacity={o} transform={`rotate(${r} ${l + w / 2} ${t + h / 2})`} />
          ))}
          {CLOUDS.map(([l, t, w, r], i) => (
            <Rect key={i} x={l} y={t} width={w} height={10} rx={5} fill={X.white} opacity={0.55} transform={`rotate(${r} ${l + w / 2} ${t + 5})`} />
          ))}
          <Circle cx={240} cy={240} r={240} fill="url(#night)" />
          {CITY.map(([x, y], i) => (
            <Circle key={i} cx={x + 1.5} cy={y + 1.5} r={1.5} fill={C.gold} />
          ))}
        </G>
      </Svg>
    </>
  );
}

/** Station window with stars and Earth. */
export function StationWindow({ height = WINDOW.height, width = WINDOW.width }: { height?: number; width?: number }) {
  const innerW = width - 16;
  const innerH = height - 16;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: WINDOW.top,
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
      <Stars stars={WINDOW_STARS} />
      <WindowEarth innerW={innerW} innerH={innerH} />
    </View>
  );
}

/** Floor (teal edge + glow), console, plant. */
export function StationProps() {
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
        }}
      />
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
