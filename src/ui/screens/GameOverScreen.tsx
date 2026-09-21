import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PaperButton, Rule, SectionLabel } from '../components/Print';
import { fonts, theme } from '../theme';
import { ELEMENTS, LIGANDS, QUANTA_GLYPH } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowRule]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function GameOverScreen() {
  const { game, retry, toMenu, lastAward, profile } = useGameStore();
  if (!game) return null;
  const won = game.won;
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <SectionLabel>Laboratory report</SectionLabel>
      <Text style={[styles.title, { color: won ? theme.green : theme.red }]}>{won ? 'Full clear' : 'Experiment concluded'}</Text>
      <Rule double style={{ marginTop: 6, marginBottom: 12 }} />
      <Text style={styles.msg}>{game.message}</Text>

      {lastAward > 0 ? (
        <View style={styles.award}>
          <Text style={styles.awardValue}>{QUANTA_GLYPH} +{lastAward} quanta</Text>
          <Text style={styles.awardNote}>Balance {QUANTA_GLYPH} {profile.quanta}. Spend it on a ligand from the contents page.</Text>
        </View>
      ) : (
        <View style={styles.awardMuted}>
          <Text style={styles.awardNote}>
            No quanta this time — they are paid for escaping as Neon. Balance {QUANTA_GLYPH} {profile.quanta}.
          </Text>
        </View>
      )}

      <SectionLabel style={{ marginBottom: 4 }}>Table 2 · Results</SectionLabel>
      <View style={styles.table}>
        <Row label="Total kills" value={`${game.totalKills}`} />
        <Row label="Grids cleared" value={`${game.gridsCleared}`} />
        <Row label="Deepest grid" value={`${game.depth}`} />
        <Row label="Turns survived" value={`${game.turn}`} />
        <Row label="Catalysts" value={`+${game.maxHealthBonus} health, +${game.damageBonus} damage`} />
        <Row label="Ligand" value={game.ligand ? LIGANDS[game.ligand].name : 'none'} />
        <Row label="Path" value={game.elementsVisited.map(e => ELEMENTS[e].symbol).join(' → ')} last />
      </View>

      <View style={styles.buttons}>
        <PaperButton label="Contents" variant="outline" style={{ flex: 1 }} onPress={toMenu} />
        <PaperButton label="Repeat experiment" variant="primary" style={{ flex: 1 }} onPress={retry} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 28, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.serif, fontSize: 30, fontWeight: '700', marginTop: 4 },
  msg: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 15, color: theme.ink, lineHeight: 22, marginBottom: 22 },
  table: { borderTopWidth: 2, borderBottomWidth: 1, borderColor: theme.ink, backgroundColor: theme.panel, marginBottom: 24 },
  award: { borderLeftWidth: 3, borderLeftColor: theme.green, backgroundColor: theme.greenSoft, padding: 12, marginBottom: 20 },
  awardMuted: { borderLeftWidth: 3, borderLeftColor: theme.rule, backgroundColor: theme.panel, padding: 12, marginBottom: 20 },
  awardValue: { fontFamily: fonts.mono, fontSize: 20, fontWeight: '700', color: theme.green },
  awardNote: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 12, lineHeight: 17, color: theme.textDim, marginTop: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, gap: 12 },
  rowRule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.rule },
  rowLabel: { fontFamily: fonts.serif, fontSize: 14, color: theme.textDim },
  rowValue: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: theme.ink, flexShrink: 1, textAlign: 'right' },
  buttons: { flexDirection: 'row', gap: 10 },
});
