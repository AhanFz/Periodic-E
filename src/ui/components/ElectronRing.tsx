import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface Props {
  count: number;
  radius: number;
  isHalogen: boolean;
  dotSize?: number;
}

/**
 * Draws exactly `count` inked dots evenly spaced on a dashed orbital and slowly
 * rotates the whole ring. Player electrons are blue ink, halogen electrons red.
 */
export function ElectronRing({ count, radius, isHalogen, dotSize = 4 }: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: isHalogen ? 4000 : 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin, isHalogen]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const size = radius * 2;
  const color = isHalogen ? theme.halogenElectron : theme.playerElectron;

  const dots = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    dots.push(
      <View
        key={i}
        style={[
          styles.dot,
          {
            width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color,
            left: radius + radius * Math.cos(angle) - dotSize / 2,
            top: radius + radius * Math.sin(angle) - dotSize / 2,
          },
        ]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { width: size, height: size, borderRadius: radius, transform: [{ rotate }] }]}
    >
      {dots}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(30,36,48,0.45)' },
  dot: { position: 'absolute' },
});
