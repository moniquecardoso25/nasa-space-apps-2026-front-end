import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';

/** Font files loaded at startup (see src/app/_layout.tsx). */
export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Sora_600SemiBold,
  Sora_700Bold,
};

export type Weight = '400' | '500' | '600' | '700';
export type Family = 'heading' | 'body';

const inter: Record<Weight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};
const sora: Record<Weight, string> = {
  '400': 'Sora_600SemiBold',
  '500': 'Sora_600SemiBold',
  '600': 'Sora_600SemiBold',
  '700': 'Sora_700Bold',
};

/**
 * Custom fonts on Android need one family per weight, so we resolve
 * family + weight into the loaded font name instead of using fontWeight.
 */
export function fontFamily(family: Family = 'body', weight: Weight = '400') {
  return family === 'heading' ? sora[weight] : inter[weight];
}
