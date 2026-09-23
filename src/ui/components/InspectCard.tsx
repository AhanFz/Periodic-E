import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Atom } from './Atom';
import { PaperButton, Rule, SectionLabel } from './Print';
import { fonts, theme } from '../theme';
import {
  ATOMIC_MASS, ATOMIC_NUMBER, ELEMENT_COLORS, ELEMENT_NAMES, ENEMIES, ENEMY_ATOMIC_MASS,
  ENEMY_ATOMIC_NUMBER, ENEMY_COLORS, ENEMY_NAMES, HALOGEN_VALENCE, VALENCE,
} from '@/game/constants';
import { useGameStore } from '@/store/gameStore';
import type { Game } from '@/game/engine';
import type { Enemy } from '@/game/types';

/** One labelled reading in the card's data strip. */
function Reading({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reading}>
      <Text style={styles.readingLabel}>{label}</Text>
      <Text style={styles.readingValue}>{value}</Text>
    </View>
  );
}

function Para({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Text style={styles.para}>
      <Text style={styles.paraLabel}>{label} </Text>{children}
    </Text>
  );
}

/** Live conditions on a halogen, in the order the player should care about them. */
function enemyStatus(e: Enemy): string[] {
  const out: string[] = [];
  if (e.encasedTurnsLeft > 0) out.push(`🪟 Encased — bursts in ${e.encasedTurnsLeft}`);
  if (e.frozenTurnsLeft > 0) out.push(`❄️ Frozen for ${e.frozenTurnsLeft} — ram it to shatter it for free`);
  if (e.tetherTurnsLeft > 0) out.push(`🪢 Tethered for ${e.tetherTurnsLeft} — it cannot act`);
  if (e.paralyzed) out.push('⚡ Paralyzed for this round — ramming costs you no health; normal damage applies');
  if (e.armed) out.push('💣 Armed — it detonates at the end of your turn');
  if (e.telegraph) out.push('⚠️ Channelling — the marked tiles bloom next turn');
  if (e.bondingWith !== null) out.push('🔗 Bonding — separate them or it doubles');
  if (e.fleeTurnsLeft > 0) out.push(`😵 Blinded, fleeing for ${e.fleeTurnsLeft}`);
  if (e.invisibleTurnsLeft > 0) out.push('❓ Vanished — it is still moving');
  if (e.suppressedTurns > 0) out.push('⚡ Corrosion dulled for a turn');
  return out;
}

