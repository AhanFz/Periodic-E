import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { useGameStore } from '@/store/gameStore';
import { theme } from '../theme';
import { VB, boltPaths } from '../shapes';

interface Props {
  size: number;
  x: number;
  y: number;
  /** Degrees to turn the discharge, so it runs along the beam that made it. */
  angle?: number;
}

/**
 * A discharge crossing the tile: a wide cyan halo under a yellow body under a white core, which
 * is what gives it the look of something too bright to resolve. It flashes hard and fades.
 */
export function BoltStreak({ size, x, y, angle = 0 }: Props) {
  const flash = useRef(new Animated.Value(0)).current;

  const reduced = useGameStore(s => s.reducedMotion);
  useEffect(() => {
    if (reduced) { flash.setValue(0.65); return; }
    const animation = Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0.45, duration: 100, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 430, useNativeDriver: true }),
    ]);
    animation.start(); return () => animation.stop();
  }, [flash, reduced]);

  const paths = boltPaths(x, y);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.stage, { opacity: flash }]}>
      <View style={{ transform: [{ rotate: `${angle}deg` }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
          <G strokeLinecap="round" strokeLinejoin="miter" strokeMiterlimit={6} fill="none">
            {paths.map((d, i) => <Path key={`contrast${i}`} d={d} stroke="#816234" strokeWidth={i === 0 ? 6.5 : 3.5} strokeOpacity={0.55} />)}
            {paths.map((d, i) => (
              <Path key={`h${i}`} d={d} stroke={theme.bolt.cyan} strokeWidth={i === 0 ? 11 : 6} strokeOpacity={0.32} />
            ))}
            {paths.map((d, i) => (
              <Path key={`y${i}`} d={d} stroke={theme.bolt.yellow} strokeWidth={i === 0 ? 4.4 : 2.4} strokeOpacity={0.95} />
            ))}
            {paths.map((d, i) => (
              <Path key={`w${i}`} d={d} stroke={theme.bolt.white} strokeWidth={i === 0 ? 1.9 : 1} />
            ))}
          </G>
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
});
