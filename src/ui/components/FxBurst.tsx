import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { BoltStreak } from './BoltStreak';
import { useGameStore } from '@/store/gameStore';
import { theme } from '../theme';
import { FX_ICONS } from '@/game/constants';
import type { FxType } from '@/game/types';

interface Props { type: FxType; size: number; x: number; y: number; angle?: number; }

/** Mounts, bursts outward, fades. Keyed by the parent so each new effect re-mounts. */
export function FxBurst({ type, size, x, y, angle }: Props) {
  // A discharge is a shape, not a glyph: it runs its own flash and never scales like a burst.
  // The branch sits below the hooks, not above them, so hook order never depends on the effect.
  const isBolt = type === 'shock';
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const reduced = useGameStore(s => s.reducedMotion);
  useEffect(() => {
    if (reduced) { scale.setValue(1); opacity.setValue(0.6); return; }
    if (isBolt) return;
    const animation = Animated.parallel([
      Animated.timing(scale, { toValue: 1.8, duration: 650, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]);
    animation.start(); return () => animation.stop();
  }, [scale, opacity, isBolt, reduced]);

  if (isBolt) return <BoltStreak size={size} x={x} y={y} angle={angle} />;

  if (type === 'smoke') {
    return (
      <Animated.View
        pointerEvents="none"
        style={[styles.smoke, { width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4, transform: [{ scale }], opacity }]}
      />
    );
  }

  return (
    <Animated.Text style={[styles.icon, { fontSize: size * 0.5, transform: [{ scale }], opacity }]}>
      {FX_ICONS[type]}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  icon: { position: 'absolute' },
  smoke: { position: 'absolute', backgroundColor: theme.toxin.medium, opacity: 0.55 },
});
