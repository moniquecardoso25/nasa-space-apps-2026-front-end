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
import { getAstronaut } from '@/data/api';
import { session } from '@/data/session';
import { useData } from '@/data/store';
import { C, tokens } from '@/theme/tokens';

function Connected() {
  return (
    <View style={styles.connected}>
      <Icon name="check" size={14} color={C.holoOk} strokeWidth={3} />
      <Txt weight="700" size={tokens.font.size.caption} color={C.holoOk}>
        Connected
      </Txt>
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

/** Onboarding 4 · Devices (pairing is simulated). */
export default function Onb4() {
  const me = useData(() => getAstronaut());
  const [paired, setPaired] = useState(me.devices.bpCuff || session.bpCuffPaired);
  const [reminders, setReminders] = useState(session.reminders);
  return (
    <OnboardingShell
      step={4}
      stepLabel="Devices"
      title="Connect your devices"
      intro="Your wrist band fills sleep data for you. Your dosimeter reading is copied in once a day."
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
          right={me.devices.wristBand.paired ? <Connected /> : <PrimaryButton size="sm" label="Pair" onPress={() => {}} />}
        />
        <DeviceRow icon="radiation" title="Personal dosimeter" sub={`Badge ID ${me.devices.dosimeterBadgeId}`} right={<Connected />} />
        <DeviceRow
          icon="heart"
          title="Blood pressure cuff"
          sub="Optional · or type values"
          right={
            paired ? (
              <Connected />
            ) : (
              <PrimaryButton
                size="sm"
                label="Pair"
                onPress={() => {
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
        <View style={{ alignItems: 'flex-start' }}>
          <Badge label="Simulated for the hackathon" />
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  device: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconTile: { width: 44, height: 44, borderRadius: tokens.radius.item, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  connected: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
