import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';

import { Astronaut } from '@/components/Astronaut';
import { InfoNote } from '@/components/Card';
import { Field } from '@/components/Inputs';
import { OnboardingShell } from '@/components/Onboarding';
import { Txt } from '@/components/Txt';
import { completeOnboarding, getAstronaut } from '@/data/api';
import { session } from '@/data/session';
import { useData } from '@/data/store';
import { C, tokens } from '@/theme/tokens';

/** Onboarding 5 · Companion: Bolt preview + name. No color picker. */
export default function Onb5() {
  const me = useData(() => getAstronaut());
  const [name, setName] = useState(me.avatar.name || 'Bolt');
  const b = (t: string) => (
    <Txt weight="700" size={tokens.font.size.caption}>
      {t}
    </Txt>
  );
  return (
    <OnboardingShell
      step={5}
      stepLabel="Your companion"
      title="Meet your companion"
      intro="Everyone starts with the same astronaut. Keep logging to earn coins and customize it in the shop."
      cta="Start mission"
      onCta={async () => {
        await completeOnboarding(name);
        session.onboardedThisSession = true;
        router.replace('/home');
      }}>
      <View style={styles.stage}>
        <Svg width={158} height={28} style={styles.platform}>
          <Ellipse cx={79} cy={14} rx={78} ry={13} fill={C.primarySoft} stroke={C.primary} strokeWidth={1} />
        </Svg>
        <View style={styles.bolt}>
          <Astronaut state="idle" scale={1.2} />
        </View>
      </View>
      <Field label="Name" value={name} onChangeText={setName} maxLength={16} accessibilityLabel="Companion name" />
      <InfoNote icon="orbi" iconColor={C.teal} size={tokens.font.size.caption}>
        {b('Meet Orbi')}, your on-board AI. Talk in {b('Journal')} mode to keep a journal your medical team can see as summaries, or in{' '}
        {b('Private')} mode when you just need to vent.
      </InfoNote>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 210,
    borderRadius: tokens.ext.radius.panel,
    overflow: 'hidden',
    backgroundColor: C.bgScene,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  platform: { position: 'absolute', top: 169 },
  bolt: { position: 'absolute', top: 14 },
});
