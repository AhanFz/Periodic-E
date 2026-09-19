import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Atom } from './Atom';
import { FxBurst } from './FxBurst';
import { VoidCell } from './VoidCell';
import { fonts, theme } from '../theme';
import type { TileView, TileTint } from '@/game/view';
import type { InspectTarget } from '@/game/types';

interface Props {
  tile: TileView;
  size: number;
  tick: number;
  /** Long press on an atom opens its card. Undefined leaves the tile inert. */
  onInspect?: (target: InspectTarget) => void;
}

function resolveTint(tints: TileTint[], checker: 'light' | 'dark') {
  let bg: string = checker === 'light' ? theme.tileLight : theme.tileDark;
  let border: string = theme.tileBorder;
  let dashed = false;
  for (const t of tints) {
    const c = theme.tint[t];
    bg = c.bg; border = c.border;
    if (t === 'ghost') dashed = true;
  }
  return { bg, border, dashed };
}

export function Tile({ tile, size, tick, onInspect }: Props) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!tile.startGlow) { glow.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [tile.startGlow, glow]);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!tile.pulse) { pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [tile.pulse, pulse]);

  // Off-grid margin: blank paper so the ruled lines continue. Void: a shaded region.
  // Effects still draw here, so a beam that crosses a void reads as one unbroken line.
  if (!tile.exists) {
    const over = (
      <>
        {tile.threatIcon === '🎯' && <Text style={[styles.overIcon, { fontSize: size * 0.3 }]}>🎯</Text>}
        {tile.fx.map((f, i) => <FxBurst key={`${tick}-${i}`} type={f.type} size={size} />)}
      </>
    );
    if (tile.isVoid) return <VoidCell size={size} x={tile.x} y={tile.y}>{over}</VoidCell>;
    return <View style={[{ width: size, height: size }, styles.marginCell]}>{over}</View>;
  }

  const { bg, border, dashed } = resolveTint(tile.tints, tile.checker);
  const isSheet = tile.tints.includes('sheet');
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });
  const atomSize = size * 0.72;
  const cornerSize = Math.max(10, Math.round(size * 0.2));

  const target = tile.inspect;
  const Cell = target && onInspect ? Pressable : View;
  const cellProps = target && onInspect
    ? {
        onLongPress: () => onInspect(target),
        delayLongPress: 280,
        accessibilityRole: 'button' as const,
        accessibilityHint: 'Hold for this atom\u2019s card',
      }
    : {};

  return (
    <Cell {...cellProps} style={[styles.cell, { width: size, height: size, backgroundColor: bg, borderColor: border, borderStyle: dashed ? 'dashed' : 'solid' }, isSheet && styles.sheetCell]}>
      {tile.pulse && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: border, opacity: pulseOpacity }]} />}
      {tile.startGlow && (
        <>
          <View pointerEvents="none" style={styles.startRingCore} />
          <Animated.View
            pointerEvents="none"
            style={[styles.startRing, {
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }],
            }]}
          />
        </>
      )}
      <View style={styles.inner}>
        {tile.isGhost && <Text style={[styles.corner, styles.br, { fontSize: cornerSize }]}>❓</Text>}
        {tile.sheetTimer !== null && <Text style={[styles.corner, styles.bl, styles.timer, { fontSize: cornerSize }]}>{tile.sheetTimer}</Text>}
        {tile.moveArrow && <Text style={[styles.corner, styles.tl, styles.arrow, { fontSize: cornerSize + 2 }]}>{tile.moveArrow}</Text>}
        {tile.tetherArrow && <Text style={[styles.corner, styles.tl, styles.tether, { fontSize: cornerSize + 2 }]}>{tile.tetherArrow}</Text>}
        {tile.threatIcon && <Text style={[styles.corner, styles.tr, { fontSize: cornerSize }]}>{tile.threatIcon}</Text>}

        {tile.atom ? (
          <Atom atom={tile.atom} size={atomSize} />
        ) : tile.centerIcon ? (
          <View style={[styles.center, tile.centerDim && { opacity: 0.55 }]}>
            <Text style={{ fontSize: size * 0.4 }}>{tile.centerIcon}</Text>
            {tile.centerLabel && <Text style={[styles.centerLabel, { fontSize: Math.max(8, size * 0.15) }]}>{tile.centerLabel}</Text>}
          </View>
        ) : null}

        {tile.fx.map((f, i) => <FxBurst key={`${tick}-${i}`} type={f.type} size={size} />)}
      </View>
    </Cell>
  );
}

const styles = StyleSheet.create({
  cell: { borderWidth: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  sheetCell: { borderStyle: 'dashed', borderWidth: 1.5 },
  marginCell: { backgroundColor: theme.figureBg, alignItems: 'center', justifyContent: 'center' },
  startRingCore: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1.5, borderColor: theme.playerElectron, borderRadius: 2 },
  startRing: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderWidth: 2, borderColor: theme.playerElectron, borderRadius: 4 },
  overIcon: { opacity: 0.75 },
  inner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', zIndex: 4 },
  tl: { top: 1, left: 3 }, tr: { top: 1, right: 3 }, bl: { bottom: 0, left: 3 }, br: { bottom: 0, right: 3 },
  arrow: { fontFamily: fonts.mono, fontWeight: '700', color: theme.ink },
  tether: { fontFamily: fonts.mono, fontWeight: '700', color: theme.accent },
  timer: { fontFamily: fonts.mono, fontWeight: '700', color: theme.accent },
  center: { alignItems: 'center' },
  centerLabel: { fontFamily: fonts.serif, fontWeight: '700', letterSpacing: 0.6, color: theme.ink, marginTop: -2 },
});
