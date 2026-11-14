import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { C, X } from '@/theme/tokens';

type Star = [x: number, y: number, size: number, opacity: number];

/** Absolute-positioned white dots (positions taken from the design sources). */
export function Stars({ stars }: { stars: Star[] }) {
  return (
    <>
      {stars.map(([x, y, s, o], i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s, backgroundColor: X.white, opacity: o }}
        />
      ))}
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

/** Login Earth: big planet with teal atmosphere glow (AppLogin). */
export function LoginEarth({ size = 630, left = -120, top = 520 }: { size?: number; left?: number; top?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        boxShadow: `0 -10px 60px 12px ${X.earthGlow}`,
      }}>
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
    </View>
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
