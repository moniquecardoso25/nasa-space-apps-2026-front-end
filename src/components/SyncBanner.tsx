import { StyleSheet, View } from 'react-native';

import { useSyncStatus } from '@/data/sync';
import { C, tokens } from '@/theme/tokens';

import { Txt } from './Txt';

/**
 * One line above the tab bar that says where the data is:
 * nothing when everything is on the server; otherwise what is waiting and why.
 */
export function SyncBanner() {
  const s = useSyncStatus();
  let text: string | null = null;
  let color: string = C.muted;
  if (s.mode === 'mock') {
    text = 'Demo data · not connected to the server';
  } else if (!s.online) {
    text = s.pending ? `No link · ${s.pending} change${s.pending === 1 ? '' : 's'} saved on this device` : 'No link · showing the last data received';
    color = C.warning;
  } else if (s.problem) {
    text = s.problem;
    color = C.danger;
  } else if (s.pending) {
    text = `Sending ${s.pending} change${s.pending === 1 ? '' : 's'}…`;
  }
  if (!text) return null;
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite" accessibilityLabel={text}>
      <Txt size={tokens.font.size.caption} color={color} numberOfLines={2} style={styles.text}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingVertical: 4, alignItems: 'center' },
  text: { textAlign: 'center' },
});
