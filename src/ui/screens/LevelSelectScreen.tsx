import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Caption, PaperButton, Rule, SectionLabel } from '../components/Print';
import { fonts, theme } from '../theme';
import { ATOMIC_MASS, ATOMIC_NUMBER, ELEMENTS, ELEMENT_COLORS, ELEMENT_NAMES, ELEMENT_ORDER } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';
import type { ElementKey } from '@/game/types';

/** A periodic-table cell: atomic number, symbol, name, mass, with the element's colour as a header band. */
function ElementCell({ element, onPress }: { element: ElementKey; onPress: () => void }) {
  const d = ELEMENTS[element];
  return (
    <Pressable style={({ pressed }) => [styles.cell, pressed && { opacity: 0.75 }]} onPress={onPress}>
      <View style={[styles.band, { backgroundColor: ELEMENT_COLORS[element] }]} />
      <Text style={styles.z}>{ATOMIC_NUMBER[element]}</Text>
      {d.noble && <Text style={styles.dagger}>†</Text>}
      <Text style={styles.symbol}>{d.symbol}</Text>
      <Text style={styles.name}>{ELEMENT_NAMES[element]}</Text>
      <Text style={styles.mass}>{ATOMIC_MASS[element]}</Text>
      <Text style={styles.kit}>{d.ability1Short} · {d.ability2Short}</Text>
    </Pressable>
  );
}

export function LevelSelectScreen() {
  const startGame = useGameStore(s => s.startGame);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <SectionLabel style={styles.center}>An illustrated course in halogen survival</SectionLabel>
      <Text style={styles.title}>Element Evolution</Text>
      <Rule double style={{ marginTop: 8, marginBottom: 12 }} />
      <Text style={styles.lede}>
        Climb the periodic table from Hydrogen to Neon across a sequence of reaction chambers. Every halogen destroyed
        pays a photon; photons buy abilities and, at the isotope hut, your next element.
      </Text>

      <PaperButton label="Begin at Chapter 1 — Hydrogen" variant="primary" onPress={() => startGame('hydrogen')} style={styles.primary} />

      <SectionLabel style={{ marginBottom: 8 }}>Table of contents · practice any element</SectionLabel>
      <View style={styles.grid}>
        {ELEMENT_ORDER.map(key => <ElementCell key={key} element={key} onPress={() => startGame(key)} />)}
      </View>
      <Caption style={{ marginTop: 10 }}>† Noble gas: must reach the hatch within a turn limit or destabilise.</Caption>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 56, paddingBottom: 40, maxWidth: 600, width: '100%', alignSelf: 'center' },
  center: { textAlign: 'center' },
  title: { fontFamily: fonts.serif, fontSize: 34, fontWeight: '700', color: theme.ink, textAlign: 'center', marginTop: 6 },
  lede: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, color: theme.ink, textAlign: 'center', marginBottom: 18 },
  primary: { marginBottom: 26, paddingVertical: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  cell: { width: '30%', minWidth: 100, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.ink, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 6, alignItems: 'center', overflow: 'hidden' },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  z: { position: 'absolute', top: 8, left: 7, fontFamily: fonts.mono, fontSize: 10, color: theme.textDim },
  dagger: { position: 'absolute', top: 6, right: 8, fontFamily: fonts.serif, fontSize: 12, color: theme.accent },
  symbol: { fontFamily: fonts.serif, fontSize: 32, fontWeight: '700', color: theme.ink, marginTop: 6 },
  name: { fontFamily: fonts.serif, fontSize: 12, color: theme.ink },
  mass: { fontFamily: fonts.mono, fontSize: 10, color: theme.textDim, marginTop: 1 },
  kit: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 10, color: theme.textDim, marginTop: 5 },
});
