import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { PaperButton, Rule, SectionLabel } from './Print';
import { fonts, theme } from '../theme';
import { ELEMENTS, EVOLUTION_CHAIN, HEAL_AMOUNT, LIGANDS } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';
import type { Game } from '@/game/engine';
import type { HutItem } from '@/game/types';

function Row({ game, item, title, desc, onBuy }: { game: Game; item: HutItem; title: string; desc: string; onBuy: () => void }) {
  const can = game.canBuy(item);
  const price = game.hutPrice(item);
  const base = game.basePrice(item);
  const discounted = price !== null && base !== null && price < base;
  return (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemTitle, !can && { color: theme.textDim }]}>{title}</Text>
        <Text style={styles.itemDesc}>{desc}</Text>
      </View>
      {discounted && <Text style={styles.wasPrice}>{base} 🔆</Text>}
      <PaperButton label={price === null ? '—' : `${price} 🔆`} variant="highlight" disabled={!can} onPress={onBuy} style={styles.buy} />
    </View>
  );
}

export function HutModal({ game }: { game: Game }) {
  const { buy, leaveHut } = useGameStore();
  const next = EVOLUTION_CHAIN[game.currentElement];
  return (
    <Modal visible={game.atHut && !game.gameOver} transparent animationType="slide" onRequestClose={leaveHut}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <SectionLabel>Appendix A · Price list</SectionLabel>
          <Text style={styles.title}>⚗️ Isotope hut</Text>
          <Rule double style={{ marginTop: 4, marginBottom: 8 }} />
          <Text style={styles.sub}>You hold {game.photons} photons · {game.stageKills} kills on this grid.</Text>
          {game.hutDiscount > 0 && (
            <Text style={styles.discount}>
              ⬢ {LIGANDS.fractional.name}: everything is {game.hutDiscount} photon cheaper on this grid's first visit.
            </Text>
          )}

          <Row game={game} item="evolve" onBuy={() => buy('evolve')}
               title={next ? `Evolve → ${ELEMENTS[next].symbol}` : 'Evolve'}
               desc={next ? (game.isNoble ? 'Noble gases evolve at a flat price.' : 'Full health. Price drops by 1 for every kill on this grid.') : 'Neon is the final form.'} />
          <Row game={game} item="heal" onBuy={() => buy('heal')}
               title={`Heal +${HEAL_AMOUNT}`} desc={`Health ${game.elementHealth}/${game.maxHealth}.`} />
          <Row game={game} item="healthCatalyst" onBuy={() => buy('healthCatalyst')}
               title="Health catalyst" desc={`+2 max health for the rest of the run (now ${game.maxHealth}).`} />
          <Row game={game} item="damageCatalyst" onBuy={() => buy('damageCatalyst')}
               title="Damage catalyst" desc={`+1 ability and ram damage for the rest of the run (now +${game.damageBonus}).`} />

          <PaperButton label="Leave hut" variant="outline" onPress={leaveHut} style={{ marginTop: 10 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,36,48,0.45)', justifyContent: 'flex-end' },
  card: { backgroundColor: theme.paper, borderTopWidth: 1, borderColor: theme.ink, padding: 20, paddingBottom: 30 },
  title: { fontFamily: fonts.serif, fontSize: 22, fontWeight: '700', color: theme.ink, marginTop: 2 },
  sub: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 12, color: theme.textDim, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.rule },
  itemTitle: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: theme.ink },
  itemDesc: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 11, color: theme.textDim, marginTop: 2 },
  buy: { minWidth: 72, paddingVertical: 8 },
  wasPrice: { fontFamily: fonts.mono, fontSize: 11, color: theme.textDim, textDecorationLine: 'line-through' },
  discount: { fontFamily: fonts.serif, fontSize: 11.5, lineHeight: 16, color: theme.green, marginBottom: 8 },
});
