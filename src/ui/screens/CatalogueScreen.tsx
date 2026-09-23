import React, { useEffect, useState } from 'react';
import { BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHEMISTRY, HALOGEN_ORDER, specimen, BONDING_SOURCE, type SpecimenId } from '@/content/chemistry';
import { ELEMENT_ORDER } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';
import { fonts, theme } from '../theme';
import { PaperButton, SectionLabel } from '../components/Print';

function Source({ title, url }: { title: string; url: string }) {
  const [failed, setFailed] = useState(false);
  return <View>
    <Pressable accessibilityRole="link" accessibilityLabel={`${title}, opens browser`} onPress={() => { setFailed(false); Linking.openURL(url).catch(() => setFailed(true)); }} style={{ paddingVertical: 12 }}>
      <Text style={styles.link}>{title} ↗</Text>
    </Pressable>
    {failed && <Text selectable style={styles.body}>Could not open your browser. {url}</Text>}
  </View>;
}
function Bonding({ symbol }: { symbol: string }) {
  const [shared, setShared] = useState(false);
  return <View style={styles.card}>
    <SectionLabel>Why halogens pair up</SectionLabel>
    <Text style={styles.heading}>Two atoms. One shared pair.</Text>
    <Text style={styles.body}>Each neutral halogen atom has seven outer-shell electrons. In a simple bonding picture, each contributes one electron to a shared pair, forming a single covalent bond. Counting that pair gives each atom an outer shell of eight.</Text>
    <View accessible accessibilityLabel={shared ? `${symbol}2, two atoms sharing one pair of electrons in a single covalent bond` : `Two separate ${symbol} atoms, each with an unpaired electron`} style={styles.bond}>
      <Text style={styles.bondText}>{shared ? `${symbol} : ${symbol}   →   ${symbol}₂` : `${symbol} ·       · ${symbol}`}</Text>
      <Text style={styles.caption}>{shared ? 'The two dots are one shared electron pair.' : 'Only the electrons forming the bond are shown.'}</Text>
    </View>
    <PaperButton label={shared ? 'Show separate atoms' : 'Show the shared pair'} onPress={() => setShared(v => !v)} />
    <Text style={styles.body}>F₂, Cl₂, Br₂ and I₂ are diatomic molecules: “di” means two. These elemental substances normally contain paired atoms. The game starts them separately so you can see bonding happen.</Text>
    <Text style={styles.note}>In the game, a bonded pair occupies two tiles and combines health. Real bonding depends on energy and conditions; two atoms do not fuse their nuclei or become a new element. The combined health and larger attacks are game rules.</Text>
    <Source title="OpenStax · Covalent bonding" url={BONDING_SOURCE} />
  </View>;
}

