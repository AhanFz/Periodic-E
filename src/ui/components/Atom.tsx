import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ElectronRing } from './ElectronRing';
import { fonts, theme } from '../theme';
import type { AtomView } from '@/game/view';

interface Props { atom: AtomView; size: number; showHealth?: boolean; }

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/** A Bohr diagram in print: inked nucleus, dashed orbital, valence electrons as dots. */
export function Atom({ atom, size, showHealth = true }: Props) {
  const radius = size * 0.4;
  const core = size * 0.55;
  const fontSize = Math.max(8, core * (atom.symbol.length > 2 ? 0.34 : 0.42));
  const symbolColor = isLight(atom.color) ? theme.ink : theme.figureBg;

  return (
    <View style={[styles.stage, { width: size, height: size }]}>
      {atom.frozen && <View style={[styles.overlay, styles.frozen]} />}
      {atom.encased && <View style={[styles.overlay, styles.encased]} />}
      {atom.shielded && <View style={[styles.overlay, styles.shielded]} />}
      {atom.bonded && <View style={[styles.overlay, styles.bonded]} />}
      {atom.tethered && <View style={[styles.overlay, styles.tethered]} />}

      <View style={[styles.ringHolder, { width: radius * 2, height: radius * 2 }]}>
        <ElectronRing count={atom.electrons} radius={radius} isHalogen={atom.isHalogen} />
      </View>

      <View style={[styles.core, { width: core, height: core, borderRadius: core / 2, backgroundColor: atom.color }]}>
        <Text style={[styles.symbol, { fontSize, color: symbolColor }]}>{atom.symbol}</Text>
      </View>

      {atom.statusIcon && <Text style={styles.status}>{atom.statusIcon}</Text>}

      {showHealth && (
        <View style={styles.healthBar}>
          <View style={[styles.healthFill, { width: `${Math.max(0, Math.min(100, atom.healthPct * 100))}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
  ringHolder: { position: 'absolute' },
  core: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.ink },
  symbol: { fontFamily: fonts.serif, fontWeight: '700' },
  status: { position: 'absolute', bottom: -2, fontSize: 11 },
  overlay: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 6, borderWidth: 1.5 },
  frozen: { backgroundColor: 'rgba(43,95,168,0.3)', borderColor: '#2b5fa8' },
  encased: { backgroundColor: 'rgba(15,123,176,0.2)', borderColor: '#0f7bb0' },
  shielded: { borderColor: theme.green, borderWidth: 2 },
  bonded: { borderColor: '#c0392b', borderStyle: 'dashed' },
  tethered: { borderColor: theme.accent, borderStyle: 'dotted' },
  healthBar: { position: 'absolute', bottom: -8, width: '80%', height: 3, backgroundColor: 'rgba(30,36,48,0.18)', overflow: 'hidden' },
  healthFill: { height: '100%', backgroundColor: theme.green },
});
