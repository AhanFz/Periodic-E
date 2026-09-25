import type { AimTag, ElementDef, ElementKey, EnemyDef, EnemyType, FxType, LigandDef, LigandId } from './types';

export const ELEMENT_NAMES: Record<ElementKey, string> = {
  hydrogen: 'Hydrogen', helium: 'Helium', lithium: 'Lithium', beryllium: 'Beryllium', boron: 'Boron',
  carbon: 'Carbon', nitrogen: 'Nitrogen', oxygen: 'Oxygen', neon: 'Neon',
};
export const ATOMIC_NUMBER: Record<ElementKey, number> = {
  hydrogen: 1, helium: 2, lithium: 3, beryllium: 4, boron: 5, carbon: 6, nitrogen: 7, oxygen: 8, neon: 10,
};
/** Standard atomic weights, as printed — the display string is the single source for the numbers below. */
export const ATOMIC_MASS: Record<ElementKey, string> = {
  hydrogen: '1.008', helium: '4.003', lithium: '6.94', beryllium: '9.012', boron: '10.81',
  carbon: '12.011', nitrogen: '14.007', oxygen: '15.999', neon: '20.180',
};

/**
 * Health comes from atomic weight: a heavier nucleus is simply more matter to knock apart.
 * `AMU_PER_HEALTH` sets how much mass buys a point, `BASE_HEALTH` is the floor every atom starts from.
 * The curve is 4·5·6·7·7·8·8·9·10 from Hydrogen to Neon — it never drops as you evolve, so every
 * evolution is a visible upgrade. Change either constant and the whole table moves with it.
 *
 * The floor is 4 rather than 3 because ramming costs a point: at 3, Hydrogen could not afford the
 * two rams its kit is built around. In the simulator that one point takes Hydrogen from scoring a
 * kill in 21% of its games to 57%, without moving the overall win rate.
 */
export const BASE_HEALTH = 4;
export const AMU_PER_HEALTH = 3;
export function healthForMass(mass: number): number {
  return BASE_HEALTH + Math.floor(mass / AMU_PER_HEALTH);
}
export const ATOMIC_MASS_VALUE = Object.fromEntries(
  Object.entries(ATOMIC_MASS).map(([k, v]) => [k, parseFloat(v)])
) as Record<ElementKey, number>;
export const ELEMENT_HEALTH = Object.fromEntries(
  Object.entries(ATOMIC_MASS_VALUE).map(([k, m]) => [k, healthForMass(m)])
) as Record<ElementKey, number>;

