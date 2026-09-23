import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PaperButton, Caption, Rule, SectionLabel } from '../components/Print';
import { fonts, theme } from '../theme';
import { ELEMENTS, ELEMENT_NAMES, ELEMENT_ORDER, LIGANDS, LIGAND_ORDER } from '@/game/constants';
import type { ElementKey, LigandId } from '@/game/types';
import { useGameStore } from '@/store/gameStore';

export function TutorialSetupScreen() {
  const [element, setElement] = useState<ElementKey>('hydrogen');
  const [ligand, setLigand] = useState<LigandId | null>(null);
  const { startTutorial, toMenu } = useGameStore();
  const d = ELEMENTS[element];
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <SectionLabel>Practice laboratory</SectionLabel>
      <Text style={styles.title}>Learn by playing</Text>
      <Rule double style={{ marginVertical: 12 }} />
      <Text style={styles.body}>Move, wait, ram, use both abilities and try your ligand in guided rooms. Reset any lesson whenever you like.</Text>
      <Caption>All elements and ligands are free to try here. No purchases, quanta rewards or run records. Your normal equipment stays unchanged.</Caption>
      <SectionLabel style={styles.heading}>1 · Choose an element</SectionLabel>
      <View style={styles.grid}>
        {ELEMENT_ORDER.map(id => <PaperButton key={id} label={`${ELEMENTS[id].symbol} · ${ELEMENT_NAMES[id]}`} variant={element === id ? 'primary' : 'outline'} onPress={() => setElement(id)} style={styles.choice} />)}
      </View>
      <View style={styles.note}>
        <Text style={styles.body}>{d.ability1Name} · {d.ability1Cost} photons: {d.ability1Desc}</Text>
        <Text style={styles.body}>{d.ability2Name} · {d.ability2Cost} photons: {d.ability2Desc}</Text>
      </View>
      <SectionLabel style={styles.heading}>2 · Choose a ligand</SectionLabel>
      <PaperButton label="No ligand · learn the basics" variant={ligand === null ? 'primary' : 'outline'} onPress={() => setLigand(null)} />
      {LIGAND_ORDER.map(id => <View key={id} style={styles.option}>
        <PaperButton label={LIGANDS[id].name} variant={ligand === id ? 'primary' : 'outline'} onPress={() => setLigand(id)} />
        <Caption>{LIGANDS[id].description}</Caption>
      </View>)}
      <PaperButton label={`Start tutorial as ${ELEMENT_NAMES[element]}`} variant="highlight" onPress={() => startTutorial(element, ligand)} style={styles.heading} />
      <PaperButton label="Back to main menu" onPress={toMenu} style={styles.heading} />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 40, paddingBottom: 40, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.serif, fontSize: 30, fontWeight: '700', color: theme.ink, marginTop: 8 },
  body: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, color: theme.ink, marginBottom: 8 },
  heading: { marginTop: 18, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexGrow: 1, flexBasis: '45%' },
  note: { padding: 12, marginTop: 12, backgroundColor: theme.panel },
  option: { marginTop: 10, gap: 4 },
});
