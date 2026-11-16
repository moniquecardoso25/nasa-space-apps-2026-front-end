import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';

import { fontFamily } from '@/theme/fonts';
import { C, tokens } from '@/theme/tokens';

import { Txt } from './Txt';

// ------------------------------------------------------------------ WeekBars

type WeekBarsProps = {
  values: (number | null)[];
  labels: string[];
  /** value that fills the 70px bar area */
  max: number;
  target?: number;
  targetLabel?: string;
  todayIndex?: number;
  /** bar color per value (default primary) */
  colorFor?: (v: number, i: number) => string;
  height?: number;
};

/** Bars, dashed target line, today outlined + "Today". `null` = no data that day (dashed "no data" box, never a zero bar). */
export function WeekBars({ values, labels, max, target, targetLabel, todayIndex, colorFor, height = 70 }: WeekBarsProps) {
  const targetTop = target !== undefined ? height - (target / max) * height : null;
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {targetTop !== null ? (
        <>
          <View pointerEvents="none" style={[styles.target, { top: targetTop }]} />
          {targetLabel ? (
            <Txt size={10} color={C.muted} style={[styles.targetLabel, { top: Math.max(0, targetTop - 16) }]}>
              {targetLabel}
            </Txt>
          ) : null}
        </>
      ) : null}
      {values.map((v, i) => {
        const today = i === todayIndex;
        const h = v ? Math.max(4, Math.min(height, (v / max) * height)) : 0;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{ width: '100%', height, justifyContent: 'flex-end' }}>
              {v === null && todayIndex !== undefined && i > todayIndex ? null : v === null ? (
                <View style={styles.noData} accessibilityLabel={`${labels[i]}: no data`}>
                  <Txt size={9} color={C.muted}>
                    –
                  </Txt>
                </View>
              ) : v ? (
                <View
                  style={[
                    styles.bar,
                    { height: h, backgroundColor: colorFor ? colorFor(v, i) : C.primary },
                    today && styles.todayBar,
                  ]}
                />
              ) : (
                <View style={[styles.bar, styles.empty]} />
              )}
            </View>
            <Txt size={tokens.font.size.tiny} weight={today ? '700' : '400'} color={today ? C.text : C.muted}>
              {today ? 'Today' : labels[i]}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------------ TrendLine

type TrendProps = {
  points: number[];
  /** value of the dashed threshold line */
  threshold?: number;
  min: number;
  max: number;
  color?: string;
  height?: number;
  /** optional label under each point (e.g. "Pre-flight", "D5") */
  labels?: string[];
};

/** Small line chart with dashed threshold (e.g. −10% loss). Scales to the container width. */
export function TrendLine({ points, threshold, min, max, color = C.holoOk, height = 66, labels }: TrendProps) {
  const [w, setW] = useState(300);
  const pad = 10;
  const y = (v: number) => 8 + ((max - v) / (max - min || 1)) * (height - 16);
  const x = (i: number) => (points.length < 2 ? w / 2 : pad + (i * (w - pad * 2)) / (points.length - 1));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: height + (labels ? 14 : 0) }}>
      <Svg width={w} height={height + (labels ? 14 : 0)}>
        {labels
          ? labels.map((l, i) => (
              <SvgText
                key={`l${i}`}
                x={i === 0 ? 1 : i === labels.length - 1 ? w - 1 : x(i)}
                y={height + 11}
                fontSize={9}
                fill={C.muted}
                textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
                fontFamily={fontFamily('body', '400')}>
                {l}
              </SvgText>
            ))
          : null}
        {threshold !== undefined ? (
          <Line x1={0} y1={y(threshold)} x2={w} y2={y(threshold)} stroke={C.muted} strokeDasharray="4 4" />
        ) : null}
        <Polyline
          points={points.map((p, i) => `${x(i)},${y(p)}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={x(i)} cy={y(p)} r={3.5} fill={color} />
        ))}
      </Svg>
    </View>
  );
}

// ------------------------------------------------------------------ WeekLine

type WeekLineProps = {
  values: (number | null)[];
  labels: string[];
  min: number;
  max: number;
  target?: number;
  targetLabel?: string;
  todayIndex?: number;
  /** dot color per value (e.g. green ok / yellow fair / red low) */
  colorFor?: (v: number) => string;
  format?: (v: number) => string;
  height?: number;
};

/**
 * One value per day as a line with colored dots and a dashed target.
 * Days without data are a gap in the line and a hollow "no data" marker.
 */
export function WeekLine({ values, labels, min, max, target, targetLabel, todayIndex, colorFor, format, height = 96 }: WeekLineProps) {
  const [w, setW] = useState(300);
  const top = 16;
  const bottom = 10;
  const n = values.length;
  const x = (i: number) => (w / n) * (i + 0.5);
  const y = (v: number) => top + ((max - Math.max(min, Math.min(max, v))) / (max - min || 1)) * (height - top - bottom);
  // line segments only between consecutive days that both have data
  const segs: string[] = [];
  values.forEach((v, i) => {
    const p = values[i - 1];
    if (i > 0 && v !== null && p !== null && p !== undefined) segs.push(`M${x(i - 1)},${y(p)} L${x(i)},${y(v)}`);
  });
  return (
    <View style={{ gap: 4 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
        <Svg width={w} height={height}>
          {target !== undefined ? <Line x1={0} y1={y(target)} x2={w} y2={y(target)} stroke={C.muted} strokeDasharray="4 4" /> : null}
          {segs.length ? <Path d={segs.join(' ')} stroke={C.primary} strokeWidth={2} fill="none" strokeLinejoin="round" /> : null}
          {values.map((v, i) =>
            v === null ? (
              <Circle key={i} cx={x(i)} cy={height - bottom} r={4} fill="none" stroke={C.muted} strokeDasharray="2 2" />
            ) : (
              <Circle key={i} cx={x(i)} cy={y(v)} r={i === todayIndex ? 6 : 4.5} fill={colorFor ? colorFor(v) : C.primary} stroke={i === todayIndex ? C.text : 'none'} strokeWidth={2} />
            ),
          )}
          {format
            ? values.map((v, i) =>
                v === null ? null : (
                  <SvgText key={`t${i}`} x={x(i)} y={Math.max(10, y(v) - 9)} fontSize={9} fill={C.muted} textAnchor="middle" fontFamily={fontFamily('body', '400')}>
                    {format(v)}
                  </SvgText>
                ),
              )
            : null}
        </Svg>
        {targetLabel && target !== undefined ? (
          <Txt size={10} color={C.muted} style={[styles.targetLabel, { top: Math.max(0, y(target) - 15) }]}>
            {targetLabel}
          </Txt>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {labels.map((l, i) => (
          <Txt key={i} size={tokens.font.size.tiny} weight={i === todayIndex ? '700' : '400'} color={i === todayIndex ? C.text : C.muted} align="center" style={{ flex: 1 }}>
            {i === todayIndex ? 'Today' : l}
          </Txt>
        ))}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ Ring

type RingProps = {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  labelSize?: number;
};

/** Progress ring (Home log button 3/7, Exercise 60/90). */
export function Ring({ value, max, size = 34, stroke = 4, color = C.teal, label, labelSize = 10 }: RingProps) {
  const r = (size - stroke) / 2 - 0.5;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.track} strokeWidth={stroke} />
      {frac > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${frac * circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
      {label ? (
        <SvgText
          x={size / 2}
          y={size / 2 + labelSize * 0.36}
          textAnchor="middle"
          fontSize={labelSize}
          fontFamily={fontFamily('body', '700')}
          fontWeight="700"
          fill={C.text}>
          {label}
        </SvgText>
      ) : null}
    </Svg>
  );
}

// ------------------------------------------------------------------ Gauge

/** Half-circle score gauge (Crew status "Overall"). */
export function Gauge({ score, color = C.holoOk }: { score: number; color?: string }) {
  const len = 113; // arc length of r=36 half circle
  return (
    <Svg width={88} height={52} viewBox="0 0 88 52" accessibilityLabel={`Overall wellbeing ${score} of 100`}>
      <Path d="M8 46 A36 36 0 0 1 80 46" fill="none" stroke={C.track} strokeWidth={8} strokeLinecap="round" />
      <Path
        d="M8 46 A36 36 0 0 1 80 46"
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${Math.round((score / 100) * len)} 200`}
      />
      <SvgText
        x={44}
        y={44}
        textAnchor="middle"
        fontFamily={fontFamily('heading', '700')}
        fontSize={20}
        fontWeight="700"
        fill={C.text}>
        {String(score)}
      </SvgText>
    </Svg>
  );
}

// ------------------------------------------------------------------ ProgressBar

export function ProgressBar({ value, color = C.teal, height = 4, width }: { value: number; color?: string; height?: number; width?: number }) {
  return (
    <View style={{ width, height, borderRadius: tokens.radius.pill, backgroundColor: C.track, overflow: 'hidden', flexGrow: width ? 0 : 1 }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', borderRadius: tokens.radius.pill, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  target: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.muted },
  targetLabel: { position: 'absolute', right: 0 },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  todayBar: { outlineWidth: 2, outlineColor: C.text, outlineStyle: 'solid', outlineOffset: 1 },
  empty: { height: 4, backgroundColor: C.track },
  noData: { height: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: C.muted, borderRadius: 4, alignItems: 'center', justifyContent: 'center', width: '100%' },
});
