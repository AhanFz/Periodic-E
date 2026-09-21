import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { PaperButton, Rule, SectionLabel } from './Print';
import { fonts, theme } from '../theme';
import { useGameStore } from '@/store/gameStore';
import type { Game } from '@/game/engine';

/**
 * A once-per-run moment, given a card of its own. The message line is too easy to miss for
 * something that changed whether the run is still alive.
 */
export function LigandFlash({ game }: { game: Game }) {
  const dismissFlash = useGameStore(s => s.dismissFlash);
  const flash = game.ligandFlash;
  return (
    <Modal visible={!!flash && !game.gameOver} transparent animationType="fade" onRequestClose={dismissFlash}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <SectionLabel style={{ color: theme.accent }}>Ligand · it fired</SectionLabel>
          <Text style={styles.title}>{flash?.title}</Text>
          <Rule double style={{ marginTop: 4, marginBottom: 10 }} />
          <Text style={styles.body}>{flash?.body}</Text>
          <PaperButton label="Keep going ▸" variant="primary" onPress={dismissFlash} style={{ marginTop: 16 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,16,32,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: theme.paper, borderWidth: 2, borderColor: theme.accent,
    padding: 20, width: '100%', maxWidth: 380,
  },
  title: { fontFamily: fonts.serif, fontSize: 24, fontWeight: '700', color: theme.ink, marginTop: 2 },
  body: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: theme.ink },
});