export const ELEMENTS: Record<ElementKey, ElementDef> = {
  hydrogen: {
    symbol: 'H', health: ELEMENT_HEALTH.hydrogen, noble: false,
    ability1Short: 'Bond', ability1Name: 'Hydrogen Bond', ability1Desc: 'Tether an adjacent enemy for 3 turns. It trails into each tile you leave and cannot act.', ability1Cost: 1,
    ability2Short: 'Dash', ability2Name: 'Double Dash', ability2Desc: 'Dash 2 tiles in a line: 3 damage to every enemy you pass through, none to you. Uses your move too.', ability2Cost: 3,
  },
  helium: {
    symbol: 'He', health: ELEMENT_HEALTH.helium, noble: true,
    ability1Short: 'Freeze', ability1Name: 'Freeze', ability1Desc: 'Freeze enemies in the 4 cardinal tiles for 2 turns, cancelling prepared attacks.', ability1Cost: 1,
    ability2Short: 'Freeze+', ability2Name: 'Deep Freeze', ability2Desc: 'Freeze all 8 surrounding tiles for 3 rounds, cancelling prepared attacks. Enemies avoid frozen bodies.', ability2Cost: 3,
  },
  lithium: {
    symbol: 'Li', health: ELEMENT_HEALTH.lithium, noble: false,
    ability1Short: 'Battery', ability1Name: 'Battery', ability1Desc: 'Charge for 3 turns, this one included. Take no damage in that time and it discharges for 4 photons. Take a hit and it shorts out.', ability1Cost: 1,
    ability2Short: 'Ion Beam', ability2Name: 'Ion Beam', ability2Desc: 'Aim: 2 damage and paralysis to everything in that direction, straight across voids, all the way to the far edge. Bromine resists.', ability2Cost: 3,
  },
  beryllium: {
    symbol: 'Be', health: ELEMENT_HEALTH.beryllium, noble: false,
    ability1Short: 'Shield', ability1Name: 'Shield', ability1Desc: 'Raise shield to at least 2. While any shield holds, ramming costs you no health; the shield only absorbs incoming hits.', ability1Cost: 1,
    ability2Short: 'Shield+', ability2Name: 'Inert Shield', ability2Desc: 'Raise shield to at least 3. Free ramming while it holds, and poison cannot touch you.', ability2Cost: 3,
  },
  boron: {
    symbol: 'B', health: ELEMENT_HEALTH.boron, noble: false,
    ability1Short: 'Trap', ability1Name: 'Dopant Trap', ability1Desc: 'Electric trap on your current tile (max 2). Burns the next enemy to step on it for 1 and paralyzes it.', ability1Cost: 1,
    ability2Short: 'Encase', ability2Name: 'Encase', ability2Desc: 'Seal an adjacent enemy in glass (max 2). Shatter is free; auto-bursts after 3 turns.', ability2Cost: 3,
  },
  carbon: {
    symbol: 'C', health: ELEMENT_HEALTH.carbon, noble: false,
    ability1Short: 'Sheet', ability1Name: 'Graphene Sheet', ability1Desc: 'C-shaped bridge off an edge or over void. Collapses in 3 turns, killing enemies on it.', ability1Cost: 1,
    ability2Short: 'Spear', ability2Name: 'Diamond Spear', ability2Desc: 'Forge a piercing spear: 3 dmg per hit, range 4, 4 durability, each hit costs 2. Forge and throw in one turn. Throwing costs no photons and spends the ability action; pick it up to reuse.', ability2Cost: 3,
  },
  nitrogen: {
    symbol: 'N', health: ELEMENT_HEALTH.nitrogen, noble: false,
    ability1Short: 'Blast', ability1Name: 'Blast', ability1Desc: 'Aim: 3 damage and scorch the 2 tiles that way. You walk on scorch.', ability1Cost: 1,
    ability2Short: 'Blast 4', ability2Name: 'Blast 4', ability2Desc: '3 damage and scorch on all 4 adjacent tiles.', ability2Cost: 3,
  },
  oxygen: {
    symbol: 'O', health: ELEMENT_HEALTH.oxygen, noble: false,
    ability1Short: 'Heal', ability1Name: 'Heal', ability1Desc: 'Restore 1 health.', ability1Cost: 1,
    ability2Short: 'Ozone', ability2Name: 'Ozone Layer', ability2Desc: '3 damage to all 8 neighbours now; 2 damage in a star two tiles out next round.', ability2Cost: 3,
  },
  neon: {
    symbol: 'Ne', health: ELEMENT_HEALTH.neon, noble: true,
    ability1Short: 'Flash', ability1Name: 'Blinding Flash', ability1Desc: 'Enemies in the 8 surrounding tiles flee for 2 rounds. Breaks bonds.', ability1Cost: 1,
    ability2Short: 'Flash+', ability2Name: 'All-Out Flash', ability2Desc: 'Every enemy on the grid takes 1 damage and freezes for a round.', ability2Cost: 3,
  },
};

export const ELEMENT_ORDER: ElementKey[] = [
  'hydrogen', 'helium', 'lithium', 'beryllium', 'boron', 'carbon', 'nitrogen', 'oxygen', 'neon',
];

export const EVOLUTION_CHAIN: Record<ElementKey, ElementKey | null> = {
  hydrogen: 'helium', helium: 'lithium', lithium: 'beryllium', beryllium: 'boron',
  boron: 'carbon', carbon: 'nitrogen', nitrogen: 'oxygen', oxygen: 'neon', neon: null,
};

/** Hut price to evolve before any kill discount. Nobles pay a flat low price. */
export const EVOLVE_BASE_PRICE: Record<ElementKey, number> = {
  hydrogen: 3, helium: 2, lithium: 5, beryllium: 5, boron: 5, carbon: 6, nitrogen: 6, oxygen: 6, neon: 0,
};
export const EVOLVE_MIN_PRICE = 1;
export const HEAL_PRICE = 2;
export const HEAL_AMOUNT = 2;
export const CATALYST_PRICE = 3;
export const CATALYST_LIMIT = 3;

export const VALENCE: Record<ElementKey, number> = {
  hydrogen: 1, helium: 2, lithium: 1, beryllium: 2, boron: 3, carbon: 4, nitrogen: 5, oxygen: 6, neon: 8,
};
export const HALOGEN_VALENCE = 7;

export const ENEMY_NAMES: Record<EnemyType, string> = { fluorine: 'Fluorine', chlorine: 'Chlorine', bromine: 'Bromine', iodine: 'Iodine' };
export const ENEMY_ATOMIC_NUMBER: Record<EnemyType, number> = { fluorine: 9, chlorine: 17, bromine: 35, iodine: 53 };
export const ENEMY_ATOMIC_MASS: Record<EnemyType, string> = { fluorine: '18.998', chlorine: '35.45', bromine: '79.904', iodine: '126.904' };

