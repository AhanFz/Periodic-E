import React from 'react';
import { useAmbientMotion } from '../motion';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface Props { size: number; x: number; y: number; children?: React.ReactNode; }

const STARS_PER_TILE = 5;

/**
 * Positions are hashed from the tile's own coordinates, so a given hole in the grid keeps the
 * same constellation for as long as it exists instead of reshuffling on every render.
 */
function hash(x: number, y: number, i: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + i * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function Star({ size, x, y, index }: { size: number; x: number; y: number; index: number }) {
  const left = hash(x, y, index) * 0.82 + 0.09;
  const top = hash(x, y, index + 10) * 0.82 + 0.09;
  const dot = hash(x, y, index + 20) < 0.25 ? 2.2 : 1.4;
  const warm = hash(x, y, index + 30) < 0.18;
  const period = 900 + Math.floor(hash(x, y, index + 50) * 1400);

  const twinkle = useAmbientMotion(period);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: left * size,
        top: top * size,
        width: dot,
        height: dot,
        borderRadius: dot / 2,
        backgroundColor: warm ? theme.voidStarWarm : theme.voidStar,
        opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.95] }),
      }}
    />
  );
}

/** A hole in the page: near-black, with a few slow-twinkling points of light. */
export function VoidCell({ size, x, y, children }: Props) {
  return (
    <View style={[styles.cell, { width: size, height: size }]}>
      {Array.from({ length: STARS_PER_TILE }, (_, i) => (
        <Star key={i} size={size} x={x} y={y} index={i} />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    backgroundColor: theme.voidFill,
    borderWidth: 1,
    borderColor: theme.voidBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
