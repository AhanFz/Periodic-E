import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaperButton } from './Print';
import { fonts, theme } from '../theme';
import { AIM_ACTION_WORDS } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';
import type { Direction } from '@/game/types';
import type { Game } from '@/game/engine';

const DIRS: Array<{ dir: Direction; dx: number; dy: number; glyph: string }> = [
  { dir: 'left', dx: -1, dy: 0, glyph: '←' },
  { dir: 'up', dx: 0, dy: -1, glyph: '↑' },
  { dir: 'down', dx: 0, dy: 1, glyph: '↓' },
  { dir: 'right', dx: 1, dy: 0, glyph: '→' },
];

function Slot({ label, spent }: { label: string; spent: boolean }) {
  return <Text style={[styles.slot, spent && styles.slotSpent]}>{spent ? '☑' : '☐'} {label}</Text>;
}

export function ControlPad({ game }: { game: Game }) {
  const { move, previewAim, confirmAim, cancelAim, ability, passTurn, shatter, beginThrow } = useGameStore();
  const d = game.elementData;

  if (game.aiming) {
    const canConfirm = !!game.aimDirection && game.aimLine.length > 0;
    const word = game.aimingFor ? AIM_ACTION_WORDS[game.aimingFor] : 'Confirm';
    const sheet = game.aimingFor === 'c_sheet';
    return (
      <View style={styles.grid}>
        {DIRS.map(b => (
          <PaperButton key={b.dir} label={b.glyph} big style={styles.quarter}
            variant={game.aimDirection === b.dir ? 'highlight' : 'outline'} onPress={() => previewAim(b.dir)} />
        ))}
        {sheet ? (
          <>
            <PaperButton label="Curve ↺" variant="highlight" style={styles.half} disabled={!canConfirm} onPress={() => confirmAim('left')} />
            <PaperButton label="Curve ↻" variant="highlight" style={styles.half} disabled={!canConfirm} onPress={() => confirmAim('right')} />
            <PaperButton label="Cancel" variant="muted" style={styles.wide} onPress={cancelAim} />
          </>
        ) : (
          <>
            <PaperButton label={word} variant="highlight" style={styles.half} disabled={!canConfirm} onPress={() => confirmAim('left')} />
            <PaperButton label="Cancel" variant="muted" style={styles.half} onPress={cancelAim} />
          </>
        )}
      </View>
    );
  }

  const moved = game.movedThisTurn;
  const used = game.usedAbilityThisTurn;
  const locked = game.abilityLockedTurns > 0;
  const can1 = game.photons >= d.ability1Cost && !locked && !used;
  const can3 = game.photons >= 3 && !locked && !used;
  const anySpent = moved || used;

  return (
    <View style={styles.grid}>
      <View style={styles.slots}>
        <Slot label="Move" spent={moved} />
        <Slot label="Ability" spent={used} />
        <Text style={styles.slotHint}>{anySpent ? (moved && used ? '' : 'one action left') : 'two actions this turn'}</Text>
      </View>
      {DIRS.map(b => <PaperButton key={b.dir} label={b.glyph} big style={styles.quarter} disabled={moved} onPress={() => move(b.dx, b.dy)} />)}
      <PaperButton label={locked ? '🔒 locked' : used ? '✓ used' : `${d.ability1Short} · ${d.ability1Cost} 🔆`} style={styles.half} disabled={!can1} onPress={() => ability(1)} />
      <PaperButton label={locked ? '🔒 locked' : used ? '✓ used' : `${d.ability2Short} · 3 🔆`} style={styles.half}
        variant={can3 ? 'highlight' : 'outline'} disabled={!can3} onPress={() => ability(3)} />
      {game.encasedCount > 0 && <PaperButton label={`🪟 Shatter (${game.encasedCount})`} variant="primary" style={game.heldSpear === null ? styles.wide : styles.half} disabled={used} onPress={shatter} />}
      {game.heldSpear !== null && <PaperButton label={`💠 Throw (${game.heldSpear})`} variant="primary" style={game.encasedCount === 0 ? styles.wide : styles.half} disabled={used} onPress={beginThrow} />}
      <PaperButton label={anySpent ? 'End turn ▸' : 'Skip turn ▸'} variant={anySpent ? 'primary' : 'muted'} style={styles.wide} onPress={passTurn} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slots: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.rule },
  slot: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: theme.ink },
  slotSpent: { color: theme.textDim, fontWeight: '400' },
  slotHint: { marginLeft: 'auto', fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 11, color: theme.textDim },
  quarter: { width: '23%' },
  half: { width: '48.5%' },
  wide: { width: '100%' },
});
