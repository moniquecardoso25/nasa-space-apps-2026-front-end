import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logout, refreshData } from '@/data/api';
import { useSyncStatus } from '@/data/sync';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { C, tokens } from '@/theme/tokens';

import { SecondaryButton } from './Buttons';
import { Txt } from './Txt';

/** Refresh remote replies and mission data while the session is open. */
export function ConnectionStatus() {
  const insets = useSafeAreaInsets();
  const action = useAsyncAction();
  const status = useSyncStatus();
  const warning = status.problem;
  const offline = !status.online;
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={{ flex: 1 }}>
        <Txt size={tokens.font.size.tiny} color={offline || warning ? C.gold : C.muted}>
          {warning ?? (offline ? 'Offline. Changes are saved on this device.' : 'Connected to Mission Control')}
        </Txt>
        {action.error ? <Txt size={tokens.font.size.tiny} color={C.danger}>{action.error}</Txt> : null}
      </View>
      <SecondaryButton compact label="Refresh" disabled={action.busy} onPress={() => { void action.run(refreshData); }} />
      <SecondaryButton compact label="Sign out" onPress={() => { void action.run(logout); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingBottom: 4, backgroundColor: C.bg },
});
