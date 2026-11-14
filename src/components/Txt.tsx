import { Text, type TextProps, type TextStyle } from 'react-native';

import { fontFamily, type Weight } from '@/theme/fonts';
import { C } from '@/theme/tokens';

type Props = TextProps & {
  size?: number;
  weight?: Weight;
  heading?: boolean;
  color?: string;
  align?: TextStyle['textAlign'];
  lh?: number; // line-height multiplier, like CSS
};

/** Base text: Inter body / Sora heading, sizes from tokens. */
export function Txt({ size = 15, weight = '400', heading, color = C.text, align, lh, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fontFamily(heading ? 'heading' : 'body', weight),
          fontSize: size,
          color,
          textAlign: align,
          lineHeight: lh ? Math.round(size * lh) : undefined,
        },
        style,
      ]}
    />
  );
}
