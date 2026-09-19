import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { PaperButton, Rule, SectionLabel } from './Print';
import { fonts, theme } from '../theme';
import { ELEMENT_NAMES } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';
import type { Game } from '@/game/engine';

/**
 * Pause, quick reference, and the two ways out of a run. Quitting and restarting both throw the
 * run away, so each asks once before it does.
 */
export function PauseModal({ game }: { game: Game }) {
  const { paused, resume, retry, toMenu, hapticsOn, toggleHaptics } = useGameStore();
  const [confirming, setConfirming] = useState<'quit' | 'restart' | null>(null);

  const close = () => { setConfirming(null); resume(); };
  const doRetry = () => { setConfirming(null); retry(); };
  const doQuit = () => { setConfirming(null); toMenu(); };

  return (
    <Modal visible={paused && !game.gameOver} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <SectionLabel>Experiment suspended</SectionLabel>
          <Text style={styles.title}>Paused</Text>
          <Rule double style={{ marginTop: 4, marginBottom: 10 }} />

          <Text style={styles.line}>
            {ELEMENT_NAMES[game.currentElement]} on grid {game.depth}, turn {game.turn}.
            Health {game.elementHealth}/{game.maxHealth}, {game.photons} photons, {game.totalKills} kills.
          </Text>
          <Text style={styles.foot}>
            One move and one ability per turn, in either order. Walk into a halogen to ram it.
            Hold any atom on the board for its card.
          </Text>

          {confirming === null ? (
            <View style={styles.stack}>
              <PaperButton label="Resume ▸" variant="primary" onPress={close} />
              <PaperButton label={`Haptics: ${hapticsOn ? 'on' : 'off'}`} variant="outline" onPress={toggleHaptics} />
              <PaperButton label="Restart run" variant="outline" onPress={() => setConfirming('restart')} />
              <PaperButton label="Quit to contents" variant="muted" onPress={() => setConfirming('quit')} />
            </View>
          ) : (
            <View style={styles.stack}>
              <Text style={styles.confirm}>
                {confirming === 'restart'
                  ? 'Restart from Hydrogen on a new grid 1? This run is lost.'
                  : 'Leave this run and go back to the contents? This run is lost.'}
              </Text>
              <View style={styles.row}>
                <PaperButton label="Keep playing" variant="outline" style={{ flex: 1 }} onPress={() => setConfirming(null)} />
                <PaperButton
                  label={confirming === 'restart' ? 'Restart' : 'Quit'}
                  variant="danger"
                  style={{ flex: 1 }}
                  onPress={confirming === 'restart' ? doRetry : doQuit}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,36,48,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: theme.paper, borderWidth: 1, borderLeftWidth: 4, borderColor: theme.ink,
    borderLeftColor: theme.accent, padding: 20, width: '100%', maxWidth: 380,
  },
  title: { fontFamily: fonts.serif, fontSize: 24, fontWeight: '700', color: theme.ink, marginTop: 2 },
  line: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, color: theme.ink },
  foot: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 11.5, lineHeight: 17, color: theme.textDim, marginTop: 8 },
  stack: { gap: 9, marginTop: 16 },
  row: { flexDirection: 'row', gap: 10 },
  confirm: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, color: theme.red },
});
