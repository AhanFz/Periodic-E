import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Tile } from './Tile';
import { Caption } from './Print';
import { fonts, theme } from '../theme';
import { buildBoardView } from '@/game/view';
import { tapFeedback } from '../haptics';
import { useGameStore } from '@/store/gameStore';
import type { Game } from '@/game/engine';
import type { InspectTarget } from '@/game/types';

interface Props { game: Game; tick: number; maxHeight?: number; maxWidth?: number; compact?: boolean; inert?: boolean; }

/** Tile gaps show the graph-paper colour underneath, so they read as ruled lines. */
const GAP = 2;
const FRAME_PAD = 8;
/** The screen's content padding; the figure bleeds into it so tiles get ~95% of the width. */
const SCREEN_PAD = 16;
const BLEED = 6;

export function Board({ game, tick, maxHeight = 1000, maxWidth = 560, compact = false, inert = false }: Props) {
  const { width } = useWindowDimensions();
  const inspect = useGameStore(s => s.inspect);
  const onInspect = (target: InspectTarget) => { tapFeedback(); inspect(target); };
  const view = useMemo(() => buildBoardView(game), [game, tick]);
  const cols = view.cols;
  const rowCount = view.rows.length;

  const figureWidth = Math.min(width - (SCREEN_PAD - BLEED) * 2, maxWidth);
  const inner = figureWidth - 2 - FRAME_PAD * 2;
  const cell = Math.max(12, Math.floor(Math.min((inner - GAP * (cols - 1)) / cols, (maxHeight - 24 - (view.polarityCountdown !== null ? 25 : 0) - GAP * (rowCount - 1)) / rowCount)));
  const latticeW = cell * cols + GAP * (cols - 1);
  const latticeH = cell * rowCount + GAP * (rowCount - 1);
  const n = view.size;
  const polarised = view.polarityCountdown !== null;

  return (
    <View style={[styles.figure, { width: figureWidth }, compact && { marginTop: 0, marginBottom: 0 }]}>
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
                  <Tile tile={t} size={cell} tick={tick} onInspect={inert ? undefined : onInspect} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>

      {!compact && <>
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
        <Text style={styles.legendItem}><Text style={{ color: theme.playerElectron }}>◎</Text> where you started</Text>
      </View>
      <Caption style={styles.hint}>Hold any atom for its card: what it does, what it is about to do, and how to beat it.</Caption>
      </>}
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
  hint: { fontSize: 11, marginTop: 6 },
});
