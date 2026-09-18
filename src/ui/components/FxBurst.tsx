import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { FX_ICONS } from '@/game/constants';
import type { FxType } from '@/game/types';

interface Props { type: FxType; size: number; }

/** Mounts, bursts outward, fades. Keyed by the parent so each new effect re-mounts. */
export function FxBurst({ type, size }: Props) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1.8, duration: 650, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, [scale, opacity]);

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
  smoke: { position: 'absolute', backgroundColor: 'rgba(123,63,158,0.45)' },
});
