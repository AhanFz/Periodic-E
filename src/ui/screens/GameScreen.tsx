import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AbilityBar } from '../components/AbilityBar';
import { TutorialCoach } from '../components/TutorialCoach';
import { Board } from '../components/Board';
import { ConfirmModal } from '../components/ConfirmModal';
import { ControlPad } from '../components/ControlPad';
import { HutModal } from '../components/HutModal';
import { InspectCard } from '../components/InspectCard';
import { LigandFlash } from '../components/LigandFlash';
import { PauseModal } from '../components/PauseModal';
import { PaperButton } from '../components/Print';
import { StatsBar } from '../components/StatsBar';
import { fonts, theme } from '../theme';
import { ELEMENT_NAMES, LIGANDS } from '@/game/constants';
import { lessonCopy } from '@/game/tutorial';
import { useGameStore } from '@/store/gameStore';

export function GameScreen() {
  const state = useGameStore();
  const { game: canonical, tick, pendingMove, confirmPendingMove, cancelPendingMove, pause, tutorial, frame, finishPlayback } = state;
  const [details, setDetails] = useState(false);
  const [space, setSpace] = useState({ width: 300, height: 300 });
  const { width, height } = useWindowDimensions();
  useEffect(() => setDetails(false), [tutorial?.lesson, canonical]);
  if (!canonical) return null;
  const game = frame?.game ?? canonical;
  const landscape = width > height;
  const complete = tutorial?.complete;
  return <View style={styles.root}>
    <View style={styles.header}>
      {state.saveWarning && <Text style={{ color: theme.red, fontSize: 12 }}>{state.saveWarning}</Text>}
      <View style={styles.row}>
        <Text style={styles.title}>{game.elementData.symbol} · {ELEMENT_NAMES[game.currentElement]}</Text>
        <Pressable accessibilityRole="button" style={styles.nav} onPress={() => setDetails(true)}><Text style={styles.text}>Details</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Pause" style={styles.nav} onPress={pause}><Text style={styles.text}>Ⅱ</Text></Pressable>
      </View>
      <Text style={styles.readings}>♥ {game.elementHealth}/{game.maxHealth}   ◇ {game.shieldPoints}   🔆 {game.photons}/5   Grid {game.depth} · T{game.turn}{game.turnsLeft !== null ? ` · ${game.turnsLeft} turns left` : ''}</Text>
      {game.ligand && <Text style={styles.small}>⬢ {LIGANDS[game.ligand].name}{game.exothermicActive ? ` · RAM ${game.ramDamage + game.damageBonus}` : ''}{game.ligand === 'supercooled' ? game.supercooledReady ? ' · save ready' : ' · save used' : ''}</Text>}
    </View>
    <View style={[styles.play, landscape && { flexDirection: 'row' }]}>
      <View style={styles.boardArea} onLayout={e => setSpace(e.nativeEvent.layout)}>
        <Board game={game} tick={tick} compact maxHeight={space.height} maxWidth={space.width} inert={!!frame} />
      </View>
      <View style={[styles.footer, !landscape && { height: Math.min(height * 0.55, tutorial ? 300 : 268) }, landscape && { width: '45%', maxWidth: 360, maxHeight: '100%' }]}>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 6 }}>
          <Text accessibilityLiveRegion="polite" numberOfLines={2} style={styles.message}>{frame ? frame.label : game.message}</Text>
          {tutorial && !frame && <Pressable onPress={() => setDetails(true)} accessibilityRole="button" style={{ paddingVertical: 5 }}><Text numberOfLines={2} style={styles.small}>Tutorial · {complete ? '✓ Complete' : lessonCopy(tutorial).instruction} · Details ↗</Text></Pressable>}
          {frame ? <PaperButton label="Finish animation →" onPress={finishPlayback} /> : complete ?
            <PaperButton label={tutorial?.lesson === 'hatch' ? 'Start a run · Hydrogen' : 'Next lesson →'} variant="primary" disabled={!state.profileLoaded && tutorial?.lesson === 'hatch'} onPress={tutorial?.lesson === 'hatch' ? state.startGame : state.nextLesson} /> :
            game.gameOver ? <PaperButton label="Reset lesson" onPress={state.resetLesson} /> : <ControlPad game={canonical} />}
        </ScrollView>
      </View>
    </View>
    {!frame && <><HutModal game={canonical} /><InspectCard game={canonical} /><LigandFlash game={canonical} /></>}
    <PauseModal game={canonical} />
    <ConfirmModal visible={!!pendingMove} title="Something's there" body="You sense something dangerous on that tile. Step forward anyway?" confirmLabel="Step forward" cancelLabel="Stay put" onConfirm={confirmPendingMove} onCancel={cancelPendingMove} />
    <Modal visible={details} transparent animationType="fade" onRequestClose={() => setDetails(false)}>
      <View style={styles.backdrop}><View style={styles.card}>
        <PaperButton label="Back to board" onPress={() => setDetails(false)} />
        <ScrollView><StatsBar game={game} /><AbilityBar game={game} />
          <TutorialCoach />
          <Text style={styles.text}>{game.message}</Text>
          <Text style={styles.text}>Hold an atom to inspect it. Arrows show the next planned move. Gold outlines mark targeting; lava, frost and poison remain underneath atoms. A move and an ability end the turn together, or use End turn whenever you choose.</Text>
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 10, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  header: { paddingTop: 4, paddingBottom: 6, borderBottomWidth: 1, borderColor: theme.rule },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: fonts.serif, fontSize: 19, fontWeight: '700', color: theme.ink },
  nav: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.serif, fontSize: 14, color: theme.ink, marginVertical: 6 },
  readings: { fontFamily: fonts.mono, fontSize: 12, color: theme.ink },
  small: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 16, color: theme.accent },
  play: { flex: 1, minHeight: 0 },
  boardArea: { flex: 1, minHeight: 100, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  footer: { maxHeight: '58%', paddingVertical: 8, borderTopWidth: 1, borderColor: theme.rule },
  message: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 18, color: theme.ink },
  backdrop: { flex: 1, padding: 20, backgroundColor: '#17252c88', justifyContent: 'center', alignItems: 'center' },
  card: { maxHeight: '90%', width: '100%', maxWidth: 560, padding: 16, gap: 12, backgroundColor: theme.paper },
});
