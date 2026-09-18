import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AbilityBar } from '../components/AbilityBar';
import { Board } from '../components/Board';
import { ConfirmModal } from '../components/ConfirmModal';
import { ControlPad } from '../components/ControlPad';
import { HutModal } from '../components/HutModal';
import { MessageBanner } from '../components/MessageBanner';
import { Rule, SectionLabel } from '../components/Print';
import { StatsBar } from '../components/StatsBar';
import { fonts, theme } from '../theme';
import { ATOMIC_NUMBER, ELEMENT_NAMES } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';

export function GameScreen() {
  const { game, tick, pendingMove, confirmPendingMove, cancelPendingMove } = useGameStore();
  if (!game) return null;
  const el = game.currentElement;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.runningHead}>
          <SectionLabel>Element Evolution</SectionLabel>
          <SectionLabel>Grid {game.depth} · Turn {game.turn}</SectionLabel>
        </View>
        <Rule style={{ marginBottom: 8 }} />
        <Text style={styles.title}>
          <Text style={styles.chapter}>{game.depth}. </Text>{ELEMENT_NAMES[el]}
          <Text style={styles.titleSym}>  {game.elementData.symbol}</Text>
        </Text>
        <Text style={styles.subtitle}>
          Z = {ATOMIC_NUMBER[el]} · {game.layout.shape} layout{game.turnsLeft !== null ? ` · ${game.turnsLeft} turns before destabilising` : ''}
        </Text>
        <Rule double style={{ marginTop: 6, marginBottom: 12 }} />

        <StatsBar game={game} />
        <View style={styles.gap} />
        <MessageBanner text={game.message} type={game.messageType} />
        <View style={styles.gap} />
        <AbilityBar game={game} />

        <Board game={game} tick={tick} />

        <ControlPad game={game} />
      </ScrollView>

      <HutModal game={game} />
      <ConfirmModal
        visible={!!pendingMove}
        title="Something's there"
        body="You sense something dangerous on that tile. Step forward anyway?"
        confirmLabel="Step forward"
        cancelLabel="Stay put"
        onConfirm={confirmPendingMove}
        onCancel={cancelPendingMove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  wrap: { padding: 16, paddingTop: 44, paddingBottom: 40, maxWidth: 592, width: '100%', alignSelf: 'center' },
  runningHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontFamily: fonts.serif, fontSize: 26, fontWeight: '700', color: theme.ink },
  chapter: { color: theme.accent },
  titleSym: { fontSize: 18, fontWeight: '400', color: theme.textDim },
  subtitle: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 13, color: theme.textDim, marginTop: 2 },
  gap: { height: 10 },
});
