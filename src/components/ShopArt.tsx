import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FLOOR_SPEC, HELMET_COLOR, JELLY_COLOR, SUIT_COLOR, WALL_SPEC, WINDOW_SPEC, type SurfaceSpec, type WindowSpec } from '@/data/shopArt';
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
export function WindowView({ id, width, height }: { id: string; width: number; height: number }) {
  const spec: WindowSpec = WINDOW_SPEC[id] ?? WINDOW_SPEC['window-earth-day'];
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
