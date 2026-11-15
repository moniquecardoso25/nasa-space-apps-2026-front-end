import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getRefreshWarning, logout, refreshData } from '@/data/api';
import { useData } from '@/data/store';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { C, tokens } from '@/theme/tokens';

import { SecondaryButton } from './Buttons';
import { Txt } from './Txt';

/** Refresh remote replies and mission data while the session is open. */
export function ConnectionStatus() {
  const insets = useSafeAreaInsets();
  const action = useAsyncAction();
  const warning = useData(() => getRefreshWarning());
  const [offline, setOffline] = useState(false);
  const refresh = async () => {
    try { await refreshData(); setOffline(false); }
    catch (error) { setOffline(true); throw error; }
  };
  useEffect(() => {
    // No automatic retries of writes; reads alone are polled.
    let active = true;
    const timer = setInterval(() => {
      void refreshData().then(() => { if (active) setOffline(false); }).catch(() => { if (active) setOffline(true); });
    }, 60000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={{ flex: 1 }}>
        <Txt size={tokens.font.size.tiny} color={offline || warning ? C.gold : C.muted}>
          {warning ?? (offline ? 'Connection unavailable. Showing last loaded data.' : 'Connected to Mission Control')}
        </Txt>
        {action.error ? <Txt size={tokens.font.size.tiny} color={C.danger}>{action.error}</Txt> : null}
      </View>
      <SecondaryButton compact label="Refresh" disabled={action.busy} onPress={() => { void action.run(refresh); }} />
      <SecondaryButton compact label="Sign out" onPress={() => { void action.run(logout); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingBottom: 4, backgroundColor: C.bg },
});
