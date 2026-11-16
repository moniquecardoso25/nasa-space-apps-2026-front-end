// Orbi · Nebula Glass design tokens
// Fonts: npx expo install @expo-google-fonts/sora @expo-google-fonts/inter expo-font
// Mirrors src/theme/tokens.ts (the app copy). `ext` holds values taken from source/*.dc.html
// that were not in the first token file (scene colors, alpha variants, a few sizes).
export const tokens = {
  "color": {
    "bg": "#0B0B24",
    "bgScene": "#121038",
    "floor": "#17154A",
    "surface": "rgba(30,27,78,0.78)",
    "surfaceSolid": "#1A1848",
    "border": "rgba(150,140,255,0.30)",
    "text": "#F1EFFF",
    "muted": "#ABA8D8",
    "track": "#2A2766",
    "primary": "#8B7CFF",
    "onPrimary": "#0B0B24",
    "primarySoft": "rgba(139,124,255,0.18)",
    "teal": "#3DE0C8",
    "gold": "#FFC94D",
    "onGold": "#1A1405",
    "success": "#5EE0A0",
    "warning": "#FF9F5A",
    "danger": "#FF7A93",
    "holoOk": "#39FF9F",
    "holoWarn": "#FFC94D",
    "holoAlert": "#FF6B8B",
    "mood": {
      "great": "#5EE0A0",
      "good": "#3DE0C8",
      "okay": "#FFC94D",
      "tired": "#FF9F5A",
      "stressed": "#FF7A93"
    }
  },
  "font": {
    "heading": "Sora",
    "body": "Inter",
    "weights": {
      "regular": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    },
    "size": {
      "display": 28,
      "title": 22,
      "screenTitle": 17,
      "body": 15,
      "small": 13,
      "caption": 12,
      "tiny": 11
    }
  },
  "radius": {
    "card": 18,
    "item": 14,
    "small": 12,
    "pill": 999,
    "tabBar": 22,
    "sheet": 26
  },
  "space": {
    "xs": 4,
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 24,
    "screenX": 16
  },
  "size": {
    "touch": 44,
    "button": 54,
    "input": 48,
    "chip": 36,
    "screenW": 390,
    "screenH": 844
  },
  "shadow": {
    "card": "0 8px 24px rgba(5,5,25,0.45)",
    "primaryGlow": "0 0 24px rgba(139,124,255,0.40)",
    "goldGlow": "0 0 22px rgba(255,201,77,0.35)",
    "footer": "0 -10px 24px rgba(5,5,25,0.55)"
  },
  "fontsPackages": [
    "@expo-google-fonts/sora",
    "@expo-google-fonts/inter"
  ],
  "ext": {
    "color": {
      "chrome": "rgba(18,16,56,0.9)",
      "menu": "rgba(18,16,56,0.97)",
      "borderSoft": "rgba(150,140,255,0.18)",
      "tealSoft": "rgba(61,224,200,0.12)",
      "tealChip": "rgba(61,224,200,0.14)",
      "holoOkSoft": "rgba(57,255,159,0.10)",
      "readOnlyBg": "rgba(171,168,216,0.07)",
      "readOnlyBorder": "rgba(171,168,216,0.35)",
      "mutedSoft": "rgba(171,168,216,0.16)",
      "goldSoft": "rgba(255,201,77,0.14)",
      "goldBanner": "rgba(255,201,77,0.12)",
      "goldBannerBorder": "rgba(255,201,77,0.4)",
      "dangerIcon": "rgba(255,122,147,0.12)",
      "dangerNote": "rgba(255,122,147,0.10)",
      "dangerNoteBorder": "rgba(255,122,147,0.4)",
      "warningSoft": "rgba(255,159,90,0.12)",
      "sleepDeep": "#5B4FD9",
      "playGlow": "rgba(139,124,255,0.6)",
      "swatchBorder": "rgba(255,255,255,0.15)",
      "podiumGold": "rgba(255,201,77,0.16)",
      "dangerSoft": "rgba(255,122,147,0.14)",
      "shadowDeep": "rgba(5,5,25,0.7)",
      "overlay": "rgba(0,0,0,0.45)",
      "white": "#FFFFFF",
      "holoGrid": "rgba(57,255,159,0.06)",
      "holoFill": "rgba(57,255,159,0.08)",
      "holoBeam": "rgba(57,255,159,0.16)",
      "holoBorder": "rgba(57,255,159,0.35)",
      "holoGlow": "rgba(57,255,159,0.45)",
      "scanline": "rgba(11,11,36,0.35)",
      "calloutBg": "rgba(8,20,24,0.6)",
      "calloutBgHot": "rgba(8,20,24,0.85)",
      "selectedDay": "rgba(139,124,255,0.22)",
      "streakFlame": "#7A3A00",
      "streakEmpty": "#7A5A10",
      "windowRing": "rgba(150,140,255,0.35)",
      "windowInset": "rgba(0,0,0,0.6)",
      "floorGlow": "rgba(61,224,200,0.35)",
      "potBorder": "rgba(150,140,255,0.4)",
      "space": "#04041A",
      "console": "#22205A",
      "consoleBar": "#3A3780",
      "plantDark": "#2DBE85",
      "plantMid": "#43D39A",
      "loginEarth1": "#3B82F6",
      "loginEarth2": "#1E40AF",
      "loginEarth3": "#0B1E5B",
      "earthGlow": "rgba(61,224,200,0.45)",
      "earthGlowHome": "rgba(61,224,200,0.55)",
      "loginCard": "rgba(18,16,56,0.86)",
      "logoGlow": "rgba(139,124,255,0.35)",
      "earthLight": "#5AA8FF",
      "earthMid": "#2066DA",
      "earthDeep": "#0D3480",
      "earthEdge": "#071A47",
      "land": "#2F8F5B",
      "landLight": "#3E9F68",
      "sand": "#C9A86A",
      "suit": "#E6E4F5",
      "suitShade": "#BDB8E8",
      "boot": "#B9B5E0",
      "visor": "#1A1848"
    },
    "fontSize": {
      "label": 14,
      "stat": 20,
      "h1": 24,
      "hero": 32,
      "brand": 26,
      "nameplate": 18
    },
    "radius": {
      "panel": 24,
      "button": 16
    },
    "shadow": {
      "tabBar": "0 8px 30px rgba(5,5,25,0.6)",
      "menu": "0 16px 40px rgba(5,5,25,0.7)"
    }
  }
} as const;
export type Tokens = typeof tokens;
export default tokens;
