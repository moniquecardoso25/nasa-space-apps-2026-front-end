import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { C } from '@/theme/tokens';

/**
 * 24×24 stroke icons extracted from docs/design/source/*.dc.html
 * (same paths as the design, so they match the screenshots exactly).
 */
type Shape =
  | { p: string }
  | { c: [number, number, number] }
  | { r: [number, number, number, number, number]; t?: string }
  | { e: [number, number, number, number]; t?: string };

const ICONS = {
  coin: [{ c: [12, 12, 8] }, { p: 'M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4' }],
  coinLarge: [{ c: [12, 12, 9] }, { p: 'M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4' }],
  trophy: [{ p: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M10 17h4' }],
  chevronRight: [{ p: 'M9 6l6 6-6 6' }],
  chevronLeft: [{ p: 'M15 6l-6 6 6 6' }],
  chevronDown: [{ p: 'M6 9l6 6 6-6' }],
  home: [{ p: 'M3 11l9-7 9 7v9H3z' }],
  status: [{ p: 'M5 20V10M12 20V4M19 20v-7' }],
  orbi: [{ p: 'M4 5h16v11H9l-5 4z' }, { p: 'M9 10.5h.01M15 10.5h.01' }],
  send: [{ p: 'M4 12l16-8-6 16-3-6z' }],
  user: [{ c: [12, 8, 4] }, { p: 'M4 21a8 8 0 0 1 16 0' }],
  heart: [{ p: 'M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-3 4.5 4.5 0 0 1 9 3c-2 4.5-9 9-9 9z' }],
  clock: [{ c: [12, 12, 9] }, { p: 'M12 7v5l3 2' }],
  bone: [{ p: 'M7 4a2.5 2.5 0 0 0-2 4l11 11a2.5 2.5 0 1 0 4-2 2.5 2.5 0 1 0-2-4L7 2' }],
  check: [{ p: 'M5 12l5 5 9-10' }],
  muscle: [{ p: 'M4 15c2-6 6-9 9-9 2 0 2 3 0 3-2 0-3 2-2 4 3-2 7-1 8 2 1 4-5 6-10 5-3 0-5-2-5-5z' }],
  zap: [{ p: 'M13 2L4 14h7l-1 8 9-12h-7z' }],
  activity: [{ p: 'M3 12h4l3-8 4 16 3-8h4' }],
  bandage: [{ r: [2, 8, 20, 8, 4], t: 'rotate(-45 12 12)' }, { p: 'M10 10h.01M14 14h.01M12 12h.01' }],
  camera: [{ r: [3, 7, 18, 13, 2] }, { c: [12, 13.5, 3.5] }, { p: 'M9 7l1.5-3h3L15 7' }],
  alert: [{ p: 'M12 3l10 18H2z' }, { p: 'M12 10v5M12 18h.01' }],
  lock: [{ r: [4, 11, 16, 10, 2] }, { p: 'M8 11V7a4 4 0 0 1 8 0v4' }],
  crew: [{ c: [9, 8, 3.5] }, { p: 'M2 20a7 7 0 0 1 14 0' }, { p: 'M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 4 6' }],
  planet: [{ c: [12, 12, 5] }, { e: [12, 12, 10, 3.5], t: 'rotate(-20 12 12)' }],
  calendar: [{ r: [3, 5, 18, 16, 2] }, { p: 'M3 10h18M8 3v4M16 3v4' }],
  thermometer: [{ p: 'M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z' }],
  gauge: [{ p: 'M4 16a8 8 0 1 1 16 0' }, { p: 'M12 16l4-5' }],
  sun: [{ c: [12, 12, 4] }, { p: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5' }],
  volume: [{ p: 'M4 9h4l5-4v14l-5-4H4z' }, { p: 'M16 9a4 4 0 0 1 0 6' }],
  radiation: [
    { c: [12, 12, 3] },
    { p: 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8' },
  ],
  minus: [{ p: 'M5 12h14' }],
  plus: [{ p: 'M12 5v14M5 12h14' }],
  smile: [{ c: [12, 12, 9] }, { p: 'M8 14s1.5 2 4 2 4-2 4-2' }, { p: 'M9 9.5h.01M15 9.5h.01' }],
  moon: [{ p: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' }],
  utensils: [{ p: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10' }, { p: 'M17 3c-2.5 2-2.5 7 0 9v9' }],
  leaf: [{ p: 'M5 20c9 0 14-6 14-16C9 4 5 10 5 16z' }, { p: 'M5 20l8-8' }],
  star: [{ p: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' }],
  paperclip: [{ p: 'M20 11l-8 8a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7' }],
  band: [{ r: [7, 2, 10, 20, 4] }, { r: [8.5, 8, 7, 8, 1.5] }],
  journal: [{ p: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z' }, { p: 'M5 17a3 3 0 0 1 3-3h10' }],
  eyeOff: [
    {
      p: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 4.4-1',
    },
  ],
  mic: [{ r: [9, 3, 6, 11, 3] }, { p: 'M5 11a7 7 0 0 0 14 0M12 18v3' }],
  play: [{ p: 'M7 4l13 8-13 8z' }],
  // added for voice mode / voice notes (same 24px stroke style)
  pause: [{ p: 'M8 5v14M16 5v14' }],
  stop: [{ r: [6, 6, 12, 12, 2] }],
  close: [{ p: 'M6 6l12 12M18 6L6 18' }],
  trash: [{ p: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' }],
  wave: [{ p: 'M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0' }],
  brain: [
    {
      p: 'M12 5a3 3 0 0 0-5.5 1.5A3 3 0 0 0 4 11a3 3 0 0 0 1.5 5A3 3 0 0 0 12 18zM12 5a3 3 0 0 1 5.5 1.5A3 3 0 0 1 20 11a3 3 0 0 1-1.5 5A3 3 0 0 1 12 18z',
    },
  ],
  flame: [{ p: 'M12 3c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-7z' }],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;
export const iconNames = Object.keys(ICONS) as IconName[];

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number; fill?: string };

export function Icon({ name, size = 20, color = C.text, strokeWidth = 2, fill = 'none' }: Props) {
  const shapes: Shape[] = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {shapes.map((s, i) => {
        if ('p' in s) return <Path key={i} d={s.p} />;
        if ('c' in s) return <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} />;
        if ('r' in s)
          return (
            <Rect key={i} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx={s.r[4]} transform={s.t} />
          );
        return <Ellipse key={i} cx={s.e[0]} cy={s.e[1]} rx={s.e[2]} ry={s.e[3]} transform={s.t} />;
      })}
    </Svg>
  );
}
