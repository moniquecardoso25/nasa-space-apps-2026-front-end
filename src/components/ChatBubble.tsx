import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { C, tokens } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

type Props = {
  author: 'me' | 'other';
  text: string;
  meta?: string;
  metaColor?: string;
  metaIcon?: IconName;
  /** 0..1 ETA bar for in-transit messages */
  progress?: number;
  children?: ReactNode;
};

/** me = lilac right, other = glass left; optional ETA bar. */
export function ChatBubble({ author, text, meta, metaColor = C.muted, metaIcon, progress, children }: Props) {
  const me = author === 'me';
  return (
    <View style={[styles.wrap, { alignSelf: me ? 'flex-end' : 'flex-start', alignItems: me ? 'flex-end' : 'flex-start' }]}>
      <View style={[styles.bubble, me ? styles.me : styles.other]}>
        <Txt size={tokens.ext.fontSize.label} lh={1.45} color={me ? C.onPrimary : C.text}>
          {text}
        </Txt>
        {progress !== undefined ? (
          <View style={styles.eta}>
            <View style={[styles.etaFill, { width: `${Math.round(Math.max(0.04, Math.min(1, progress)) * 100)}%` }]} />
          </View>
        ) : null}
        {children}
      </View>
      {meta ? (
        <View style={styles.meta}>
          {metaIcon ? <Icon name={metaIcon} size={12} color={metaColor} strokeWidth={metaIcon === 'check' ? 3 : 2} /> : null}
          <Txt size={tokens.font.size.tiny} color={metaColor}>
            {meta}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '82%', gap: 4 },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: tokens.radius.card },
  me: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  other: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eta: { marginTop: 6, height: 4, borderRadius: tokens.radius.pill, backgroundColor: C.track, overflow: 'hidden' },
  etaFill: { height: '100%', borderRadius: tokens.radius.pill, backgroundColor: C.gold },
});
