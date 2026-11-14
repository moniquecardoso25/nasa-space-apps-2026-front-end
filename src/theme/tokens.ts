// CosmoMedic · Nebula Glass design tokens
// Copied from docs/design/tokens/tokens.ts (keep in sync).
// The `ext` block below holds values that appear in docs/design/source/*.dc.html
// but are not part of the original token file (scene/illustration colors, alpha
// variants, a few font sizes). Nothing here is invented: every value comes from
// the design source CSS.
export const tokens = {
  color: {
    bg: '#0B0B24',
    bgScene: '#121038',
    floor: '#17154A',
    surface: 'rgba(30,27,78,0.78)',
    surfaceSolid: '#1A1848',
    border: 'rgba(150,140,255,0.30)',
    text: '#F1EFFF',
    muted: '#ABA8D8',
    track: '#2A2766',
    primary: '#8B7CFF',
    onPrimary: '#0B0B24',
    primarySoft: 'rgba(139,124,255,0.18)',
    teal: '#3DE0C8',
    gold: '#FFC94D',
    onGold: '#1A1405',
    success: '#5EE0A0',
    warning: '#FF9F5A',
    danger: '#FF7A93',
    holoOk: '#39FF9F',
    holoWarn: '#FFC94D',
    holoAlert: '#FF6B8B',
    mood: {
      great: '#5EE0A0',
      good: '#3DE0C8',
      okay: '#FFC94D',
      tired: '#FF9F5A',
      stressed: '#FF7A93',
    },
  },
  font: {
    heading: 'Sora',
    body: 'Inter',
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    size: {
      display: 28,
      title: 22,
      screenTitle: 17,
      body: 15,
      small: 13,
      caption: 12,
      tiny: 11,
    },
  },
  radius: {
    card: 18,
    item: 14,
    small: 12,
    pill: 999,
    tabBar: 22,
    sheet: 26,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    screenX: 16,
  },
  size: {
    touch: 44,
    button: 54,
    input: 48,
    chip: 36,
    screenW: 390,
    screenH: 844,
  },
  shadow: {
    card: '0 8px 24px rgba(5,5,25,0.45)',
    primaryGlow: '0 0 24px rgba(139,124,255,0.40)',
    goldGlow: '0 0 22px rgba(255,201,77,0.35)',
    footer: '0 -10px 24px rgba(5,5,25,0.55)',
  },
  fontsPackages: ['@expo-google-fonts/sora', '@expo-google-fonts/inter'],

  // ---- Extracted from docs/design/source (not in the original token file) ----
  ext: {
    color: {
      // glass/alpha variants used across screens
      chrome: 'rgba(18,16,56,0.9)', // Home top buttons
      menu: 'rgba(18,16,56,0.97)', // Home log menu
      borderSoft: 'rgba(150,140,255,0.18)', // sticky footer top border
      tealSoft: 'rgba(61,224,200,0.12)', // active tab bg
      tealChip: 'rgba(61,224,200,0.14)', // selected chip bg
      holoOkSoft: 'rgba(57,255,159,0.10)', // "Logged today" bg
      readOnlyBg: 'rgba(171,168,216,0.07)', // read-only Field bg
      readOnlyBorder: 'rgba(171,168,216,0.35)', // read-only Field dashed border
      mutedSoft: 'rgba(171,168,216,0.16)', // small info badge bg
      goldSoft: 'rgba(255,201,77,0.14)',
      goldBanner: 'rgba(255,201,77,0.12)', // Messages delay banner bg
      goldBannerBorder: 'rgba(255,201,77,0.4)',
      dangerIcon: 'rgba(255,122,147,0.12)', // injury icon tile
      dangerSoft: 'rgba(255,122,147,0.14)',
      shadowDeep: 'rgba(5,5,25,0.7)',
      overlay: 'rgba(0,0,0,0.45)', // Bolt floor shadow
      white: '#FFFFFF',
      // Crew status hologram
      holoGrid: 'rgba(57,255,159,0.06)',
      holoFill: 'rgba(57,255,159,0.08)',
      holoBeam: 'rgba(57,255,159,0.16)',
      holoBorder: 'rgba(57,255,159,0.35)',
      holoGlow: 'rgba(57,255,159,0.45)',
      scanline: 'rgba(11,11,36,0.35)',
      calloutBg: 'rgba(8,20,24,0.6)',
      calloutBgHot: 'rgba(8,20,24,0.85)',
      selectedDay: 'rgba(139,124,255,0.22)',
      streakFlame: '#7A3A00',
      streakEmpty: '#7A5A10',
      // station scene
      windowRing: 'rgba(150,140,255,0.35)',
      windowInset: 'rgba(0,0,0,0.6)',
      floorGlow: 'rgba(61,224,200,0.35)',
      potBorder: 'rgba(150,140,255,0.4)',
      space: '#04041A',
      console: '#22205A',
      consoleBar: '#3A3780',
      plantDark: '#2DBE85',
      plantMid: '#43D39A',
      // Login Earth
      loginEarth1: '#3B82F6',
      loginEarth2: '#1E40AF',
      loginEarth3: '#0B1E5B',
      earthGlow: 'rgba(61,224,200,0.45)',
      earthGlowHome: 'rgba(61,224,200,0.55)',
      loginCard: 'rgba(18,16,56,0.86)',
      logoGlow: 'rgba(139,124,255,0.35)',
      earthLight: '#5AA8FF',
      earthMid: '#2066DA',
      earthDeep: '#0D3480',
      earthEdge: '#071A47',
      land: '#2F8F5B',
      landLight: '#3E9F68',
      sand: '#C9A86A',
      // Bolt
      suit: '#E6E4F5',
      suitShade: '#BDB8E8',
      boot: '#B9B5E0',
      visor: '#1A1848',
    },
    fontSize: {
      label: 14, // card titles, menu rows
      stat: 20, // stat numbers, greeting
      h1: 24, // onboarding headings
      brand: 26, // login wordmark
    },
    radius: {
      panel: 24, // login card, avatar stage
      button: 16, // Home top buttons
    },
    shadow: {
      tabBar: '0 8px 30px rgba(5,5,25,0.6)',
      menu: '0 16px 40px rgba(5,5,25,0.7)',
    },
  },
} as const;

export type Tokens = typeof tokens;
export const C = tokens.color;
export const X = tokens.ext.color;
export default tokens;
