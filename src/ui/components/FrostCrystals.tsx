import React, { useId } from 'react';
import { useAmbientMotion } from '../motion';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';
import { theme } from '../theme';
import { VB, iceShards } from '../shapes';

interface Props { size: number; x: number; y: number; }

/**
 * Ice grown up out of the tile. Each crystal is split into a lit face and a shaded face meeting
 * at the tip, with a specular streak below it, which is what reads as a faceted solid rather than
 * as a flat triangle. Kept slightly transparent so whatever is frozen still shows through.
 */
export function FrostCrystals({ size, x, y }: Props) {
  const shimmer = useAmbientMotion(2800);



  const shards = iceShards(x, y);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
        <Defs>
          <LinearGradient id="shardLit" x1="0" y1="100%" x2="0" y2="0">
            <Stop offset="0" stopColor={theme.ice.medium} />
            <Stop offset="1" stopColor={theme.ice.light} />
          </LinearGradient>
          <LinearGradient id="shardShade" x1="0" y1="100%" x2="0" y2="0">
            <Stop offset="0" stopColor="#46778f" />
            <Stop offset="1" stopColor={theme.ice.deep} />
          </LinearGradient>
          <LinearGradient id="rime" x1="0" y1="100%" x2="0" y2="0">
            <Stop offset="0" stopColor={theme.ice.medium} stopOpacity={0.4} />
            <Stop offset="1" stopColor={theme.ice.light} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={VB} height={VB} fill="url(#rime)" />

        {shards.map((sh, i) => (
          <React.Fragment key={i}>
            <Polygon points={sh.shade} fill="url(#shardShade)" opacity={0.65} />
            <Polygon points={sh.lit} fill="url(#shardLit)" opacity={0.65} />
            <Polygon points={sh.spark} fill="#ffffff" opacity={0.6} />
            <Polygon points={sh.outline} fill="none" stroke={theme.ice.light} strokeWidth={0.8} strokeOpacity={0.9} strokeLinejoin="round" />
          </React.Fragment>
        ))}
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {
          backgroundColor: theme.ice.light,
          opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.09] }),
        }]}
      />
    </View>
  );
}
