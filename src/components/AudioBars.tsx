import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { C } from '@/theme/tokens';

import { useLoop } from './Space';

function Bar({ i, n, level, t, height, color, width }: { i: number; n: number; level: SharedValue<number>; t: SharedValue<number>; height: number; color: string; width: number }) {
  const env = 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / n); // taller in the middle
  const style = useAnimatedStyle(() => {
    const a = t.value * Math.PI * 2;
    const wobble = 0.55 + 0.45 * Math.sin(a * 3 + i * 0.9) * Math.sin(a * 2 + i * 0.37);
    const v = Math.min(1, level.value * env * (0.55 + 0.45 * wobble));
    return { height: width + (height - width) * v };
  });
  return <Animated.View style={[{ width, borderRadius: width / 2, backgroundColor: color }, style]} />;
}

/**
 * Live audio bars (voice mode, voice notes). `level` 0…1 drives the height:
 * mic input while listening, a synthetic level while Orbi speaks.
 * Reduced motion → the wobble stops (bars still follow the level).
 */
export function AudioBars({ level, color = C.teal, bars = 24, height = 56, barWidth = 5 }: { level: SharedValue<number>; color?: string; bars?: number; height?: number; barWidth?: number }) {
  const t = useLoop(2400);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height, flexDirection: 'row', alignItems: 'center', gap: barWidth * 0.8 }}>
      {Array.from({ length: bars }, (_, i) => (
        <Bar key={i} i={i} n={bars} level={level} t={t} height={height} color={color} width={barWidth} />
      ))}
    </View>
  );
}
