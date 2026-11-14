// CosmoMedic · Nebula Glass design tokens
// Fonts: npx expo install @expo-google-fonts/sora @expo-google-fonts/inter expo-font
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
  ]
} as const;
export type Tokens = typeof tokens;
export default tokens;
