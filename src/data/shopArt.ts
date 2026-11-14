/**
 * Visual "assets" of shop items. `shop.json` points to sprite paths that do not
 * exist yet, so items are drawn in SVG from these specs. Every color/pattern is
 * taken from docs/design/source/AppAvatar*.dc.html.
 */
import type { Equipped } from './types';

export const HELMET_COLOR: Record<string, string> = {
  'helmet-classic': '#E6E4F5',
  'helmet-nebula': '#B9A8FF',
  'helmet-solar': '#FFD27A',
  'helmet-aurora': '#7DF2DE',
  'helmet-mars-red': '#FF8A70',
  'helmet-stealth': '#3A3780',
};

export const SUIT_COLOR: Record<string, string> = {
  'suit-standard': '#E6E4F5',
  'suit-flight-blue': '#6EA8FF',
  'suit-orange-eva': '#FF9F5A',
  'suit-lilac': '#B9A8FF',
  'suit-gold-trim': '#FFD27A',
  'suit-night': '#3A3780',
};

/** Jelly-bot body color (AppAvatarPets). */
export const JELLY_COLOR = '#FF8AC8';

export type WindowSpec =
  | { kind: 'planet'; planet: string; rim: string; sky: string }
  | { kind: 'aurora' }
  | { kind: 'saturn'; planet: string }
  | { kind: 'nebula' }
  | { kind: 'stars' };

export const WINDOW_SPEC: Record<string, WindowSpec> = {
  'window-earth-day': { kind: 'planet', planet: '#2066DA', rim: 'rgba(61,224,200,0.7)', sky: '#04041A' },
  'window-earth-night': { kind: 'planet', planet: '#0B1E5B', rim: 'rgba(255,201,77,0.6)', sky: '#04041A' },
  'window-sunrise': { kind: 'planet', planet: '#1E40AF', rim: '#FFB86B', sky: '#04041A' },
  'window-aurora': { kind: 'aurora' },
  'window-moon': { kind: 'planet', planet: '#B8B8C8', rim: 'rgba(255,255,255,0.3)', sky: '#04041A' },
  'window-mars': { kind: 'planet', planet: '#D0623C', rim: 'rgba(255,160,120,0.5)', sky: '#04041A' },
  'window-saturn': { kind: 'saturn', planet: '#E8C98A' },
  'window-nebula': { kind: 'nebula' },
  'window-deep-stars': { kind: 'stars' },
};

export type SurfaceSpec = {
  base: string;
  /** repeating stripes: [color, size, gap, angleDeg] */
  stripes?: [string, number, number, number];
  dots?: boolean;
  checker?: string;
  topGlow?: string;
};

export const WALL_SPEC: Record<string, SurfaceSpec> = {
  'wall-lilac': { base: '#121038', stripes: ['#1A1848', 24, 2, 90] },
  'wall-steel': { base: '#3A4252' },
  'wall-wood': { base: '#6B4A32', stripes: ['#5C3F2A', 8, 2, 0] },
  'wall-starlight': { base: '#1A1848', dots: true },
  'wall-mint': { base: '#1F4A44' },
  'wall-coral': { base: '#5A2E3A' },
  'wall-hex': { base: '#22205A', stripes: ['#2A2766', 10, 2, 60] },
};

export const FLOOR_SPEC: Record<string, SurfaceSpec> = {
  'floor-teal': { base: '#17154A', topGlow: '#3DE0C8' },
  'floor-grid': { base: '#22262E', stripes: ['#2E333C', 14, 2, 90] },
  'floor-carpet': { base: '#5A3E6E' },
  'floor-metal': { base: '#4A505C', stripes: ['#424854', 6, 2, 45] },
  'floor-wood': { base: '#6B4A32', stripes: ['#5C3F2A', 20, 2, 90] },
  'floor-checker': { base: '#17154A', checker: '#2A2766' },
};

/** Mixes a hex color with the app background (used for suit shading). */
export function shade(hex: string, amount = 0.2) {
  const n = parseInt(hex.slice(1), 16);
  const bg = [0x0b, 0x0b, 0x24];
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v * (1 - amount) + bg[i] * amount));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Bolt colors for the equipped helmet + suit. */
export function boltColors(eq: Pick<Equipped, 'helmet' | 'suit'>) {
  const suit = SUIT_COLOR[eq.suit] ?? SUIT_COLOR['suit-standard'];
  const helmet = HELMET_COLOR[eq.helmet] ?? HELMET_COLOR['helmet-classic'];
  return {
    suit,
    helmet,
    shade: shade(suit, 0.18),
    boot: shade(suit, 0.22),
    visor: '#1A1848',
    accent: '#8B7CFF',
  };
}
