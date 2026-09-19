import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SectionLabel } from './Print';
import { fonts, theme } from '../theme';
import { AIM_ACTION_WORDS, AIM_TITLES, BATTERY_PAYOUT, ELEMENT_NAMES } from '@/game/constants';
import type { Game } from '@/game/engine';

/** The element's kit, set as numbered properties in a definition box. */
export function AbilityBar({ game }: { game: Game }) {
  const d = game.elementData;

  if (game.abilityLockedTurns > 0 && !game.aiming) {
    return (
      <View style={[styles.box, { borderLeftColor: theme.red }]}>
        <SectionLabel style={{ color: theme.red }}>🔒 Abilities locked</SectionLabel>
        <Text style={styles.line}>Bromine's corrosion blocks your abilities this turn. You can still move and ram.</Text>
      </View>
    );
  }
  if (game.aiming && game.aimingFor) {
    const hasTarget = !!game.aimDirection && game.aimLine.length > 0;
    const action = AIM_ACTION_WORDS[game.aimingFor];
    const sheet = game.aimingFor === 'c_sheet';
    return (
      <View style={[styles.box, { borderLeftColor: theme.gold }]}>
        <SectionLabel>{AIM_TITLES[game.aimingFor]}</SectionLabel>
        <Text style={styles.line}>
          {!game.aimDirection ? (sheet ? 'Pick the edge or void to build toward.' : 'Pick a direction.')
            : hasTarget ? (sheet ? 'Choose which way the sheet curves.' : `Tap ${action} to confirm, or pick another direction.`)
            : (sheet ? 'Nothing to bridge that way.' : 'No tile that direction.')}
        </Text>
      </View>
    );
  }
  const ready3 = game.photons >= d.ability2Cost;
  return (
    <View style={[styles.box, { borderLeftColor: ready3 ? theme.gold : theme.accent }]}>
      <SectionLabel>§ Properties of {ELEMENT_NAMES[game.currentElement]}</SectionLabel>
      <Text style={styles.line}>
        <Text style={styles.name}>1. {d.ability1Name}</Text> <Text style={styles.cost}>[{d.ability1Cost} 🔆]</Text> {d.ability1Desc}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.name}>2. {d.ability2Name}</Text> <Text style={[styles.cost, ready3 && styles.costReady]}>[{d.ability2Cost} 🔆]</Text> {d.ability2Desc}
      </Text>
      {game.batteryTurnsLeft > 0 && (
        <Text style={[styles.foot, { color: theme.green }]}>
          🔋 Charging: {game.batteryTurnsLeft} turn{game.batteryTurnsLeft === 1 ? '' : 's'} to go. Take no damage and it pays {BATTERY_PAYOUT} photons.
        </Text>
      )}
      {game.damageBonus > 0 && <Text style={styles.foot}>Damage catalyst: +{game.damageBonus} to abilities and rams.</Text>}
      {game.usedAbilityThisTurn && <Text style={styles.foot}>Ability spent this turn — move or end the turn.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderLeftWidth: 3, backgroundColor: theme.panel, paddingVertical: 8, paddingHorizontal: 12, gap: 3 },
  line: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, color: theme.ink },
  name: { fontWeight: '700' },
  cost: { fontFamily: fonts.mono, fontSize: 11, color: theme.accent },
  costReady: { backgroundColor: theme.gold, color: theme.goldText },
  foot: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 11, color: theme.textDim, marginTop: 2 },
});
