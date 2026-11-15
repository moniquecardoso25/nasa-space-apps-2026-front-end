import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FLOOR_SPEC, HELMET_COLOR, JELLY_COLOR, SUIT_COLOR, WALL_SPEC, WINDOW_SPEC, type EarthSceneId, type SurfaceSpec, type WindowSpec } from '@/data/shopArt';
import { C, X } from '@/theme/tokens';

/** Helmet thumbnail (also used as crew avatar on the leaderboard). */
export function HelmetIcon({ color = HELMET_COLOR['helmet-classic'], size = 44 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={17} fill={color} />
      <Rect x={9} y={13} width={22} height={14} rx={7} fill={C.surfaceSolid} />
      <Circle cx={16} cy={20} r={2.2} fill={C.teal} />
      <Circle cx={24} cy={20} r={2.2} fill={C.teal} />
    </Svg>
  );
}

export function SuitIcon({ color, size = 44 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x={10} y={10} width={20} height={22} rx={7} fill={color} />
      <Rect x={4} y={12} width={7} height={16} rx={3.5} fill={color} />
      <Rect x={29} y={12} width={7} height={16} rx={3.5} fill={color} />
      <Rect x={10} y={26} width={20} height={3} fill={C.primary} />
    </Svg>
  );
}

/** Pet artwork (AppAvatarPets). */
export function PetArt({ id, size = 44 }: { id: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {id === 'pet-robocat' && (
        <>
          <Rect x={6} y={18} width={24} height={14} rx={7} fill={X.boot} />
          <Circle cx={28} cy={16} r={8} fill={X.suit} />
          <Circle cx={25} cy={16} r={1.6} fill={X.visor} />
          <Circle cx={31} cy={16} r={1.6} fill={X.visor} />
          <Path d="M23 9l2 4M33 9l-2 4" stroke={X.suit} strokeWidth={2.5} />
        </>
      )}
      {id === 'pet-drone' && (
        <>
          <Circle cx={20} cy={22} r={11} fill={C.track} stroke={C.primary} strokeWidth={2} />
          <Rect x={13} y={18} width={14} height={8} rx={4} fill={C.bg} />
          <Circle cx={17} cy={22} r={1.8} fill={C.teal} />
          <Circle cx={23} cy={22} r={1.8} fill={C.teal} />
        </>
      )}
      {id === 'pet-plant' && (
        <>
          <Rect x={13} y={24} width={14} height={12} rx={3} fill={X.consoleBar} />
          <Path d="M20 24c-8-2-9-10-6-14 4 2 6 8 6 14zM20 24c6-4 10-10 8-14-5 1-8 7-8 14z" fill={X.plantMid} />
          <Circle cx={17} cy={30} r={1.4} fill={X.suit} />
          <Circle cx={23} cy={30} r={1.4} fill={X.suit} />
        </>
      )}
      {id === 'pet-jellybot' && (
        <>
          <Path d="M8 22a12 12 0 0 1 24 0z" fill={JELLY_COLOR} />
          <Path d="M11 22v8M17 22v10M23 22v10M29 22v8" stroke={JELLY_COLOR} strokeWidth={2.5} strokeLinecap="round" />
          <Circle cx={16} cy={17} r={1.6} fill={X.visor} />
          <Circle cx={24} cy={17} r={1.6} fill={X.visor} />
        </>
      )}
    </Svg>
  );
}

/** Window view (sky + planet) at any size. */
/** Deterministic lit/unlit pattern for city windows. */
const lit = (i: number, j: number) => ((i * 7 + j * 13) % 5 < 2 ? 0.95 : (i + j) % 3 === 0 ? 0.35 : 0);

/**
 * Places on Earth for the window screen (beach, countryside, mountains, city at night).
 * Drawn on a 100×100 canvas that fills any size (slice), only with palette tokens.
 */
