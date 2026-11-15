import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { C, tokens } from '@/theme/tokens';
import type { VoiceGate } from '@/voice/useVoiceGate';

import { Txt } from './Txt';

/**
 * Shown while the on-device voice model downloads / warms up (first use), or
 * when it failed. Nothing is shown once voice is ready or not needed.
 */
export function VoicePrep({ gate }: { gate: VoiceGate }) {
  if (!gate.needs || gate.ready) return null;
  if (gate.status === 'error') {
    return (
      <Pressable accessibilityRole="button" onPress={gate.retry} style={styles.row}>
        <Txt size={tokens.font.size.caption} color={C.warning}>
          Voice couldn’t load. Check your connection ·{' '}
          <Txt weight="700" size={tokens.font.size.caption} color={C.teal}>
            Retry
          </Txt>
        </Txt>
      </Pressable>
    );
  }
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={C.teal} />
      <Txt size={tokens.font.size.caption} color={C.teal} style={{ flex: 1 }}>
        {gate.progress >= 0.99
          ? 'Voice almost ready (setting up on this device)… · you can type meanwhile'
          : `Preparing voice (one time only)… ${Math.round(gate.progress * 100)}% · you can type meanwhile`}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