export function CatalogueScreen() {
  const [selected, setSelected] = useState<SpecimenId | null>(null);
  const toMenu = useGameStore(s => s.toMenu);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (selected) setSelected(null); else toMenu(); return true; });
    return () => listener.remove();
  }, [selected, toMenu]);
  const entry = selected ? specimen(selected) : null;
  return <View style={styles.root}>
    <View style={styles.top}><PaperButton label={selected ? '← All specimens' : '← Main menu'} onPress={() => selected ? setSelected(null) : toMenu()} />
      <Text style={styles.topTitle}>Chemistry Catalogue</Text></View>
    <ScrollView key={selected ?? 'index'} contentContainerStyle={styles.wrap}>
      {!entry ? <>
        <SectionLabel>The science behind the abilities</SectionLabel>
        <Text style={styles.title}>Meet the elements</Text>
        <Text style={styles.body}>Explore all 13 elements featured in the game. Choose a card to discover the real chemistry, the ability it inspired, and the creative liberties we took.</Text>
        {(['Playable elements', 'Halogens'] as const).map(group => <View key={group} style={{ gap: 12 }}>
          <Text style={styles.heading}>{group}</Text>
          <View style={styles.grid}>{(group === 'Halogens' ? HALOGEN_ORDER : ELEMENT_ORDER).map(id => {
            const item = specimen(id);
            return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.enemy ? 'halogen' : 'playable element'}`} onPress={() => setSelected(id)} style={({ pressed }) => [styles.specimen, pressed && { opacity: 0.65 }]}>
              <Text style={styles.number}>{item.number} · {item.state.toLowerCase()}</Text>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.caption}>{CHEMISTRY[id].theme}</Text>
            </Pressable>;
          })}</View>
        </View>)}
        <View style={styles.card}>
          <SectionLabel>A game inspired by chemistry</SectionLabel>
          <Text style={styles.body}>Atomic number counts protons. Atomic weight reflects isotope masses and abundances; it is not a real health stat. The game uses increasing mass for progression.</Text>
          <Text style={styles.body}>“Evolution” changes your playable element. Ordinary chemical reactions rearrange electrons and bonds, not the number of protons. Halogens are elements too—the separate groups here describe their roles in the game.</Text>
          <Text style={styles.note}>This catalogue is always unlocked. Reading or selecting a card does not change your equipment or starting element.</Text>
        </View>
      </> : <>
        <SectionLabel>{entry.enemy ? 'Halogen' : 'Playable element'} · {entry.family}</SectionLabel>
        <View style={styles.identity}><Text style={styles.heroSymbol}>{entry.symbol}</Text><View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.title}>{entry.name}</Text><Text style={styles.caption}>{entry.theme}</Text>
        </View></View>
        <Text style={styles.facts}>Atomic number {entry.number} · Atomic weight {entry.mass}{'\n'}{entry.state} at 20°C, ordinary pressure</Text>
        <View style={styles.card}><SectionLabel>Real chemistry</SectionLabel><Text style={styles.body}>{entry.science}</Text></View>
        <View style={styles.card}><SectionLabel>Why these abilities?</SectionLabel>{entry.connections.map(text => <Text key={text} style={styles.body}>{text}</Text>)}</View>
        <View style={styles.card}><SectionLabel>In the game</SectionLabel>{entry.mechanics.map(m => <View key={m.name} style={{ gap: 4 }}><Text style={styles.name}>{m.name}</Text><Text style={styles.body}>{m.text}</Text></View>)}</View>
        {entry.enemy && <Bonding key={entry.id} symbol={entry.symbol} />}
        <View style={[styles.card, styles.liberty]}><SectionLabel>Creative liberties</SectionLabel><Text style={styles.body}>{entry.licence}</Text></View>
        <SectionLabel>Explore the chemistry</SectionLabel>
        <Text style={styles.caption}>The explanations above work offline. These references open in your browser.</Text>
        <Source title={`Royal Society of Chemistry · ${entry.name}`} url={entry.source} />
        {entry.extraSource && <Source {...entry.extraSource} />}
        <PaperButton label="← Browse all specimens" onPress={() => setSelected(null)} />
      </>}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  top: { padding: 10, gap: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: theme.rule },
  topTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: theme.ink },
  wrap: { padding: 18, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  title: { fontFamily: fonts.serif, fontSize: 30, fontWeight: '700', color: theme.ink },
  heading: { fontFamily: fonts.serif, fontSize: 20, fontWeight: '700', color: theme.ink },
  body: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, color: theme.ink },
  caption: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, color: theme.textDim },
  note: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, color: theme.textDim },
  card: { gap: 12, padding: 16, borderWidth: 1, borderColor: theme.rule, backgroundColor: theme.panel },
  liberty: { borderLeftWidth: 4, borderLeftColor: theme.accent, backgroundColor: theme.accentSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  specimen: { flexBasis: '46%', flexGrow: 1, padding: 14, gap: 4, borderWidth: 1, borderColor: theme.rule, backgroundColor: theme.panel, minHeight: 148 },
  number: { fontFamily: fonts.mono, fontSize: 11, color: theme.textDim },
  symbol: { fontFamily: fonts.serif, fontSize: 34, fontWeight: '700', color: theme.accent },
  name: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: theme.ink },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroSymbol: { fontFamily: fonts.serif, fontSize: 58, fontWeight: '700', color: theme.accent },
  facts: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 21, color: theme.textDim },
  bond: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  bondText: { fontFamily: fonts.mono, fontSize: 23, color: theme.accent },
  link: { fontFamily: fonts.serif, fontSize: 14, color: theme.accent, textDecorationLine: 'underline' },
});