export const ELEMENT_COLORS: Record<ElementKey, string> = {
  hydrogen: '#B3E5FC', helium: '#4FC3F7', lithium: '#FFD54F', beryllium: '#66BB6A',
  boron: '#FFA726', carbon: '#424242', nitrogen: '#AB47BC', oxygen: '#26A69A', neon: '#EF5350',
};
export const ENEMY_COLORS: Record<EnemyType, string> = {
  fluorine: '#EF5350', chlorine: '#66BB6A', bromine: '#8D6E63', iodine: '#AB47BC',
};

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  fluorine: {
    symbol: 'F', health: 2,
    desc: 'Arms near you, explodes on its next active turn. Paralysis/tether pause the fuse; freeze cancels it. No credit for its own detonation.',
    tell: '💣 on its tile, and the blast tiles glow orange.',
    counter: 'Ram it the turn it arms — a ram defuses it and 2 damage is enough to finish it.',
  },
  chlorine: {
    symbol: 'Cl', health: 3,
    desc: 'Channels, then poisons. Shape rotates: diagonals, cardinals, then a line at you.',
    tell: '⚠️ and a thin haze mark next turn\'s cloud. A tile churning with purple gas is poison now.',
    counter: 'Step off the marked tiles, or kill it while it channels — it cannot move that turn.',
  },
  bromine: {
    symbol: 'Br', health: 3,
    desc: 'Liquid. Resists electricity. Any contact, including your rams, locks your abilities for a round.',
    tell: 'Molecules leave a 🧪 trail lasting 2 turns that burns and locks on contact.',
    counter: 'Kill it at range. If you must ram, do it on a turn you did not want an ability.',
  },
  iodine: {
    symbol: 'I', health: 4,
    desc: 'Vanishes for a round, paying 1 health each time. Stops at 1 health.',
    tell: '❓ marks the tile it vanished from; it keeps moving while unseen.',
    counter: 'Let it bleed itself out, or hit the tiles beyond the ❓ where it is heading.',
  },
};

/**
 * Ligands are bought and equipped in the menu, with quanta, and last the whole run. Exactly one
 * slot: the single slot is load-bearing for balance, because it stops these from combining.
 */
export const LIGANDS: Record<LigandId, LigandDef> = {
  passivation: {
    name: 'Passivation Layer',
    flavour: 'Aluminium and chromium grow a protective oxide skin the moment they are attacked.',
    description: 'The first time on each grid that damage drops you to 2 health or less, gain 2 shield.',
    price: 40,
  },
  supercooled: {
    name: 'Supercooled Core',
    flavour: 'Flash-freezing halts a runaway reaction before it can finish.',
    description: 'Once per run, a killing blow leaves you at 1 health instead and freezes every neighbour for 2 turns. It cannot save you from destabilising.',
    price: 60,
  },
  fractional: {
    name: 'Fractional Distillation',
    flavour: 'Separating a mixture by boiling point is cheaper than separating it by force.',
    description: 'One purchase during your first hut visit each grid costs 1 photon less. Minimum price 1, including evolution.',
    price: 50,
  },
  exothermic: {
    name: 'Exothermic Edge',
    flavour: 'Some reactions release energy as they proceed.',
    description: 'While your health is down to a third of its maximum or less, your rams deal 3 damage instead of 2. You still take 1.',
    price: 45,
  },
};
export const LIGAND_ORDER: LigandId[] = ['passivation', 'supercooled', 'fractional', 'exothermic'];
/** Quanta are the cross-run currency. The glyph never collides with the photon's. */
export const QUANTA_GLYPH = '⬢';
export const QUANTA_PER_WIN = 50;
/** Passivation Layer grants this much shield, once per grid. */
export const PASSIVATION_SHIELD = 2;
/** The health at or below which Passivation Layer triggers, on entering that state. */
export const PASSIVATION_THRESHOLD = 2;
/** Supercooled Core freezes every neighbour for this many turns as it saves you. */
export const SUPERCOOLED_FREEZE_TURNS = 2;
/** Fractional Distillation takes this much off one purchase during a grid's first hut visit. */
export const HUT_DISCOUNT = 1;
/** Exothermic Edge replaces the ram's base damage while you are hurt badly enough. */
export const EXOTHERMIC_RAM_DAMAGE = 3;
/**
 * How deep the wound has to be. Max health over 3, rounded up: for an 8-health Carbon that is 3
 * rather than the 4 a halving would give, so the window costs you one more ram to reach and sits
 * genuinely close to death. At a half it was the strongest ligand by a wide margin.
 */
export const EXOTHERMIC_HEALTH_DIVISOR = 3;

