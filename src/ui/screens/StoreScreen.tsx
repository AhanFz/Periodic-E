import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Caption, PaperButton, Rule, SectionLabel } from '../components/Print';
import { fonts, theme } from '../theme';
import { LIGANDS, LIGAND_ORDER, QUANTA_GLYPH, QUANTA_PER_WIN } from '@/game/constants';
import { canAfford, owns } from '@/persistence/profile';
import { useGameStore } from '@/store/gameStore';
import type { Profile } from '@/persistence/profile';
import type { LigandId } from '@/game/types';

function LigandCard({ id, profile, onBuy, onEquip, onUnequip }: {
  id: LigandId;
  profile: Profile;
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
}) {
  const d = LIGANDS[id];
  const owned = owns(profile, id);
  const equipped = profile.equippedLigand === id;
  const affordable = canAfford(profile, id);

  return (
    <View style={[styles.card, equipped && styles.cardEquipped]}>
      <View style={styles.cardHead}>
        <Text style={styles.name}>{d.name}</Text>
        {equipped && <Text style={styles.badge}>EQUIPPED</Text>}
      </View>
      <Text style={styles.flavour}>{d.flavour}</Text>
      <Text style={styles.effect}>{d.description}</Text>
      <View style={styles.actions}>
        {!owned && <Text style={[styles.price, !affordable && styles.priceShort]}>{QUANTA_GLYPH} {d.price}</Text>}
        {owned
          ? equipped
            ? <PaperButton label="Unequip" variant="outline" style={styles.action} onPress={onUnequip} />
            : <PaperButton label="Equip" variant="primary" style={styles.action} onPress={onEquip} />
          : <PaperButton label={affordable ? 'Buy' : 'Not enough'} variant="highlight" disabled={!affordable} style={styles.action} onPress={onBuy} />}
      </View>
    </View>
  );
}

/** Ligands are bought and equipped only here. A run's ligand is fixed the moment it starts. */
export function StoreScreen() {
  const { profile, buyLigand, equip, toMenu } = useGameStore();
  const equippedName = profile.equippedLigand ? LIGANDS[profile.equippedLigand].name : 'None — running bare';

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <SectionLabel>Appendix B · Ligand catalogue</SectionLabel>
      <Text style={styles.title}>Ligands</Text>
      <Rule double style={{ marginTop: 6, marginBottom: 10 }} />

      <View style={styles.balance}>
        <View>
          <Text style={styles.balanceLabel}>Quanta</Text>
          <Text style={styles.balanceValue}>{QUANTA_GLYPH} {profile.quanta}</Text>
        </View>
        <View style={styles.balanceRight}>
          <Text style={styles.balanceLabel}>Equipped</Text>
          <Text style={styles.balanceEquipped}>{equippedName}</Text>
        </View>
      </View>

      <Text style={styles.lede}>
        A ligand binds to your element and changes how it behaves for a whole run. You carry exactly one,
        chosen before you begin. Catalysts are the other thing: those are bought mid-run with photons and
        simply add to your numbers, while a ligand waits for a situation and then fires.
      </Text>

      {LIGAND_ORDER.map(id => (
        <LigandCard
          key={id}
          id={id}
          profile={profile}
          onBuy={() => buyLigand(id)}
          onEquip={() => equip(id)}
          onUnequip={() => equip(null)}
        />
      ))}

      <Caption style={{ marginTop: 6 }}>
        Quanta are earned by finishing a run: {QUANTA_PER_WIN} for escaping as Neon. Photons stay inside a run;
        quanta carry across them.
      </Caption>

      <PaperButton label="Back to contents" variant="outline" onPress={toMenu} style={{ marginTop: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 52, paddingBottom: 40, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.serif, fontSize: 30, fontWeight: '700', color: theme.ink, marginTop: 4 },
  balance: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderTopWidth: 2, borderBottomWidth: 1, borderColor: theme.ink, backgroundColor: theme.panel,
    paddingVertical: 9, paddingHorizontal: 12, marginBottom: 12,
  },
  balanceRight: { alignItems: 'flex-end', flexShrink: 1, marginLeft: 12 },
  balanceLabel: { fontFamily: fonts.serif, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: theme.textDim },
  balanceValue: { fontFamily: fonts.mono, fontSize: 20, fontWeight: '700', color: theme.ink, marginTop: 2 },
  balanceEquipped: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: theme.accent, marginTop: 4, textAlign: 'right' },
  lede: { fontFamily: fonts.serif, fontSize: 12.5, lineHeight: 18, color: theme.ink, marginBottom: 14 },
  card: { borderWidth: 1, borderLeftWidth: 3, borderColor: theme.border, borderLeftColor: theme.rule, backgroundColor: theme.panel, padding: 12, marginBottom: 10 },
  cardEquipped: { borderLeftColor: theme.accent, backgroundColor: theme.accentSoft },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: theme.ink, flexShrink: 1 },
  badge: {
    fontFamily: fonts.serif, fontSize: 9, letterSpacing: 1.2, color: '#fbf8ef', backgroundColor: theme.accent,
    paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden',
  },
  flavour: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 11.5, lineHeight: 16, color: theme.textDim, marginTop: 3 },
  effect: { fontFamily: fonts.serif, fontSize: 12.5, lineHeight: 18, color: theme.ink, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  price: { fontFamily: fonts.mono, fontSize: 14, fontWeight: '700', color: theme.ink },
  priceShort: { color: theme.disabledText },
  action: { minWidth: 104 },
});
