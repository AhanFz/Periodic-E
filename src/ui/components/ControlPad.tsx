import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PaperButton } from './Print';
import { fonts, theme } from '../theme';
import { actionPreview } from '@/game/actions';
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
  return <Text style={[styles.slot, spent && styles.slotSpent]}>{label}: {spent ? 'used' : 'ready'}</Text>;
}

export function ControlPad({ game }: { game: Game }) {
  const { openHut, move, ability, confirmAim, passTurn, shatter, previewAim, cancelAim, beginThrow, prepareAction, pendingAction, cancelAction } = useGameStore();
  if (pendingAction) {
    const preview = actionPreview(game, pendingAction);
    return <View style={{ gap: 6 }}>
      <Text style={styles.slot}>{preview.title} · {preview.next.gameOver ? 'Ends the run' : preview.exitsGrid ? 'Leaves this grid' : preview.endsTurn ? 'Ends turn → enemies respond' : 'Does not end turn'}</Text>
      <ScrollView style={{ maxHeight: 105 }}><Text style={styles.preview}>{preview.lines.join('\n')}</Text></ScrollView>
      <Text style={styles.slotHint}>Immediate effects only. Enemy responses are not predicted.</Text>
      <PaperButton label="Back to controls" onPress={cancelAction} />
    </View>;
  }
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
            <PaperButton label="Curve ↺" variant="highlight" style={styles.half} disabled={!canConfirm} onLongPress={() => prepareAction({ kind: 'aim', orientation: 'left' })} onPress={() => confirmAim('left')} />
            <PaperButton label="Curve ↻" variant="highlight" style={styles.half} disabled={!canConfirm} onLongPress={() => prepareAction({ kind: 'aim', orientation: 'right' })} onPress={() => confirmAim('right')} />
            <PaperButton label="Cancel" variant="muted" style={styles.wide} onPress={cancelAim} />
          </>
        ) : (
          <>
            <PaperButton label={word} variant="highlight" style={styles.half} disabled={!canConfirm} onLongPress={() => prepareAction({ kind: 'aim', orientation: 'left' })} onPress={() => confirmAim('left')} />
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
  const can3 = game.photons >= d.ability2Cost && !locked && !used;
  const anySpent = moved || used;

  return (
    <View style={styles.grid}>
      <View style={styles.slots}>
        <Slot label="Move" spent={moved} />
        <Slot label="Ability" spent={used} />
        <Text style={styles.slotHint}>{anySpent ? '' : 'Your turn'}</Text>
      </View>
      <Text style={[styles.preview,{width:'100%',fontSize:12}]}>{moved ? 'Move used. Use an ability or end your turn.' : used ? 'Ability used. Move or end your turn.' : 'Move + use one ability, in either order. End turn to wait.'}</Text>
      {DIRS.map(b => <PaperButton key={b.dir} label={b.glyph} big style={styles.quarter} disabled={moved} onLongPress={() => prepareAction({ kind: 'move', dx: b.dx, dy: b.dy })} onPress={() => move(b.dx, b.dy)} />)}
      <PaperButton label={locked ? '🔒 locked' : used ? '✓ used' : `${d.ability1Short} · ${d.ability1Cost} 🔆`} style={styles.half} disabled={!can1} onLongPress={() => prepareAction({ kind: 'ability', tier: 1 })} onPress={() => ability(1)} />
      <PaperButton label={locked ? '🔒 locked' : used ? '✓ used' : `${d.ability2Short} · ${d.ability2Cost} 🔆`} style={styles.half}
        variant={can3 ? 'highlight' : 'outline'} disabled={!can3} onLongPress={() => prepareAction({ kind: 'ability', tier: 3 })} onPress={() => ability(3)} />
      {game.encasedCount > 0 && <PaperButton label={`🪟 Shatter (${game.encasedCount})`} variant="primary" style={game.heldSpear === null ? styles.wide : styles.half} disabled={used} onLongPress={() => prepareAction({ kind: 'shatter' })} onPress={shatter} />}
      {game.heldSpear !== null && <PaperButton label={`💠 Throw (${game.heldSpear})`} variant="primary" style={game.encasedCount === 0 ? styles.wide : styles.half} disabled={used} onPress={beginThrow} />}
      {game.canOpenHut && <PaperButton label="⚗️ Open hut" style={styles.wide} onPress={openHut} />}
      {/* Always live: a turn can be passed with nothing spent. Muted here read as disabled. */}
      <PaperButton label={anySpent ? 'End turn ▸' : 'Skip turn ▸'} variant={anySpent ? 'primary' : 'outline'} style={styles.wide} onLongPress={() => prepareAction({ kind: 'pass' })} onPress={passTurn} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preview: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 18, color: theme.ink },
  slots: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.rule },
  slot: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: theme.ink },
  slotSpent: { color: theme.textDim, fontWeight: '400' },
  slotHint: { marginLeft: 'auto', fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 11, color: theme.textDim },
  quarter: { width: '23%', minHeight: 44, paddingVertical: 4 },
  half: { width: '48.5%', minHeight: 44, paddingVertical: 6 },
  wide: { width: '100%', minHeight: 44, paddingVertical: 6 },
});
