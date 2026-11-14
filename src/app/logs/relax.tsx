import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { ComingSoon, Greyed, LogScreen } from '@/components/LogKit';
import { LoginEarth } from '@/components/Space';
import { Txt } from '@/components/Txt';
import { C, X, tokens } from '@/theme/tokens';

const SESSIONS: { icon: IconName; title: string; min: number }[] = [
  { icon: 'leaf', title: 'Guided breathing', min: 3 },
  { icon: 'brain', title: 'Meditation', min: 5 },
  { icon: 'muscle', title: 'Muscle relaxation', min: 7 },
  { icon: 'sun', title: 'Mindful pause', min: 2 },
];

/** Relax · coming soon: reachable but greyed and not interactive. */
export default function Relax() {
  return (
    <LogScreen title="Relax" gap={14}>
      <ComingSoon>Guided sessions are not part of the first version.</ComingSoon>
      <Greyed style={{ gap: 14 }}>
        <View style={styles.hero}>
          <LoginEarth size={520} left={-80} top={90} />
          <View style={{ gap: 4, padding: 16 }}>
            <Txt weight="700" size={tokens.font.size.caption} color={C.teal}>
              RECOMMENDED BY ORBI
            </Txt>
            <Txt heading weight="700" size={tokens.ext.fontSize.stat}>
              Earth-view breathing
            </Txt>
            <Txt size={tokens.font.size.small} color={C.muted}>
              3 min · eases stress before sleep
            </Txt>
          </View>
          <View style={styles.play}>
            <Icon name="play" size={20} color={C.bg} />
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Txt weight="700" size={tokens.ext.fontSize.label}>
            Sessions
          </Txt>
          {SESSIONS.map((s) => (
            <View key={s.title} style={styles.session}>
              <View style={styles.tile}>
                <Icon name={s.icon} size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt weight="600" size={tokens.ext.fontSize.label}>
                  {s.title}
                </Txt>
                <Txt size={tokens.font.size.caption} color={C.muted}>
                  {s.min} min
                </Txt>
              </View>
              <Icon name="play" size={16} color={C.primary} />
            </View>
          ))}
        </View>
        <View style={styles.note}>
          <Icon name="smile" size={16} color={C.muted} />
          <Txt size={tokens.font.size.small} color={C.muted} lh={1.45} style={{ flex: 1 }}>
            We ask your mood before and after each session to see what works for you.
          </Txt>
        </View>
      </Greyed>
    </LogScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 190,
    borderRadius: tokens.radius.tabBar,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: X.space,
  },
  play: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primary,
    boxShadow: `0 0 20px ${X.playGlow}`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    borderRadius: tokens.ext.radius.button,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  tile: { width: 36, height: 36, borderRadius: tokens.radius.small, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: tokens.radius.item, backgroundColor: C.primarySoft },
});
