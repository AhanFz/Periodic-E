import React, { useId } from 'react';
import { useAmbientMotion } from '../motion';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '../theme';
import { puffs, type PuffSpec } from '../shapes';

interface Props {
  size: number;
  x: number;
  y: number;
  /** A cloud that is already here, or the thinner hint of one arriving next turn. */
  variant: 'zone' | 'telegraph';
}

/**
 * One body of gas. A radial gradient that falls to fully transparent is what makes it read as
 * vapour: a flat circle, however faint, always reads as a circle.
 */
function Puff({ spec, index, dim }: { spec: PuffSpec; index: number; dim: number }) {
  const { d, left, top, dark, period } = spec;
  const id = `puff${useId().replace(/:/g, "")}`;
  const drift = useAmbientMotion(period);



  const travel = d * 0.08;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left, top, width: d, height: d,
        opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.42 * dim, 0.92 * dim] }),
        transform: [
          { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-travel, travel] }) },
          { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [travel * 0.55, -travel * 0.55] }) },
          { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) },
        ],
      }}
    >
      <Svg width={d} height={d} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={dark ? theme.toxin.deep : theme.toxin.medium} stopOpacity={0.85} />
            <Stop offset="0.5" stopColor={theme.toxin.medium} stopOpacity={0.45} />
            <Stop offset="1" stopColor={theme.toxin.light} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={50} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Chlorine's gas: overlapping soft bodies, each breathing on its own period so the mass never
 * pulses as one. The telegraph variant is the same substance held back.
 */
export function PoisonCloud({ size, x, y, variant }: Props) {
  const zone = variant === 'zone';
  const dim = zone ? 0.72 : 0.25;
  const specs = puffs(size, x, y, zone ? 5 : 3);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.field]}>
      <View style={[StyleSheet.absoluteFill, { borderWidth: zone ? 1.5 : 1, borderStyle: zone ? 'solid' : 'dashed', borderColor: theme.toxin.medium, borderRadius: 3 }]} />
      {specs.map((spec, i) => <Puff key={i} spec={spec} index={i} dim={dim} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { overflow: 'hidden' },
});
