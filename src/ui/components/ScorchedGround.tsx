import React, { useId } from 'react';
import { useAmbientMotion } from '../motion';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { theme } from '../theme';
import { VB, rockPlates } from '../shapes';

interface Props { size: number; x: number; y: number; }

/**
 * Cooled basalt over a lava bed. The rock is drawn *on top* of the heat, so what glows is the
 * seam between slabs: drawing bright cracks onto a dark tile instead gives orange lightning.
 *
 * Three layers, because the pulse has to reach the seams without lighting the rock. The bloom
 * sits between the bed and the slabs, so the slabs mask it everywhere except in the gaps, and it
 * animates on the native driver rather than by re-rendering SVG props.
 */
export function ScorchedGround({ size, x, y }: Props) {
  const ember = useAmbientMotion(2400);



  const plates = rockPlates(x, y);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="magma" x1="0" y1="0" x2="100%" y2="100%">
            <Stop offset="0" stopColor={theme.lava.core} />
            <Stop offset="0.5" stopColor={theme.lava.crack} />
            <Stop offset="1" stopColor="#d4460d" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={VB} height={VB} fill="url(#magma)" />
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: ember.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.68] }) }]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
          <Defs>
            <RadialGradient id="heat" cx="50%" cy="50%" r="62%">
              <Stop offset="0" stopColor="#fff3c4" stopOpacity={0.9} />
              <Stop offset="0.5" stopColor={theme.lava.core} stopOpacity={0.45} />
              <Stop offset="1" stopColor={theme.lava.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={VB} height={VB} fill="url(#heat)" />
        </Svg>
      </Animated.View>

      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="slab" x1="0" y1="0" x2="30%" y2="100%">
            <Stop offset="0" stopColor={theme.lava.rockLight} />
            <Stop offset="1" stopColor={theme.lava.rock} />
          </LinearGradient>
        </Defs>
        {plates.map((points, i) => (
          <Polygon key={i} points={points} fill="url(#slab)" stroke={theme.lava.rockLight} strokeWidth={0.6} strokeOpacity={0.8} />
        ))}
      </Svg>
    </View>
  );
}
