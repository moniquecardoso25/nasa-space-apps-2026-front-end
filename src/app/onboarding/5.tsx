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

/** Onboarding 5 · Companion: Bolt preview + name, and what Orbi can / cannot do (privacy, medical support). */
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
      onCta={() => {
        completeOnboarding(name);
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
      <View style={{ gap: 8 }}>
        <InfoNote icon="orbi" iconColor={C.teal} size={tokens.font.size.caption}>
          {b('Meet Orbi')}, your on-board assistant. It pre-fills your logs and explains your trends. It {b('does not diagnose')} and only
          talks when you open it.
        </InfoNote>
        <InfoNote icon="lock" iconColor={C.teal} size={tokens.font.size.caption}>
          {b('Journal')} mode shares summaries with your medical team. {b('Private')} mode saves nothing.
        </InfoNote>
        <InfoNote icon="heart" iconColor={C.teal} size={tokens.font.size.caption}>
          Need a doctor? Open {b('Messages')} and tap {b('Request medical support')}.
        </InfoNote>
      </View>
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