export function EarthScene({ scene, width, height, clouds = true }: { scene: EarthSceneId; width: number; height: number; clouds?: boolean }) {
  const g = `es-${scene}-${width}`;
  const day = scene === 'beach' || scene === 'field';
  const sky: [string, string][] = day
    ? [
        ['0', X.loginEarth1],
        ['0.6', X.earthLight],
      ]
    : scene === 'mountains'
      ? [
          ['0', X.loginEarth3],
          ['0.45', C.primary],
          ['0.75', C.warning],
        ]
      : [
          ['0', X.space],
          ['0.7', X.console],
        ];
  return (
    <Svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${g}-sky`} x1="0" y1="0" x2="0" y2="1">
          {sky.map(([o, c]) => (
            <Stop key={o} offset={o} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width={100} height={100} fill={`url(#${g}-sky)`} />

      {scene === 'beach' && (
        <>
          <Circle cx={72} cy={24} r={13} fill={C.gold} opacity={0.25} />
          <Circle cx={72} cy={24} r={8} fill={C.gold} />
          <Rect y={52} width={100} height={24} fill={X.earthMid} />
          <Rect y={52} width={100} height={1.5} fill={X.earthLight} />
          <Rect x={66} y={56} width={12} height={1.2} rx={0.6} fill={C.gold} opacity={0.7} />
          <Rect x={68} y={60} width={8} height={1.2} rx={0.6} fill={C.gold} opacity={0.5} />
          <Path d="M0 66 Q8 63 16 66 T32 66 T48 66 T64 66 T80 66 T100 66" stroke={X.white} strokeWidth={1.2} fill="none" opacity={0.6} />
          <Path d="M0 74 Q25 66 55 72 T100 70 V100 H0 Z" fill={X.sand} />
          <Path d="M0 74 Q25 66 55 72 T100 70" stroke={X.white} strokeWidth={1.5} fill="none" opacity={0.75} />
          {/* palm */}
          <Path d="M17 100 Q15 80 22 60" stroke={X.streakEmpty} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Path d="M22 60 Q12 54 4 60 Q13 55 22 61Z M22 60 Q30 52 40 57 Q30 54 22 61Z M22 60 Q20 50 12 46 Q21 51 22 61Z M22 60 Q28 48 36 46 Q27 52 22 61Z" fill={X.land} stroke={X.land} strokeWidth={1.6} strokeLinejoin="round" />
        </>
      )}

      {scene === 'field' && (
        <>
          <Circle cx={24} cy={22} r={12} fill={C.gold} opacity={0.25} />
          <Circle cx={24} cy={22} r={7} fill={C.gold} />
          <Path d="M0 58 Q22 46 46 55 T100 50 V100 H0 Z" fill={X.landLight} />
          <Path d="M0 70 Q35 58 65 68 T100 64 V100 H0 Z" fill={X.land} />
          <Path d="M0 84 Q40 78 100 82 V100 H0 Z" fill={X.plantMid} />
          {/* tree */}
          <Rect x={77} y={52} width={2} height={12} fill={X.streakEmpty} />
          <Circle cx={78} cy={50} r={6} fill={X.plantDark} />
          {/* fence */}
          {[8, 20, 32, 44, 56].map((x) => (
            <Rect key={x} x={x} y={76} width={1.6} height={10} fill={X.sand} />
          ))}
          <Rect x={6} y={78.5} width={54} height={1.2} fill={X.sand} />
          <Rect x={6} y={82.5} width={54} height={1.2} fill={X.sand} />
          {[
            [14, 92, C.gold],
            [27, 95, C.danger],
            [40, 91, X.white],
            [63, 94, C.gold],
            [74, 90, C.danger],
            [88, 95, X.white],
          ].map(([x, y, c], i) => (
            <Circle key={i} cx={x as number} cy={y as number} r={1.3} fill={c as string} />
          ))}
        </>
      )}

      {scene === 'mountains' && (
        <>
          <Circle cx={80} cy={20} r={3.5} fill={X.suit} />
          <Path d="M0 64 L18 42 L30 54 L46 30 L62 50 L78 36 L100 58 V100 H0 Z" fill={X.consoleBar} />
          <Path d="M46 30 L40 38 L44 37 L47 40 L50 36 L53 37 Z M78 36 L73 42 L77 41 L80 43 L83 41 Z M18 42 L14 47 L18 46 L21 48 Z" fill={X.white} opacity={0.9} />
          <Path d="M0 76 L20 58 L38 72 L60 55 L82 74 L100 64 V100 H0 Z" fill={X.console} />
          <Rect y={82} width={100} height={18} fill={X.earthDeep} />
          <Rect x={30} y={86} width={22} height={1} fill={C.warning} opacity={0.6} />
          <Rect x={36} y={90} width={12} height={1} fill={C.warning} opacity={0.4} />
          {[6, 12, 88, 94].map((x) => (
            <Path key={x} d={`M${x} 82 L${x - 3.5} 82 L${x} 70 L${x + 3.5} 82 Z`} fill={X.visor} />
          ))}
        </>
      )}

      {scene === 'city' && (
        <>
          <Circle cx={82} cy={18} r={6} fill={X.suit} />
          <Circle cx={84.5} cy={16.5} r={5} fill={X.space} opacity={0.35} />
          <Rect y={60} width={100} height={40} fill={C.primary} opacity={0.12} />
          {[
            [2, 50, 14],
            [18, 40, 12],
            [32, 54, 10],
            [44, 34, 14],
            [60, 46, 12],
            [74, 38, 10],
            [86, 52, 14],
          ].map(([x, y, w], i) => (
            <Rect key={`b${i}`} x={x} y={y} width={w} height={100 - y} fill={C.track} />
          ))}
          {[
            [0, 66, 12],
            [12, 58, 14],
            [27, 70, 12],
            [40, 56, 16],
            [57, 64, 13],
            [71, 60, 12],
            [84, 68, 16],
          ].map(([x, y, w], i) => (
            <G key={`f${i}`}>
              <Rect x={x} y={y} width={w} height={100 - y} fill={X.consoleBar} />
              {Array.from({ length: Math.floor((w - 2) / 4) }, (_, a) =>
                Array.from({ length: Math.floor((96 - y) / 5) }, (_, b) => {
                  const o = lit(i * 3 + a, b);
                  return o ? <Rect key={`${a}-${b}`} x={x + 2 + a * 4} y={y + 3 + b * 5} width={2} height={2.4} fill={C.gold} opacity={o} /> : null;
                }),
              )}
            </G>
          ))}
        </>
      )}

      {day &&
        clouds &&
        [
          [16, 14, 10],
          [52, 10, 14],
          [88, 30, 9],
        ].map(([x, y, w], i) => <Ellipse key={i} cx={x} cy={y} rx={w} ry={w * 0.32} fill={X.white} opacity={0.85} />)}
    </Svg>
  );
}

export function WindowView({ id, width, height }: { id: string; width: number; height: number }) {
  const spec: WindowSpec = WINDOW_SPEC[id] ?? WINDOW_SPEC['window-earth-day'];
  if (spec.kind === 'scene') return <EarthScene scene={spec.scene} width={width} height={height} />;
  const cx = width / 2;
  const cy = height * 1.3;
  const R = Math.hypot(cx, cy);
  const gid = `w-${id}-${width}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`${gid}-a`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.1" stopColor={X.space} />
          <Stop offset="0.45" stopColor={C.teal} />
          <Stop offset="0.6" stopColor={X.loginEarth2} />
        </LinearGradient>
        <RadialGradient id={`${gid}-n`} cx="30%" cy="30%" r="75%">
          <Stop offset="0" stopColor={C.primary} />
          <Stop offset="0.4" stopColor={C.teal} />
          <Stop offset="1" stopColor={X.space} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill={X.space} />
      {spec.kind === 'planet' && (
        <>
          <Circle cx={cx} cy={cy} r={R * 0.54} fill={spec.rim} opacity={0.6} />
          <Circle cx={cx} cy={cy} r={R * 0.52} fill={spec.rim} />
          <Circle cx={cx} cy={cy} r={R * 0.48} fill={spec.planet} />
        </>
      )}
      {spec.kind === 'aurora' && <Rect width={width} height={height} fill={`url(#${gid}-a)`} />}
      {spec.kind === 'nebula' && <Rect width={width} height={height} fill={`url(#${gid}-n)`} />}
      {spec.kind === 'saturn' && (
        <G>
          <Circle cx={cx} cy={height * 0.55} r={Math.min(width, height) * 0.22} fill={spec.planet} />
          <Ellipse cx={cx} cy={height * 0.55} rx={width * 0.36} ry={height * 0.1} fill="none" stroke={spec.planet} strokeWidth={Math.max(2, height * 0.04)} />
        </G>
      )}
      {spec.kind === 'stars' &&
        [
          [0.2, 0.3],
          [0.7, 0.6],
          [0.45, 0.15],
          [0.85, 0.25],
          [0.3, 0.75],
          [0.6, 0.85],
        ].map(([x, y], i) => <Circle key={i} cx={x * width} cy={y * height} r={Math.max(1, width / 76)} fill={X.white} />)}
    </Svg>
  );
}

/** Wall / floor surface with its pattern. */
export function Surface({ spec, width, height }: { spec: SurfaceSpec; width: number; height: number }) {
  const lines: React.ReactNode[] = [];
  if (spec.stripes) {
    const [color, size, gap, angle] = spec.stripes;
    const step = size + gap;
    const diag = Math.hypot(width, height);
    for (let p = -diag; p < diag; p += step) {
      lines.push(<Rect key={p} x={p + size} y={-diag} width={gap} height={diag * 2} fill={color} />);
    }
    return (
      <Svg width={width} height={height}>
        <Rect width={width} height={height} fill={spec.base} />
        <G transform={`rotate(${90 - angle} ${width / 2} ${height / 2})`}>{lines}</G>
      </Svg>
    );
  }
  return (
    <Svg width={width} height={height}>
      <Rect width={width} height={height} fill={spec.base} />
      {spec.checker
        ? Array.from({ length: Math.ceil(width / 8) }, (_, i) =>
            Array.from({ length: Math.ceil(height / 8) }, (_, j) =>
              (i + j) % 2 === 0 ? <Rect key={`${i}-${j}`} x={i * 8} y={j * 8} width={8} height={8} fill={spec.checker} /> : null,
            ),
          )
        : null}
      {spec.dots ? <Circle cx={width * 0.3} cy={height * 0.4} r={1.5} fill={X.white} /> : null}
      {spec.topGlow ? <Rect width={width} height={3} fill={spec.topGlow} /> : null}
    </Svg>
  );
}

export const wallSpec = (id: string) => WALL_SPEC[id] ?? WALL_SPEC['wall-lilac'];
export const floorSpec = (id: string) => FLOOR_SPEC[id] ?? FLOOR_SPEC['floor-teal'];

/** 76×52 rounded swatch for room items. */
export function RoomSwatch({ id, category }: { id: string; category: 'window' | 'wall' | 'floor' }) {
  return (
    <View style={{ width: 76, height: 52, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: X.swatchBorder }}>
      {category === 'window' ? (
        <WindowView id={id} width={76} height={52} />
      ) : (
        <Surface spec={category === 'wall' ? wallSpec(id) : floorSpec(id)} width={76} height={52} />
      )}
    </View>
  );
}

export function ItemArt({ id, category, size = 44 }: { id: string; category: string; size?: number }) {
  if (category === 'helmet') return <HelmetIcon color={HELMET_COLOR[id]} size={size} />;
  if (category === 'suit') return <SuitIcon color={SUIT_COLOR[id]} size={size} />;
  if (category === 'pet') return <PetArt id={id} size={size} />;
  return <RoomSwatch id={id} category={category as 'window' | 'wall' | 'floor'} />;
}
