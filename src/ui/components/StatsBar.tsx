import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SectionLabel } from './Print';
import { fonts, theme } from '../theme';
import { LIGANDS, PHOTON_CAP } from '@/game/constants';
import type { Game } from '@/game/engine';

function Cell({ label, value, mark, warn, last }: { label: string; value: string; mark?: boolean; warn?: boolean; last?: boolean }) {
  return (
    <View style={[styles.cell, !last && styles.cellRule]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, mark && styles.mark, warn && styles.warn]}>{value}</Text>
    </View>
  );
}

/** Specimen readings, set as a ruled table. Highlighter marks what is worth acting on. */
export function StatsBar({ game }: { game: Game }) {
  const evolve = game.hutPrice('evolve');
  return (
    <View>
      <SectionLabel style={styles.caption}>Table 1 · Specimen readings</SectionLabel>
      <View style={styles.table}>
        <Cell label="Health" value={`${game.elementHealth}/${game.maxHealth}`} warn={game.elementHealth <= 2} />
        <Cell label="Shield" value={game.shieldPoints > 0 ? `${game.shieldPoints}${game.poisonImmune ? '☣' : ''}` : '–'} />
        <Cell label="Photons" value={`${game.photons}/${PHOTON_CAP}`} mark={game.photons >= 3} />
        <Cell label="Kills" value={`${game.stageKills}·${game.totalKills}`} />
        {game.turnsLeft !== null
          ? <Cell label="Turns" value={`${game.turnsLeft}`} warn={game.turnsLeft <= 3} last />
          : <Cell label="Evolve" value={evolve === null ? '—' : `${evolve}🔆`} mark={evolve !== null && game.photons >= evolve} last />}
      </View>
      {game.ligand && (
        <View style={styles.ligandStrip}>
          <Text style={styles.ligandText}>⬢ {LIGANDS[game.ligand].name}</Text>
          {game.exothermicActive && <Text style={styles.ligandLive}>🔥 rams deal {game.ramDamage + game.damageBonus}</Text>}
          {game.ligand === 'supercooled' && (
            <Text style={game.supercooledReady ? styles.ligandLive : styles.ligandSpent}>
              {game.supercooledReady ? '❄️ save ready' : '❄️ save used'}
            </Text>
          )}
          {game.ligand === 'passivation' && game.passivationReady && <Text style={styles.ligandLive}>🛡️ armed</Text>}
          {game.ligand === 'fractional' && game.hutDiscount > 0 && <Text style={styles.ligandLive}>⚗️ −1 at the hut</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { marginBottom: 4 },
  table: { flexDirection: 'row', borderTopWidth: 2, borderBottomWidth: 1, borderColor: theme.ink, backgroundColor: theme.panel },
  cell: { flex: 1, paddingVertical: 7, alignItems: 'center' },
  cellRule: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.rule },
  label: { fontFamily: fonts.serif, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim, marginBottom: 2 },
  value: { fontFamily: fonts.mono, fontSize: 14, fontWeight: '700', color: theme.ink, paddingHorizontal: 4 },
  mark: { backgroundColor: theme.gold, color: theme.goldText },
  warn: { color: theme.red },
  ligandStrip: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderColor: theme.ink, backgroundColor: theme.accentSoft,
    paddingVertical: 4, paddingHorizontal: 8,
  },
  ligandText: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: theme.accent },
  ligandLive: { fontFamily: fonts.serif, fontSize: 11, color: theme.green, fontWeight: '700' },
  ligandSpent: { fontFamily: fonts.serif, fontSize: 11, color: theme.textDim, fontStyle: 'italic' },
});
