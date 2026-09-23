import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { lessonCopy, lessons } from '@/game/tutorial';
import { PaperButton, SectionLabel } from './Print';
import { fonts, theme } from '../theme';

export function TutorialCoach() {
  const { tutorial, game, nextLesson, resetLesson, toTutorial, startGame, profileLoaded } = useGameStore();
  if (!tutorial || !game) return null;
  const copy = lessonCopy(tutorial);
  const list = lessons(tutorial.ligand);
  const finished = tutorial.complete && tutorial.lesson === 'hatch';
  return <View style={styles.card} accessibilityLiveRegion="polite">
    <SectionLabel>Tutorial · {list.indexOf(tutorial.lesson) + 1} of {list.length} · no rewards</SectionLabel>
    <Text style={styles.title}>{finished ? 'Ready for a real run!' : copy.title}</Text>
    <Text style={styles.body}>{tutorial.complete ? '✓ Lesson complete. ' + copy.takeaway : copy.instruction}</Text>
    {!tutorial.complete && <Text style={styles.note}>No reinforcements or noble-gas timer in practice. Each new lesson resets health, photons and the board.</Text>}
    {game.gameOver && !tutorial.complete && <Text style={styles.body}>That attempt ended. Reset the lesson and try again.</Text>}
    {tutorial.complete && !finished && <PaperButton label="Next lesson →" variant="primary" onPress={nextLesson} />}
    {finished && <PaperButton label="Start a normal run · Hydrogen" variant="primary" disabled={!profileLoaded} onPress={startGame} />}
    {!finished && <PaperButton label="Reset this lesson" onPress={resetLesson} />}
    <PaperButton label={finished ? 'Try another element / ligand' : 'Change element / ligand'} variant="muted" onPress={toTutorial} />
  </View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderLeftWidth: 4, borderColor: theme.accent, backgroundColor: theme.accentSoft, padding: 12, gap: 8, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontWeight: '700', fontSize: 19, color: theme.ink },
  body: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: theme.ink },
  note: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, color: theme.textDim },
});
