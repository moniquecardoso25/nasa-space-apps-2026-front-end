import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { Icon, type IconName } from '@/components/Icon';
import { Toggle } from '@/components/Inputs';
import { OnboardingShell } from '@/components/Onboarding';
import { Badge } from '@/components/Pills';
import { Txt } from '@/components/Txt';
import { getAstronaut, pairDevice } from '@/data/api';
import { session } from '@/data/session';
import { useData } from '@/data/store';
import { C, tokens, X } from '@/theme/tokens';

type DeviceState = 'demo' | 'none';

/**
 * Honest device state for the hackathon: nothing talks to real hardware yet.
 * "Demo" = simulated readings (with the last simulated sync), "Not available" = type values.
 */
function DeviceStatus({ state, sync }: { state: DeviceState; sync?: string }) {
  const demo = state === 'demo';
  return (
    <View style={styles.status}>
      <Badge label={demo ? 'Demo' : 'Not available'} color={demo ? C.gold : C.muted} bg={demo ? X.goldSoft : X.mutedSoft} />
      {demo && sync ? (
        <Txt size={tokens.font.size.tiny} color={C.muted}>
          Last sync {sync}
        </Txt>
      ) : null}
    </View>
  );
}

function DeviceRow({ icon, title, sub, right }: { icon: IconName; title: string; sub: string; right: React.ReactNode }) {
  return (
    <Card style={styles.device} padding={14}>
      <View style={styles.iconTile}>
        <Icon name={icon} size={22} color={C.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="700" size={tokens.ext.fontSize.label}>
          {title}
        </Txt>
        <Txt size={tokens.font.size.caption} color={C.muted}>
          {sub}
        </Txt>
      </View>
      {right}
    </Card>
  );
}

/** Onboarding 4 · Devices. States are Demo (simulated readings) or Not available; no real pairing. */
export default function Onb4() {
  const me = useData(() => getAstronaut());
  const [paired, setPaired] = useState(me.devices.bpCuff || session.bpCuffPaired);
  const [reminders, setReminders] = useState(session.reminders);
  return (
    <OnboardingShell
      step={4}
      stepLabel="Devices"
      title="Connect your devices"
      intro="In this demo, readings are simulated: no real hardware is connected. Orbi pre-fills them and you only confirm."
      cta="Continue"
      onCta={() => {
        session.reminders = reminders;
        router.push('/onboarding/5');
      }}>
      <View style={{ gap: 12 }}>
        <DeviceRow
          icon="band"
          title="ARCHeR wrist band"
          sub="Sleep, movement, light exposure"
          right={me.devices.wristBand.paired ? <DeviceStatus state="demo" sync="06:02" /> : <PrimaryButton size="sm" label="Pair" onPress={() => pairDevice('wristBandPaired')} />}
        />
        <DeviceRow
          icon="radiation"
          title="Personal dosimeter"
          sub={`Badge ID ${me.devices.dosimeterBadgeId}`}
          right={<DeviceStatus state="demo" sync="08:00" />}
        />
        <DeviceRow
          icon="heart"
          title="Blood pressure cuff"
          sub={paired ? 'Simulated readings' : 'Optional · or type values'}
          right={
            paired ? (
              <DeviceStatus state="demo" sync="now" />
            ) : (
              <PrimaryButton
                size="sm"
                label="Use demo"
                onPress={async () => {
                  await pairDevice('bpCuff');
                  session.bpCuffPaired = true;
                  setPaired(true);
                }}
              />
            )
          }
        />
        <Card style={styles.device} padding={14}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt weight="700" size={tokens.ext.fontSize.label}>
              Daily reminders
            </Txt>
            <Txt size={tokens.font.size.caption} color={C.muted}>
              Check-in at 08:00 · wind-down at 21:00
            </Txt>
          </View>
          <Toggle value={reminders} onChange={setReminders} label="Daily reminders" />
        </Card>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  device: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconTile: { width: 44, height: 44, borderRadius: tokens.radius.item, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  status: { alignItems: 'flex-end', gap: 3 },
});
