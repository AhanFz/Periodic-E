import React, { useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Caption, PaperButton, Rule, SectionLabel } from '../components/Print';
import { fonts, theme } from '../theme';
import { LIGANDS, QUANTA_GLYPH } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';

export function LevelSelectScreen() {
  const [replace, setReplace] = useState(false);
  const { savedRun, continueRun, saveWarning } = useGameStore();
  const toCatalogue = useGameStore(s => s.toCatalogue);
  const toTutorial = useGameStore(s => s.toTutorial);
  const profileLoaded = useGameStore(s => s.profileLoaded);
  const startGame = useGameStore(s => s.startGame);
  const toStore = useGameStore(s => s.toStore);
  const profile = useGameStore(s => s.profile);
  const equipped = profile.equippedLigand;
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <SectionLabel style={styles.center}>An illustrated course in halogen survival</SectionLabel>
      <Text style={styles.title}>Element Evolution</Text>
      <Rule double style={{ marginTop: 8, marginBottom: 12 }} />
      <Text style={styles.lede}>
        Climb the periodic table from Hydrogen to Neon across a sequence of reaction chambers. Every halogen destroyed
        pays a photon; photons buy abilities and, at the isotope hut, your next element.
      </Text>

      <View style={styles.ligandBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ligandLabel}>Ligand equipped</Text>
          <Text style={[styles.ligandName, !equipped && styles.ligandNone]}>
            {equipped ? LIGANDS[equipped].name : 'None — running bare'}
          </Text>
        </View>
        <PaperButton label={`Ligands · ${QUANTA_GLYPH} ${profile.quanta}`} variant="highlight" onPress={toStore} />
      </View>

      {savedRun && <View style={{ gap: 6, marginBottom: 14 }}>
        <PaperButton label={`Continue · ${savedRun.elementData.symbol} · Grid ${savedRun.depth}`} variant="primary" onPress={continueRun} />
        <Caption>Turn {savedRun.turn} · Health {savedRun.elementHealth}/{savedRun.maxHealth} · {savedRun.photons} photons</Caption>
      </View>}
      {saveWarning && <Text style={{ color: theme.red, marginBottom: 12 }}>{saveWarning}</Text>}
      <PaperButton label={savedRun ? 'Start a new run · Hydrogen' : 'Begin at Chapter 1 — Hydrogen'} variant="primary" disabled={!profileLoaded} onPress={() => savedRun ? setReplace(true) : startGame()} style={styles.primary} />

      <PaperButton label="Playable tutorial" variant="outline" onPress={toTutorial} />
      <Caption style={{ marginTop: 10 }}>Learn by playing. Try any element and any ligand for free. Normal runs always begin as Hydrogen.</Caption>
      <PaperButton label="Chemistry Catalogue" variant="outline" onPress={toCatalogue} style={{ marginTop: 20 }} />
      <Caption style={{ marginTop: 8 }}>Meet every element and halogen. Discover the chemistry behind their abilities.</Caption>
      <ConfirmModal visible={replace} title="Replace your saved run?" body="Starting a new run replaces your unfinished run. Your quanta and ligands stay saved." confirmLabel="Start new run" cancelLabel="Keep saved run" onCancel={() => setReplace(false)} onConfirm={() => { setReplace(false); startGame(); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 56, paddingBottom: 40, maxWidth: 600, width: '100%', alignSelf: 'center' },
  center: { textAlign: 'center' },
  title: { fontFamily: fonts.serif, fontSize: 34, fontWeight: '700', color: theme.ink, textAlign: 'center', marginTop: 6 },
  lede: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, color: theme.ink, textAlign: 'center', marginBottom: 18 },
  primary: { marginBottom: 26, paddingVertical: 14 },
  ligandBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
    borderTopWidth: 2, borderBottomWidth: 1, borderColor: theme.ink, backgroundColor: theme.panel,
    paddingVertical: 9, paddingHorizontal: 12,
  },
  ligandLabel: { fontFamily: fonts.serif, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim },
  ligandName: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: theme.accent, marginTop: 2 },
  ligandNone: { color: theme.textDim, fontWeight: '400', fontStyle: 'italic' },
});
