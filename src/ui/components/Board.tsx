import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Tile } from './Tile';
import { Caption } from './Print';
import { fonts, theme } from '../theme';
import { buildBoardView } from '@/game/view';
import type { Game } from '@/game/engine';

interface Props { game: Game; tick: number; }

/** Tile gaps show the graph-paper colour underneath, so they read as ruled lines. */
const GAP = 2;
const FRAME_PAD = 8;
/** The screen's content padding; the figure bleeds into it so tiles get ~95% of the width. */
const SCREEN_PAD = 16;
const BLEED = 6;

export function Board({ game, tick }: Props) {
  const { width } = useWindowDimensions();
  const view = useMemo(() => buildBoardView(game), [game, tick]);
  const cols = view.cols;
  const rowCount = view.rows.length;

  const figureWidth = Math.min(width - (SCREEN_PAD - BLEED) * 2, 560);
  const inner = figureWidth - 2 - FRAME_PAD * 2;
  const cell = Math.max(28, Math.floor((inner - GAP * (cols - 1)) / cols));
  const latticeW = cell * cols + GAP * (cols - 1);
  const latticeH = cell * rowCount + GAP * (rowCount - 1);
  const n = view.size;
  const polarised = view.polarityCountdown !== null;

  return (
    <View style={[styles.figure, { width: figureWidth }]}>
      <View style={[styles.frame, { padding: FRAME_PAD }]}>
        {polarised && (
          <View style={styles.annotRow}>
            <Text style={styles.annot}>🧲 shift {view.polarityArrow} in {view.polarityCountdown}</Text>
          </View>
        )}
        <View style={[styles.lattice, { width: latticeW, height: latticeH }]}>
          {view.rows.map((row, y) => (
            <View key={y} style={[styles.row, { marginBottom: y < rowCount - 1 ? GAP : 0 }]}>
              {row.map((t, x) => (
                <View key={t.key} style={{ marginRight: x < row.length - 1 ? GAP : 0 }}>
                  <Tile tile={t} size={cell} tick={tick} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>

      <Caption style={styles.caption}>
        <Text style={styles.captionLead}>Figure {game.depth}.</Text> Reaction chamber — {game.layout.shape} layout, {n} × {n}{polarised ? ', polarised field' : ''}.
      </Caption>
      <View style={styles.legend}>
        <Text style={styles.legendItem}><Text style={{ color: theme.playerElectron }}>●</Text> you</Text>
        <Text style={styles.legendItem}><Text style={{ color: theme.halogenElectron }}>●</Text> halogens</Text>
        <Text style={styles.legendItem}>⚗️ hut</Text>
        <Text style={styles.legendItem}>🚪 hatch</Text>
        <Text style={styles.legendItem}>🔆 photon</Text>
        <Text style={styles.legendItem}>↑ next move</Text>
        <Text style={styles.legendItem}>🪢 tethered</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  figure: { alignSelf: 'center', marginTop: 12, marginBottom: 10 },
  frame: { borderWidth: 1, borderColor: theme.ink, backgroundColor: theme.figureBg, alignItems: 'center' },
  annotRow: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  annot: {
    fontFamily: fonts.mono, fontSize: 10, color: theme.accent, backgroundColor: theme.accentSoft,
    borderWidth: 1, borderColor: theme.accent, paddingHorizontal: 6, paddingVertical: 2,
  },
  lattice: { backgroundColor: theme.graph },
  row: { flexDirection: 'row' },
  caption: { marginTop: 6, color: theme.ink },
  captionLead: { fontStyle: 'normal', fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  legendItem: { fontFamily: fonts.serif, fontSize: 11, color: theme.textDim },
});
