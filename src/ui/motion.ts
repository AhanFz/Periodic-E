import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useGameStore } from '@/store/gameStore';
/** Shared ambient cadence; accessibility leaves a legible, motionless midpoint. */
export function useAmbientMotion(period = 2200) {
  const value = useRef(new Animated.Value(0.5)).current;
  const reduced = useGameStore(s => s.reducedMotion);
  useEffect(() => {
    if (reduced) { value.setValue(0.5); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [value, reduced, period]);
  return value;
}