export function InspectCard({ game }: { game: Game }) {
  const { inspecting, closeInspect } = useGameStore();

  const enemy = inspecting?.kind === 'enemy' ? game.enemies.find(e => e.id === inspecting.id) : undefined;
  // The card is opened on your own turn, so the board cannot move under it — but an enemy can
  // still be gone if the game ended, and then there is nothing to show.
  const visible = !!inspecting && (inspecting.kind === 'player' || !!enemy) && !game.gameOver;

  let body: React.ReactNode = null;
  if (inspecting?.kind === 'player') {
    const el = game.currentElement;
    const d = game.elementData;
    body = (
      <>
        <View style={styles.head}>
          <Atom
            atom={{
              symbol: d.symbol, color: ELEMENT_COLORS[el], electrons: VALENCE[el], isHalogen: false,
              healthPct: game.elementHealth / game.maxHealth, shielded: game.shieldPoints > 0,
            }}
            size={54}
            showHealth={false}
          />
          <View style={styles.headText}>
            <Text style={styles.name}>{ELEMENT_NAMES[el]}</Text>
            <Text style={styles.sub}>You · {d.noble ? 'noble gas' : 'reactive'} · {VALENCE[el]} valence electrons</Text>
          </View>
        </View>
        <View style={styles.strip}>
          <Reading label="Z" value={`${ATOMIC_NUMBER[el]}`} />
          <Reading label="Mass" value={`${ATOMIC_MASS[el]} u`} />
          <Reading label="Health" value={`${game.elementHealth}/${game.maxHealth}`} />
          <Reading label="Shield" value={game.shieldPoints > 0 ? `${game.shieldPoints}` : '–'} />
          <Reading label="Photons" value={`${game.photons}`} />
        </View>
        <Rule style={{ marginVertical: 10 }} />
        <Para label={`1. ${d.ability1Name} [${d.ability1Cost} 🔆]`}>{d.ability1Desc}</Para>
        <Para label={`2. ${d.ability2Name} [${d.ability2Cost} 🔆]`}>{d.ability2Desc}</Para>
        <Para label="Ram">
          Walk into a halogen for {game.ramDamage + game.damageBonus} damage, normally taking 1 yourself. Paralyzed targets cost no self-damage but take normal ram damage. Frozen bodies shatter for free.
          {game.exothermicActive ? ' Exothermic Edge is live while you are this hurt.' : ''}
        </Para>
        {game.batteryTurnsLeft > 0 && (
          <Para label="🔋 Charging">
            {`${game.batteryTurnsLeft} turn${game.batteryTurnsLeft === 1 ? '' : 's'} left. Avoid damage and the cell discharges into photons; one hit and it shorts out.`}
          </Para>
        )}
        <Para label="Mass">
          {`Max health is set by atomic weight: ${ATOMIC_MASS[el]} u gives ${game.maxHealth - game.maxHealthBonus} points`}
          {game.maxHealthBonus > 0 ? `, plus ${game.maxHealthBonus} from catalysts` : ''}. Heavier elements carry more.
        </Para>
      </>
    );
  } else if (enemy) {
    const def = ENEMIES[enemy.type];
    const status = enemyStatus(enemy);
    const sym = def.symbol + (enemy.bonded ? '₂' : '');
    body = (
      <>
        <View style={styles.head}>
          <Atom
            atom={{
              symbol: sym, color: ENEMY_COLORS[enemy.type], electrons: HALOGEN_VALENCE, isHalogen: true,
              healthPct: enemy.health / enemy.maxHealth, frozen: enemy.frozenTurnsLeft > 0,
              encased: enemy.encasedTurnsLeft > 0, bonded: enemy.bonded,
            }}
            size={54}
            showHealth={false}
          />
          <View style={styles.headText}>
            <Text style={styles.name}>{ENEMY_NAMES[enemy.type]}{enemy.bonded ? ' molecule' : ''}</Text>
            <Text style={styles.sub}>Halogen · group 17 · 7 valence electrons</Text>
          </View>
        </View>
        <View style={styles.strip}>
          <Reading label="Z" value={`${ENEMY_ATOMIC_NUMBER[enemy.type]}`} />
          <Reading label="Mass" value={`${ENEMY_ATOMIC_MASS[enemy.type]} u`} />
          <Reading label="Health" value={`${enemy.health}/${enemy.maxHealth}`} />
          <Reading label="Rams to kill" value={`${Math.ceil(enemy.health / (game.ramDamage + game.damageBonus))}`} />
          <Reading label="Pays" value={`${enemy.bonded ? 2 : 1} 🔆`} />
        </View>
        <Rule style={{ marginVertical: 10 }} />
        <Para label="Behaviour">{def.desc}</Para>
        <Para label="Tell">{def.tell}</Para>
        <Para label="Counter">{def.counter}</Para>
        {enemy.bonded && (
          <Para label="Bonded">
            Two of them fused: double health, double payout, and a wider version of its attack. Neon's flash splits it again.
          </Para>
        )}
        {status.length > 0 && (
          <View style={styles.statusBox}>
            <SectionLabel>Right now</SectionLabel>
            {status.map(line => <Text key={line} style={styles.statusLine}>{line}</Text>)}
          </View>
        )}
      </>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeInspect}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <SectionLabel>Margin note · specimen</SectionLabel>
          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
            {body}
          </ScrollView>
          <PaperButton label="Close" variant="outline" onPress={closeInspect} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,36,48,0.45)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: {
    backgroundColor: theme.paper, borderWidth: 1, borderLeftWidth: 4, borderColor: theme.ink,
    borderLeftColor: theme.accent, padding: 18, width: '100%', maxWidth: 400, maxHeight: '86%',
  },
  scroll: { flexGrow: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6, marginBottom: 10 },
  headText: { flex: 1 },
  name: { fontFamily: fonts.serif, fontSize: 21, fontWeight: '700', color: theme.ink },
  sub: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 12, color: theme.textDim, marginTop: 1 },
  strip: { flexDirection: 'row', borderTopWidth: 2, borderBottomWidth: 1, borderColor: theme.ink, backgroundColor: theme.panel },
  reading: { flex: 1, paddingVertical: 6, alignItems: 'center' },
  readingLabel: { fontFamily: fonts.serif, fontSize: 8, letterSpacing: 0.9, textTransform: 'uppercase', color: theme.textDim },
  readingValue: { fontFamily: fonts.mono, fontSize: 12, fontWeight: '700', color: theme.ink, marginTop: 2 },
  para: { fontFamily: fonts.serif, fontSize: 12.5, lineHeight: 18, color: theme.ink, marginBottom: 7 },
  paraLabel: { fontWeight: '700' },
  statusBox: { backgroundColor: theme.panel, borderLeftWidth: 3, borderLeftColor: theme.gold, padding: 9, marginTop: 4, gap: 3 },
  statusLine: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, color: theme.ink },
});
