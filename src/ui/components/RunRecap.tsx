import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Game } from '@/game/engine';
import { DAMAGE_NAMES } from '@/game/history';
import { LIGANDS } from '@/game/constants';
import { SectionLabel } from './Print';
import { fonts, theme } from '../theme';
export function RunRecap({ game }: { game: Game }) {
  const h = game.history;
  return <View style={styles.wrap}>
    <SectionLabel>Final damage sequence · last {h.damage.length} hits</SectionLabel>
    {!h.damage.length && <Text style={styles.body}>No damage recorded.</Text>}
    {h.damage.map((hit, i) => <View key={i} style={styles.event}>
      <Text style={styles.label}>Grid {hit.grid} · Turn {hit.turn} · {DAMAGE_NAMES[hit.source]}</Text>
      <Text style={styles.body}>{hit.amount} incoming · {hit.absorbed} absorbed by shield · HP {hit.healthBefore} → {Math.max(0, hit.healthAfter)}{hit.saved ? ' · Supercooled Core saved you' : hit.healthAfter <= 0 ? ' · fatal hit' : ''}</Text>
    </View>)}
    <SectionLabel>Ligand activations</SectionLabel>
    {game.ligand ? <Text style={styles.body}>{LIGANDS[game.ligand].name}: {h.ligandCounts[game.ligand]} {game.ligand === 'exothermic' ? 'boosted rams' : game.ligand === 'fractional' ? 'discounted purchases' : 'activations'}</Text> : <Text style={styles.body}>No ligand equipped.</Text>}
    <SectionLabel>Evolution, purchases & key moments</SectionLabel>
    {h.omittedMilestones > 0 && <Text style={styles.body}>Showing the latest 200 events; {h.omittedMilestones} earlier events omitted.</Text>}
    {!h.milestones.length && <Text style={styles.body}>No evolutions, purchases or ligand activations this run.</Text>}
    {h.milestones.map((event, i) => <View key={i} style={styles.event}>
      <Text style={styles.label}>Grid {event.grid} · Turn {event.turn}</Text>
      <Text style={styles.body}>{event.text}</Text>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  wrap: { gap: 12, marginBottom: 24 },
  event: { paddingLeft: 10, borderLeftWidth: 2, borderColor: theme.rule, gap: 4 },
  label: { fontFamily: fonts.mono, fontSize: 11, color: theme.textDim },
  body: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, color: theme.ink },
});
