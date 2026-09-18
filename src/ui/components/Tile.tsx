import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Atom } from './Atom';
import { FxBurst } from './FxBurst';
import { fonts, theme } from '../theme';
import type { TileView, TileTint } from '@/game/view';

interface Props { tile: TileView; size: number; tick: number; }

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

export function Tile({ tile, size, tick }: Props) {
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
  if (!tile.exists) {
    return <View style={[{ width: size, height: size }, tile.isVoid ? styles.voidCell : styles.marginCell]} />;
  }

  const { bg, border, dashed } = resolveTint(tile.tints, tile.checker);
  const isSheet = tile.tints.includes('sheet');
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });
  const atomSize = size * 0.72;
  const cornerSize = Math.max(10, Math.round(size * 0.2));

  return (
    <View style={[styles.cell, { width: size, height: size, backgroundColor: bg, borderColor: border, borderStyle: dashed ? 'dashed' : 'solid' }, isSheet && styles.sheetCell]}>
      {tile.pulse && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: border, opacity: pulseOpacity }]} />}
      <View style={styles.inner}>
        {tile.isStart && <Text style={[styles.corner, styles.bl, { fontSize: cornerSize }]}>⬇️</Text>}
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
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { borderWidth: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  sheetCell: { borderStyle: 'dashed', borderWidth: 1.5 },
  marginCell: { backgroundColor: theme.figureBg },
  voidCell: { backgroundColor: theme.voidFill, borderWidth: 1, borderStyle: 'dotted', borderColor: theme.tileBorder },
  inner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', zIndex: 4 },
  tl: { top: 1, left: 3 }, tr: { top: 1, right: 3 }, bl: { bottom: 0, left: 3 }, br: { bottom: 0, right: 3 },
  arrow: { fontFamily: fonts.mono, fontWeight: '700', color: theme.ink },
  tether: { fontFamily: fonts.mono, fontWeight: '700', color: theme.accent },
  timer: { fontFamily: fonts.mono, fontWeight: '700', color: theme.accent },
  center: { alignItems: 'center' },
  centerLabel: { fontFamily: fonts.serif, fontWeight: '700', letterSpacing: 0.6, color: theme.ink, marginTop: -2 },
});
