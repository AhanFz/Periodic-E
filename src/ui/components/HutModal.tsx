import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { PaperButton, Rule, SectionLabel } from './Print';
import { fonts, theme } from '../theme';
import { CATALYST_PRICE, ELEMENTS, EVOLUTION_CHAIN, HEAL_AMOUNT, HEAL_PRICE } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';
import type { Game } from '@/game/engine';
import type { HutItem } from '@/game/types';

function Row({ game, item, title, desc, price, onBuy }: { game: Game; item: HutItem; title: string; desc: string; price: number | null; onBuy: () => void }) {
  const can = game.canBuy(item);
  return (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemTitle, !can && { color: theme.textDim }]}>{title}</Text>
        <Text style={styles.itemDesc}>{desc}</Text>
      </View>
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

          <Row game={game} item="evolve" onBuy={() => buy('evolve')} price={game.evolvePrice}
               title={next ? `Evolve → ${ELEMENTS[next].symbol}` : 'Evolve'}
               desc={next ? (game.isNoble ? 'Noble gases evolve at a flat price.' : 'Full health. Price drops by 1 for every kill on this grid.') : 'Neon is the final form.'} />
          <Row game={game} item="heal" onBuy={() => buy('heal')} price={HEAL_PRICE}
               title={`Heal +${HEAL_AMOUNT}`} desc={`Health ${game.elementHealth}/${game.maxHealth}.`} />
          <Row game={game} item="healthCatalyst" onBuy={() => buy('healthCatalyst')} price={CATALYST_PRICE}
               title="Health catalyst" desc={`+2 max health for the rest of the run (now ${game.maxHealth}).`} />
          <Row game={game} item="damageCatalyst" onBuy={() => buy('damageCatalyst')} price={CATALYST_PRICE}
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
});