export const PHOTON_CAP = 5;
export const START_PHOTONS = 2;
export const INITIAL_ENEMIES = 2;
export const MAX_DOPANT_TRAPS = 2;
export const MAX_ENCASED = 2;
export const ENCASE_TURNS = 3;
export const SHEET_TURNS = 3;
/** Ramming: walking into an enemy. Fixed numbers so every element can afford it. */
export const RAM_DAMAGE = 2;
export const RAM_COST = 1;
export const TETHER_TURNS = 3;
export const DASH_DAMAGE = 3;
export const SPEAR_HEALTH = 4;
export const SPEAR_DAMAGE = 3;
export const SPEAR_HIT_COST = 2;
export const SPEAR_RANGE = 4;
/** Lithium's Ion Beam: everything in the line takes this and is paralyzed. Bromine resists down to 1. */
export const ION_BEAM_DAMAGE = 2;
/**
 * Lithium's Battery. It costs 1 photon and pays `BATTERY_PAYOUT` if the charge survives
 * `BATTERY_TURNS` untouched, so a clean charge nets 2 photons for a stretch of kiting.
 * Any health lost shorts it out with no refund.
 *
 * The count is in turn-ends, and the turn you start it in is the first of them: charging is an
 * ability, so on a turn you have already moved it ends the turn at once, and counting that as a
 * full turn of charge made the cell pay out almost immediately.
 */
export const BATTERY_TURNS = 3;
export const BATTERY_PAYOUT = 4;
/** A dopant trap paralyzes and burns whatever steps on it. */
export const DOPANT_TRAP_DAMAGE = 1;
export const OZONE_NEAR_DAMAGE = 3;
export const OZONE_FAR_DAMAGE = 2;
export const FLEE_ROUNDS = 2;
export const MAX_ENEMIES = 6;
export const POLARITY_CYCLE = 4;
export const POLARITY_FROM_DEPTH = 3;
/** Chance a grid past the first polarity grid has polarity; never on two grids in a row. */
export const POLARITY_CHANCE = 0.5;

export const FX_ICONS: Record<FxType, string> = {
  explosion: '💥', shatter: '🧊', shock: '⚡', frost: '❄️', gust: '💨', evolve: '🧬',
  shield: '🛡️', corrode: '🧪', encase: '🪟', collapse: '🕳️', ozone: '🌊', heal: '💚',
  flash: '✨', vapor: '💜', smoke: '☁️', spear: '💠', bond: '🔗', crush: '💢', photon: '🔆', tether: '🪢',
};
export const FX_COLORS: Record<FxType, string> = {
  explosion: '#FF6B35', shatter: '#4FC3F7', shock: '#FFD54F', frost: '#81D4FA', gust: '#CFD8DC',
  evolve: '#66BB6A', shield: '#2ECC71', corrode: '#8D6E63', encase: '#4FC3F7', collapse: '#616161',
  ozone: '#26C6DA', heal: '#66BB6A', flash: '#FFF176', vapor: '#9C27B0', smoke: '#8E44AD',
  spear: '#B2EBF2', bond: '#FF8A80', crush: '#FF7043', photon: '#FFE082', tether: '#81D4FA',
};

export const AIM_ACTION_WORDS: Record<AimTag, string> = {
  h_bond: 'Tether', h_dash: 'Dash', li_beam: 'Fire',
  b_encase: 'Encase', c_sheet: 'Place', c_throw: 'Throw', n_blast2: 'Blast',
};
export const AIM_TITLES: Record<AimTag, string> = {
  h_bond: '🪢 Hydrogen Bond', h_dash: '💨 Double Dash', li_beam: '⚡ Ion Beam',
  b_encase: '🪟 Encase', c_sheet: '🕸️ Graphene Sheet', c_throw: '💠 Throw Spear', n_blast2: '💥 Blast',
};

/** Spawn pressure follows the element, so lingering as Hydrogen stays manageable. */
export const ENEMY_PRESSURE: Record<ElementKey, { initial: number; floor: number; cap: number; interval: number }> = {
  hydrogen: { initial: 1, floor: 1, cap: 2, interval: 6 },
  helium: { initial: 2, floor: 2, cap: 3, interval: 5 },
  lithium: { initial: 2, floor: 2, cap: 4, interval: 4 },
  beryllium: { initial: 2, floor: 3, cap: 4, interval: 4 },
  boron: { initial: 2, floor: 3, cap: 5, interval: 4 },
  carbon: { initial: 2, floor: 3, cap: 5, interval: 4 },
  nitrogen: { initial: 2, floor: 4, cap: 6, interval: 4 },
  oxygen: { initial: 2, floor: 4, cap: 6, interval: 4 },
  neon: { initial: 2, floor: 4, cap: 6, interval: 4 },
};
